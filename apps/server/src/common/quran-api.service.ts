import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { RedisService } from "./redis.service";

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

  constructor(private readonly redis: RedisService) {}

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
        this.logger.log(`Quran cache hit for: ${query}`);
        return JSON.parse(cached) as VerseResult[];
      }
    } catch {
      // non-critical
    }

    try {
      const response = await axios.get<{
        search: { results: QuranSearchResult[] };
      }>(`${this.baseUrl}/search`, {
        params: {
          q: query,
          size,
          language: "en",
          translations: 131,
        },
        headers: this.getHeaders(),
        timeout: 8000,
      });

      const results = response.data?.search?.results || [];
      if (results.length === 0) {
        return this.getFallbackVerses(query, size);
      }

      const baseVerses = results.slice(0, size).map((result) => {
        const translation =
          result.translations?.find((t) => t.resource_id === 131)?.text ||
          result.translations?.[0]?.text ||
          "Translation unavailable";

        return {
          verseKey: result.verse_key,
          arabicText: result.text_uthmani || result.text || "",
          translation: this.decodeHtmlEntities(this.stripHtmlTags(translation)),
          tafsirSnippet: "",
        };
      });

      let verseResults: VerseResult[] = baseVerses;
      if (includeTafsir) {
        const tafsirs = await Promise.all(
          baseVerses.map((verse) => this.getTafsir(verse.verseKey)),
        );

        verseResults = baseVerses.map((verse, i) => ({
          ...verse,
          tafsirSnippet: tafsirs[i],
        }));
      }

      try {
        await this.redis.set(cacheKey, JSON.stringify(verseResults), 3600);
      } catch {
        // non-critical
      }

      return verseResults;
    } catch (error) {
      this.logger.error("Failed to search verses", error);
      return this.getFallbackVerses(query, size);
    }
  }

  async getTafsir(verseKey: string): Promise<string> {
    try {
      const response = await axios.get<TafsirResponse>(
        `${this.baseUrl}/tafsirs/en-tafisr-ibn-kathir/by_ayah/${verseKey}`,
        {
          headers: this.getHeaders(),
          timeout: 6000,
        },
      );

      const tafsirText =
        response.data?.tafsir?.text || "Tafsir unavailable";
      const cleaned = this.decodeHtmlEntities(this.stripHtmlTags(tafsirText));
      return cleaned.length > 300
        ? cleaned.substring(0, 300) + "..."
        : cleaned;
    } catch {
      return "Ringkasan tafsir belum tersedia untuk ayat ini saat ini.";
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

      const tafsirSnippet = await this.getTafsir(verseKey);

      return {
        verseKey: verse.verse_key,
        arabicText: verse.text_uthmani || "",
        translation: this.decodeHtmlEntities(this.stripHtmlTags(translation)),
        tafsirSnippet,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch verse ${verseKey}`, error);
      return null;
    }
  }

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
      if (goalId) this.logger.log(`Created Quran Goal: ${goalId}`);
      return goalId;
    } catch (error) {
      this.logger.warn(
        "Failed to post goal to Quran Foundation API — continuing without quranGoalId",
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }

  private getFallbackVerses(query: string, size: number): VerseResult[] {
    const q = query.toLowerCase();

    const patienceVerses: VerseResult[] = [
      {
        verseKey: "94:5",
        arabicText: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا",
        translation: "Indeed, with hardship comes ease.",
        tafsirSnippet: "Allah menegaskan bahwa kesulitan tidak datang sendirian; selalu ada kemudahan yang menyertainya.",
      },
      {
        verseKey: "2:286",
        arabicText: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا",
        translation: "Allah does not burden a soul beyond what it can bear.",
        tafsirSnippet: "Setiap ujian berada dalam batas kemampuan hamba, sehingga ujian juga mengandung potensi pertumbuhan.",
      },
      {
        verseKey: "13:28",
        arabicText: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
        translation: "Surely in the remembrance of Allah do hearts find rest.",
        tafsirSnippet: "Ketenangan hati paling dalam muncul ketika hati kembali mengingat Allah secara sadar dan konsisten.",
      },
    ];

    const gratitudeVerses: VerseResult[] = [
      {
        verseKey: "14:7",
        arabicText: "لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ",
        translation: "If you are grateful, I will surely increase you.",
        tafsirSnippet: "Syukur yang nyata membuka tambahan nikmat, baik dalam ketenangan batin maupun peluang hidup.",
      },
      {
        verseKey: "93:11",
        arabicText: "وَأَمَّا بِنِعْمَةِ رَبِّكَ فَحَدِّثْ",
        translation: "And proclaim the blessings of your Lord.",
        tafsirSnippet: "Menyadari dan menyebut nikmat Allah menumbuhkan optimisme, adab, dan rasa cukup.",
      },
      {
        verseKey: "2:152",
        arabicText: "فَاذْكُرُونِي أَذْكُرْكُمْ",
        translation: "Remember Me; I will remember you.",
        tafsirSnippet: "Dzikir adalah hubungan timbal balik yang menguatkan jiwa dan orientasi hidup.",
      },
    ];

    const base = /syukur|grateful|nikmat/.test(q) ? gratitudeVerses : patienceVerses;
    return base.slice(0, Math.max(1, Math.min(size, 3)));
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
