import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import axios from "axios";
import { RedisService } from "../common/redis.service";

const MIN_SURAH = 1;
const MAX_SURAH = 114;

const CACHE_KEY_RECITERS = "sakinah:reciters";
const CACHE_KEY_SURAHS = "sakinah:surahs";
const CACHE_TTL_RECITERS = 86400; // 24 hours — reciters rarely change
const CACHE_TTL_SURAHS = 86400; // 24 hours — surahs are static data
const CACHE_TTL_AUDIO = 3600; // 1 hour

interface Reciter {
  id: number;
  name: string;
  arabicName: string;
  style: string;
}

interface AudioUrl {
  url: string;
}

interface Surah {
  number: number;
  name: string;
  englishName: string;
  versesCount: number;
}

const FALLBACK_RECITERS: Reciter[] = [
  { id: 7, name: "Mishary Rashid Alafasy", arabicName: "مشاري راشد العفاسي", style: "Murattal" },
  { id: 1, name: "Abdul Basit", arabicName: "عبد الباسط عبد الصمد", style: "Murattal" },
  { id: 3, name: "Abdurrahmaan As-Sudais", arabicName: "عبد الرحمن السديس", style: "Murattal" },
];

@Injectable()
export class SakinahService {
  private readonly logger = new Logger(SakinahService.name);
  private readonly quranAudioBaseUrl = "https://api.quran.com/api/v4";

  constructor(private readonly redisService: RedisService) {}

  /**
   * Generic cache-aside helper. Checks Redis first, falls back to fetcher,
   * then caches the result. Gracefully degrades when Redis is unavailable.
   */
  private async withCache<T>(
    cacheKey: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    // Try Redis cache
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit: ${cacheKey}`);
        return JSON.parse(cached) as T;
      }
    } catch {
      // Redis error — proceed to fetcher
    }

    // Fetch fresh data
    const data = await fetcher();

    // Cache in Redis (fire-and-forget — don't block on failure)
    this.redisService.set(cacheKey, JSON.stringify(data), ttlSeconds).catch(() => {
      // Silent — RedisService already logs warnings
    });

    return data;
  }

  /**
   * Get list of reciters from Quran Foundation Audio API.
   * Cached in Redis for 24 hours.
   */
  async getReciters(): Promise<Reciter[]> {
    return this.withCache(CACHE_KEY_RECITERS, CACHE_TTL_RECITERS, async () => {
      try {
        const response = await axios.get(`${this.quranAudioBaseUrl}/resources/recitations`, {
          params: { language: "en" },
          timeout: 10000,
        });

        const data = response.data?.recitations || response.data || [];
        return data.slice(0, 20).map((r: Record<string, unknown>) => ({
          id: r.id as number,
          name: (r.reciter_name as string) || (r.name as string) || "Unknown",
          arabicName: "",
          style: (r.style as string) || "",
        }));
      } catch (error) {
        this.logger.error("Failed to fetch reciters", error);
        return FALLBACK_RECITERS;
      }
    });
  }

  /**
   * Get audio URL for a specific reciter + surah.
   * Cached in Redis for 1 hour.
   */
  async getAudioUrl(reciterId: number, surahNumber: number): Promise<AudioUrl> {
    if (surahNumber < MIN_SURAH || surahNumber > MAX_SURAH) {
      throw new BadRequestException(
        `Invalid surah number: ${surahNumber}. Must be between ${MIN_SURAH} and ${MAX_SURAH}.`,
      );
    }
    if (reciterId <= 0) {
      throw new BadRequestException(`Invalid reciter ID: ${reciterId}. Must be a positive number.`);
    }

    const cacheKey = `sakinah:audio:${reciterId}:${surahNumber}`;

    return this.withCache(cacheKey, CACHE_TTL_AUDIO, async () => {
      const paddedSurah = String(surahNumber).padStart(3, "0");
      const url = `https://cdn.islamic.network/quran/audio/128/${reciterId}/${paddedSurah}.mp3`;
      return { url } as AudioUrl;
    });
  }

  /**
   * Get list of all 114 surahs.
   * Cached in Redis for 24 hours — surahs are static data.
   */
  async getSurahs(): Promise<Surah[]> {
    return this.withCache(CACHE_KEY_SURAHS, CACHE_TTL_SURAHS, async () => {
      try {
        const response = await axios.get(`${this.quranAudioBaseUrl}/chapters`, {
          params: { language: "en" },
          timeout: 10000,
        });

        return (response.data?.chapters || []).map(
          (s: Record<string, unknown>) => ({
            number: s.id as number,
            name: s.name_arabic as string,
            englishName: s.name_simple as string,
            versesCount: s.verses_count as number,
          }),
        );
      } catch (error) {
        this.logger.error("Failed to fetch surahs", error);
        // Return minimal fallback
        return Array.from({ length: 114 }, (_, i) => ({
          number: i + 1,
          name: "",
          englishName: `Surah ${i + 1}`,
          versesCount: 0,
        }));
      }
    });
  }
}