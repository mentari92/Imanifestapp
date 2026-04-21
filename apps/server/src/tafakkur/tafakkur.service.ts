import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { QuranApiService } from "../common/quran-api.service";
import { RedisService } from "../common/redis.service";

interface SurahInfo {
  number: number;
  name: string;
  englishName: string;
  versesCount: number;
}

interface ReciterInfo {
  id: number;
  identifier: string;
  name: string;
  englishName: string;
  style: string;
  subtitle: string;
  isAvailable: boolean;
}

interface VerseAudioResult {
  url: string;
  reciterIdUsed: number;
  fallbackUsed: boolean;
}

interface FoundationHealthSummary {
  healthy: boolean;
  configured: {
    clientId: boolean;
    authToken: boolean;
    contentApiUrl: string;
    audioBaseUrl: string;
  };
  recitationsCount: number;
  sampleReciters: string[];
  checkedAt: string;
  error?: string;
}

@Injectable()
export class TafakkurService {
  private readonly logger = new Logger(TafakkurService.name);

  private readonly reciterSubtitleHints: Record<string, string> = {
    "mishary rashid alafasy": "Kuwait · Murattal",
    "abdurrahman as sudais": "Makkah Imam",
    "maher al muaiqly": "Madinah Imam",
    "abdulbaset abdulsamad": "Egypt · Mujawwad",
    "mohamed siddiq al minshawi": "Egypt · Murattal",
    "saud ash shuraym": "Makkah Imam",
    "abu bakr al shatri": "Saudi · Murattal",
    "hani ar rifai": "Saudi · Murattal",
  };

  private readonly reciterPriorityKeywords = [
    "mishary",
    "sudais",
    "maher",
    "abdulbaset",
    "minshawi",
    "shuraym",
    "shatri",
    "rifai",
  ];

  constructor(
    private readonly quranApiService: QuranApiService,
    private readonly redis: RedisService,
  ) {}

  async getSurahs(): Promise<SurahInfo[]> {
    const surahs = await this.quranApiService.getSurahs();
    if (surahs && surahs.length > 0) {
      return surahs.map((s) => ({
        number: s.number,
        name: s.name,
        englishName: s.englishName,
        versesCount: s.numberOfAyahs,
      }));
    }

    this.logger.warn("Using fallback surah list");
    return this.getFallbackSurahs();
  }

