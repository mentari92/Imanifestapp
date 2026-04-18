import { Injectable, Logger, Optional } from "@nestjs/common";
import axios from "axios";
import { RedisService } from "./redis.service";
import { QuranMcpService } from "./quran-mcp.service";

interface QuranSearchResult {
  verse_key: string;
  text?: string;
  text_uthmani?: string;
  translations?: {
    text: string;
    resource_id: number;
  }[];
}

interface QuranVerseResponse {
  verse: {
    verse_key: string;
    text_uthmani: string;
    translations?: {
      text: string;
      resource_id: number;
    }[];
  };
}

interface TafsirResponse {
  tafsir?: {
    text: string;
    resource_id: number;
  };
}

interface SurahInfo {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

interface AudioEdition {
  identifier: string;
  language: string;
  name: string;
  englishName: string;
}

interface RandomAyahResult {
  number: number;
  text: string;
  numberInSurah: number;
  surah: {
    number: number;
    englishName: string;
  };
}

export interface VerseResult {
  verseKey: string;
  arabicText: string;
  translation: string;
  tafsirSnippet: string;
}

@Injectable()
export class QuranApiService {
  private readonly logger = new Logger(QuranApiService.name);
  private readonly baseUrl =
    process.env.QURAN_API_BASE_URL || "https://api.quran.com/api/v4";
  private readonly apiKey = process.env.QURAN_FOUNDATION_API_KEY || "";

  constructor(
    private readonly redis: RedisService,
    @Optional() private readonly mcpService?: QuranMcpService,
  ) {}

