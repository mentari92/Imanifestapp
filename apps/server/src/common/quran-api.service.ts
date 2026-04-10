import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { RedisService } from "./redis.service";

interface QuranSearchResult {
  verse_key: string;
  text: string; // Arabic text
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

export interface VerseResult {
  verseKey: string;
  arabicText: string;
  translation: string;
  tafsirSnippet: string;
}

/**
 * Quran Foundation Content API client.
 * Searches verses, fetches translations, and retrieves tafsir.
 * Results are cached in Redis for 1 hour (Quran text doesn't change).
 */
@Injectable()
export class QuranApiService {
  private readonly logger = new Logger(QuranApiService.name);
  private readonly baseUrl =
    process.env.QURAN_API_BASE_URL || "https://api.quran.com/api/v4";
  private readonly apiKey = process.env.QURAN_FOUNDATION_API_KEY || "";

  constructor(private readonly redis: RedisService) {}

  /**
   * Search for verses matching a query, returning up to `size` results.
   * Uses the English translation (resource_id: 131 = Dr. Mustafa Khattab).
   * Results are cached in Redis (TTL 1 hour).
   */
  async searchVerses(query: string, size = 3): Promise<VerseResult[]> {
    // Check Redis cache first
    const cacheKey = `quran:search:${query}:${size}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.log(`Quran cache hit for: ${query}`);
        return JSON.parse(cached) as VerseResult[];
      }
    } catch {
      // Cache read failed — continue with API call
    }

    try {
      const response = await axios.get<{
        search: { results: QuranSearchResult[] };
      }>(`${this.baseUrl}/search`, {
        params: {
          q: query,
          size,
          language: "en",
          translations: 131, // Dr. Mustafa Khattab
        },
        headers: this.getHeaders(),
        timeout: 10000,
      });

      const results = response.data?.search?.results || [];
      const verseResults: VerseResult[] = [];

      for (const result of results.slice(0, size)) {
        const translation =
          result.translations?.find((t) => t.resource_id === 131)?.text ||
          result.translations?.[0]?.text ||
          "Translation unavailable";

        // Fetch tafsir for each verse
        const tafsirSnippet = await this.getTafsir(result.verse_key);

        verseResults.push({
          verseKey: result.verse_key,
          arabicText: result.text,
          translation: this.stripHtmlTags(translation),
          tafsirSnippet,
        });
      }

      // Cache the results (TTL 1 hour — Quran text doesn't change)
      try {
        await this.redis.set(cacheKey, JSON.stringify(verseResults), 3600);
      } catch {
        // Cache write failed — non-critical
      }

      return verseResults;
    } catch (error) {
      this.logger.error("Failed to search verses", error);
      return [];
    }
  }

  /**
   * Get tafsir snippet for a specific verse (Ibn Kathir).
   * Returns max 300 characters.
   */
  async getTafsir(verseKey: string): Promise<string> {
    try {
      const response = await axios.get<TafsirResponse>(
        `${this.baseUrl}/tafsirs/en-tafisr-ibn-kathir/by_ayah/${verseKey}`,
        {
          headers: this.getHeaders(),
          timeout: 10000,
        },
      );

      const tafsirText =
        response.data?.tafsir?.text || "Tafsir unavailable";
      const cleaned = this.stripHtmlTags(tafsirText);
      return cleaned.length > 300
        ? cleaned.substring(0, 300) + "..."
        : cleaned;
    } catch (error) {
      this.logger.warn(`Failed to fetch tafsir for ${verseKey}`, error);
      return "Tafsir unavailable";
    }
  }

  /**
   * Get a specific verse with its Arabic text and English translation.
   */
  async getVerseWithTranslation(verseKey: string): Promise<VerseResult | null> {
    try {
      const response = await axios.get<QuranVerseResponse>(
        `${this.baseUrl}/verses/by_key/${verseKey}`,
        {
          params: {
            translations: 131, // Dr. Mustafa Khattab
            fields: "text_uthmani",
          },
          headers: this.getHeaders(),
          timeout: 10000,
        },
      );

      const verse = response.data?.verse;
      if (!verse) return null;

      const translation =
        verse.translations?.find((t) => t.resource_id === 131)?.text ||
        verse.translations?.[0]?.text ||
        "Translation unavailable";

      const tafsirSnippet = await this.getTafsir(verseKey);

      return {
        verseKey: verse.verse_key,
        arabicText: verse.text_uthmani || "",
        translation: this.stripHtmlTags(translation),
        tafsirSnippet,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch verse ${verseKey}`,
        error,
      );
      return null;
    }
  }

  /**
   * Post a goal to the Quran Foundation User API (Goals).
   * Returns the goal ID on success, or null on failure (graceful degradation).
   */
  async postGoal(
    quranApiKey: string,
    taskDescription: string,
  ): Promise<string | null> {
    const userApiUrl =
      process.env.QURAN_USER_API_URL || "https://api.quran.com/api/v4";

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

      const goalId = response.data?.goal?.id || null;
      if (goalId) {
        this.logger.log(`Created Quran Goal: ${goalId}`);
      }
      return goalId;
    } catch (error) {
      this.logger.warn(
        "Failed to post goal to Quran Foundation API — continuing without quranGoalId",
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }
    return headers;
  }

  private stripHtmlTags(html: string): string {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
}