  async getReciters(): Promise<ReciterInfo[]> {
    const cacheKey = "tafakkur:reciters:v2";

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as ReciterInfo[];
      }
    } catch {
      // non-critical cache read failure
    }

    const recitations = await this.quranApiService.getFoundationRecitations();

    if (recitations.length === 0) {
      return [];
    }

    const mapped = recitations.map((r) => {
      const englishName = this.cleanName(r.reciter_name);
      const subtitleHint = this.reciterSubtitleHints[this.normalizeName(englishName)];
      const style = r.style || "Murattal";

      return {
        id: r.id,
        identifier: `qf:${r.id}`,
        name: englishName,
        englishName,
        style,
        subtitle: subtitleHint || `Recitation · ${style}`,
        isAvailable: true,
      } satisfies ReciterInfo;
    });

    const prioritized = this.sortByPriority(mapped);

    try {
      await this.redis.set(cacheKey, JSON.stringify(prioritized), 21600);
    } catch {
      // non-critical cache write failure
    }

    return prioritized;
  }

  async getPopularReciters(): Promise<ReciterInfo[]> {
    const reciters = await this.getReciters();
    return reciters.slice(0, 10);
  }

  async getFoundationHealth(): Promise<FoundationHealthSummary> {
    return this.quranApiService.getFoundationHealth();
  }

  async getAudioUrl(
    reciterIdentifierOrId: string | number,
    surahNumber: number,
  ): Promise<{ url: string; reciterIdUsed: number; fallbackUsed: boolean }> {
    if (surahNumber < 1 || surahNumber > 114) {
      throw new BadRequestException("Invalid surah number");
    }

    const reciterId = this.toReciterId(reciterIdentifierOrId);
    if (reciterId <= 0) {
      throw new BadRequestException("Invalid reciter ID");
    }

    const ayahKey = `${surahNumber}:1`;
    return this.getVerseAudioUrl(reciterId, ayahKey);
  }

  async getVerseAudioUrl(
    reciterId: number,
    ayahKey: string,
  ): Promise<VerseAudioResult> {
    if (reciterId <= 0) {
      throw new BadRequestException("Invalid reciter ID");
    }

    if (!/^\d+:\d+$/.test(ayahKey)) {
      throw new BadRequestException("Invalid ayah key");
    }

    const cacheKey = `tafakkur:verse-audio:${reciterId}:${ayahKey}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as VerseAudioResult;
        const normalized = this.normalizeCachedAudioUrl(parsed);

        if (normalized.url !== parsed.url) {
          try {
            await this.redis.set(cacheKey, JSON.stringify(normalized), 3600);
          } catch {
            // non-critical cache write failure
          }
        }

        return normalized;
      }
    } catch {
      // non-critical cache read failure
    }

    const primary = await this.quranApiService.getFoundationAyahAudioUrl(reciterId, ayahKey);
    if (primary) {
      const result: VerseAudioResult = {
        url: primary,
        reciterIdUsed: reciterId,
        fallbackUsed: false,
      };
      try {
        await this.redis.set(cacheKey, JSON.stringify(result), 3600);
      } catch {
        // non-critical cache write failure
      }
      return result;
    }

    const reciters = await this.getReciters();
    const fallbackCandidates = reciters
      .filter((r) => r.id !== reciterId)
      .slice(0, 4);

    for (const fallback of fallbackCandidates) {
      const fallbackUrl = await this.quranApiService.getFoundationAyahAudioUrl(
        fallback.id,
        ayahKey,
      );
      if (!fallbackUrl) {
        continue;
      }

      const result: VerseAudioResult = {
        url: fallbackUrl,
        reciterIdUsed: fallback.id,
        fallbackUsed: true,
      };

      try {
        await this.redis.set(cacheKey, JSON.stringify(result), 1800);
      } catch {
        // non-critical cache write failure
      }

      return result;
    }

    throw new BadRequestException("Audio unavailable for selected reciter");
  }

  private sortByPriority(reciters: ReciterInfo[]): ReciterInfo[] {
    return [...reciters].sort((a, b) => {
      const aRank = this.getPriorityRank(a.name);
      const bRank = this.getPriorityRank(b.name);
      if (aRank !== bRank) {
        return aRank - bRank;
      }
      return a.name.localeCompare(b.name);
    });
  }

  private getPriorityRank(name: string): number {
    const normalized = this.normalizeName(name);
    const index = this.reciterPriorityKeywords.findIndex((k) => normalized.includes(k));
    return index === -1 ? 999 : index;
  }

  private toReciterId(reciterIdentifierOrId: string | number): number {
    if (typeof reciterIdentifierOrId === "number") {
      return reciterIdentifierOrId;
    }

    if (/^\d+$/.test(reciterIdentifierOrId)) {
      return parseInt(reciterIdentifierOrId, 10);
    }

    const taggedId = reciterIdentifierOrId.match(/^qf:(\d+)$/i);
    if (taggedId) {
      return parseInt(taggedId[1], 10);
    }

    return -1;
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  private cleanName(name: string): string {
    return name.replace(/\s+/g, " ").trim();
  }

  private getFallbackSurahs(): SurahInfo[] {
    return Array.from({ length: 114 }, (_, i) => ({
      number: i + 1,
      name: "",
      englishName: `Surah ${i + 1}`,
      versesCount: 0,
    }));
  }

  private normalizeCachedAudioUrl(result: VerseAudioResult): VerseAudioResult {
    const badPrefix = "https://audio.qurancdn.com//mirrors.quranicaudio.com";
    if (!result.url.startsWith(badPrefix)) {
      return result;
    }

    return {
      ...result,
      url: result.url.replace(badPrefix, "https://mirrors.quranicaudio.com"),
    };
  }
}