  async searchVerses(
    query: string,
    size = 3,
    options?: { includeTafsir?: boolean },
  ): Promise<VerseResult[]> {
    const includeTafsir = options?.includeTafsir ?? true;
    const cacheKey = `quran:search:${query}:${size}:${includeTafsir ? "full" : "lite"}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as VerseResult[];
      }
    } catch {
      // non-critical cache read failure
    }

    try {
      const response = await axios.get<{ search: { results: QuranSearchResult[] } }>(
        `${this.baseUrl}/search`,
        {
          params: {
            q: query,
            size,
            language: "en",
            translations: "85,131",
          },
          headers: this.getHeaders(),
          timeout: 9000,
        },
      );

      const results = response.data?.search?.results || [];
      const base = results.slice(0, size).map((result) => {
        const rawTranslation =
          result.translations?.find((t) => t.resource_id === 85)?.text ||
          result.translations?.find((t) => t.resource_id === 131)?.text ||
          result.translations?.[0]?.text ||
          "";

        return {
          verseKey: result.verse_key,
          arabicText: result.text_uthmani || result.text || "",
          translation: rawTranslation
            ? this.decodeHtmlEntities(this.stripHtmlTags(rawTranslation))
            : "Translation unavailable",
          tafsirSnippet: "",
        };
      });

      const verseResults = includeTafsir
        ? await Promise.all(
            base.map(async (verse) => ({
              ...verse,
              tafsirSnippet: await this.getTafsir(verse.verseKey),
            })),
          )
        : base;

      try {
        await this.redis.set(cacheKey, JSON.stringify(verseResults), 3600);
      } catch {
        // non-critical cache write failure
      }

      return verseResults;
    } catch (error) {
      this.logger.warn(
        `Direct Quran API failed. Trying MCP fallback: ${error instanceof Error ? error.message : error}`,
      );

      if (this.mcpService) {
        try {
          const mcpResults = await this.mcpService.searchVerses(query, size);
          if (mcpResults && mcpResults.length > 0) {
            try {
              await this.redis.set(cacheKey, JSON.stringify(mcpResults), 1800);
            } catch {
              // non-critical
            }
            return mcpResults;
          }
        } catch (mcpError) {
          this.logger.warn(
            `MCP fallback failed: ${mcpError instanceof Error ? mcpError.message : mcpError}`,
          );
        }
      }

      return [];
    }
  }

  async getTafsir(verseKey: string): Promise<string> {
    try {
      const response = await axios.get<TafsirResponse>(
        `${this.baseUrl}/tafsirs/169/by_ayah/${verseKey}`,
        {
          headers: this.getHeaders(),
          timeout: 7000,
        },
      );

      const tafsirText = response.data?.tafsir?.text || "";
      if (!tafsirText) return "";

      const cleaned = this.decodeHtmlEntities(this.stripHtmlTags(tafsirText));
      return cleaned.length > 300 ? `${cleaned.substring(0, 300)}...` : cleaned;
    } catch {
      return "";
    }
  }

  async getVerseWithTranslation(verseKey: string): Promise<VerseResult | null> {
    try {
      const response = await axios.get<QuranVerseResponse>(
        `${this.baseUrl}/verses/by_key/${verseKey}`,
        {
          params: {
            translations: 131,
            fields: "text_uthmani",
          },
          headers: this.getHeaders(),
          timeout: 8000,
        },
      );

      const verse = response.data?.verse;
      if (!verse) return null;

      const translation =
        verse.translations?.find((t) => t.resource_id === 131)?.text ||
        verse.translations?.[0]?.text ||
        "Translation unavailable";

      return {
        verseKey: verse.verse_key,
        arabicText: verse.text_uthmani || "",
        translation: this.decodeHtmlEntities(this.stripHtmlTags(translation)),
        tafsirSnippet: await this.getTafsir(verseKey),
      };
    } catch (error) {
      this.logger.warn(
        `Failed to fetch verse ${verseKey}: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  async postGoal(
    quranApiKey: string,
    taskDescription: string,
  ): Promise<string | null> {
    const userApiUrl =
      process.env.QURAN_FOUNDATION_USER_API_URL ||
      process.env.QURAN_USER_API_URL ||
      "https://api.quran.com/api/v4";

    try {
      const response = await axios.post<{ goal?: { id: string } }>(
        `${userApiUrl}/users/goals`,
        {
          description: taskDescription,
          type: "custom",
        },
        {
          headers: {
            "Content-Type": "application/json",
            ...(quranApiKey ? { "x-api-key": quranApiKey } : {}),
          },
          timeout: 8000,
        },
      );

      return response.data?.goal?.id || null;
    } catch (error) {
      this.logger.warn(
        `Failed to post goal to Quran Foundation API: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  async getSurahs(): Promise<SurahInfo[]> {
    const cacheKey = "quran:surahs";
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as SurahInfo[];
      }
    } catch {
      // non-critical
    }

    try {
      const response = await axios.get<{ chapters: any[] }>(
        `${this.baseUrl}/chapters`,
        {
          params: { language: "en" },
          headers: this.getHeaders(),
          timeout: 9000,
        },
      );

      const surahs: SurahInfo[] = (response.data?.chapters || []).map((c) => ({
        number: Number(c.id),
        name: String(c.name_arabic || ""),
        englishName: String(c.name_simple || ""),
        englishNameTranslation: String(c.translated_name?.name || ""),
        numberOfAyahs: Number(c.verses_count || 0),
        revelationType: String(c.revelation_place || ""),
      }));

      try {
        await this.redis.set(cacheKey, JSON.stringify(surahs), 86400);
      } catch {
        // non-critical
      }

      return surahs;
    } catch {
      return [];
    }
  }

  async getAudioEditions(): Promise<AudioEdition[]> {
    return [
      {
        identifier: "ar.alafasy",
        language: "ar",
        name: "Mishary Rashid Alafasy",
        englishName: "Mishary Rashid Alafasy",
      },
      {
        identifier: "ar.abdurrahmaansudais",
        language: "ar",
        name: "Abdurrahman As-Sudais",
        englishName: "Abdurrahman As-Sudais",
      },
      {
        identifier: "ar.abdulbasitmurattal",
        language: "ar",
        name: "Abdul Basit",
        englishName: "Abdul Basit",
      },
    ];
  }

  async getAudioUrl(
    surahNumber: number,
    reciterIdentifier: string | number,
  ): Promise<string | null> {
    if (surahNumber < 1 || surahNumber > 114) {
      return null;
    }

    const reciterMap: Record<number, string> = {
      1: "ar.abdulbasitmurattal",
      3: "ar.abdurrahmaansudais",
      7: "ar.alafasy",
    };

    const reciter =
      typeof reciterIdentifier === "number"
        ? reciterMap[reciterIdentifier] || "ar.alafasy"
        : reciterIdentifier || "ar.alafasy";

    const paddedSurah = String(surahNumber).padStart(3, "0");
    return `https://cdn.islamic.network/quran/audio/128/${reciter}/${paddedSurah}.mp3`;
  }

  async getRandomAyah(): Promise<RandomAyahResult | null> {
    const randomAyah = Math.floor(Math.random() * 6236) + 1;
    try {
      const response = await axios.get<{ data: any }>(
        `https://api.alquran.cloud/v1/ayah/${randomAyah}/en.asad`,
        { timeout: 8000 },
      );

      const verse = response.data?.data;
      if (!verse) return null;

      return {
        number: Number(verse.number),
        text: String(verse.text || ""),
        numberInSurah: Number(verse.numberInSurah || 0),
        surah: {
          number: Number(verse.surah?.number || 0),
          englishName: String(verse.surah?.englishName || ""),
        },
      };
    } catch {
      return null;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) headers["x-api-key"] = this.apiKey;
    return headers;
  }

  private stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");
  }
}
