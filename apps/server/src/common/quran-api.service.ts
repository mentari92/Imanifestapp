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
          translations: "85,131",
        },
        headers: this.getHeaders(),
        timeout: 8000,
      });

      const results = response.data?.search?.results || [];
      if (results.length === 0) {
        return this.getFallbackVerses(query, size);
      }

      const baseVerses = results.slice(0, size).map((result) => {
        const rawTranslation =
          result.translations?.find((t) => t.resource_id === 85)?.text ||
          result.translations?.find((t) => t.resource_id === 131)?.text ||
          result.translations?.[0]?.text ||
          "";
        const translation = rawTranslation
          ? this.decodeHtmlEntities(this.stripHtmlTags(rawTranslation))
          : "Translation unavailable";

        return {
          verseKey: result.verse_key,
          arabicText: result.text_uthmani || result.text || "",
          translation,
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
      // Tafsir ID 169 = Tafsir Ibn Kathir (English) on Quran Foundation API
      const response = await axios.get<TafsirResponse>(
        `${this.baseUrl}/tafsirs/169/by_ayah/${verseKey}`,
        {
          headers: this.getHeaders(),
          timeout: 6000,
        },
      );

      const tafsirText = response.data?.tafsir?.text || "";
      if (!tafsirText) return "";
      const cleaned = this.decodeHtmlEntities(this.stripHtmlTags(tafsirText));
      return cleaned.length > 300
        ? cleaned.substring(0, 300) + "..."
        : cleaned;
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

    // Topic-aware verse bank
    const topicMap: Array<{ test: RegExp; verses: VerseResult[] }> = [
      {
        test: /travel|safar|journey|perjalanan|musafir/,
        verses: [
          {
            verseKey: "2:286",
            arabicText: "\u0644\u0627 \u064a\u064f\u0643\u064e\u0644\u0651\u0650\u0641\u064f \u0627\u0644\u0644\u0651\u0647\u064f \u0646\u064e\u0641\u0652\u0633\u064b\u0627 \u0625\u0650\u0644\u0651\u0627 \u0648\u064f\u0633\u0652\u0639\u064e\u0647\u064e\u0627",
            translation: "Allah does not burden a soul beyond what it can bear.",
            tafsirSnippet: "Every journey and hardship is within what Allah has decreed you can handle.",
          },
          {
            verseKey: "67:15",
            arabicText: "\u0647\u064f\u0648\u064e \u0627\u0644\u0651\u064e\u0630\u0650\u064a \u062c\u064e\u0639\u064e\u0644\u064e \u0644\u064e\u0643\u064f\u0645\u064f \u0627\u0644\u0652\u0623\u064e\u0631\u0652\u0636\u064e \u0630\u064e\u0644\u064f\u0648\u0644\u064b\u0627",
            translation: "It is He who made the earth tame for you — so walk among its slopes and eat of His provision.",
            tafsirSnippet: "Allah made travel and the earth accessible as a mercy and means of provision.",
          },
          {
            verseKey: "6:59",
            arabicText: "\u0648\u064e\u064a\u064e\u0639\u0652\u0644\u064e\u0645\u064f \u0645\u064e\u0627 \u0641\u0650\u064a \u0627\u0644\u0652\u0628\u064e\u0631\u0651\u0650 \u0648\u064e\u0627\u0644\u0652\u0628\u064e\u062d\u0652\u0631\u0650",
            translation: "And He knows what is in the land and sea.",
            tafsirSnippet: "No path on land or sea is unknown to Allah — trust in His knowledge during your travels.",
          },
        ],
      },
      {
        test: /wealth|money|rich|rezeki|kaya|harta|finance|keuangan|income|pendapatan|bisnis|business/,
        verses: [
          {
            verseKey: "65:3",
            arabicText: "\u0648\u064e\u0645\u064e\u0646 \u064a\u064e\u062a\u064e\u0648\u064e\u0643\u0651\u064e\u0644\u0652 \u0639\u064e\u0644\u064e\u0649 \u0627\u0644\u0644\u0651\u0647\u0650 \u0641\u064e\u0647\u064f\u0648\u064e \u062d\u064e\u0633\u0652\u0628\u064f\u0647\u064f",
            translation: "And whoever relies upon Allah — then He is sufficient for him.",
            tafsirSnippet: "Tawakkul in seeking provision means making full effort while trusting Allah for the outcome.",
          },
          {
            verseKey: "14:7",
            arabicText: "\u0644\u064e\u0626\u0650\u0646 \u0634\u064e\u0643\u064e\u0631\u0652\u062a\u064f\u0645\u0652 \u0644\u064e\u0623\u064e\u0632\u0650\u064a\u062f\u064e\u0646\u0651\u064e\u0643\u064f\u0645\u0652",
            translation: "If you are grateful, I will surely increase you in favor.",
            tafsirSnippet: "Gratitude for existing provision is the key that unlocks greater barakah and increase.",
          },
          {
            verseKey: "11:6",
            arabicText: "\u0648\u064e\u0645\u064e\u0627 \u0645\u0650\u0646 \u062f\u064e\u0622\u0628\u0651\u064e\u0629\u064d \u0641\u0650\u064a \u0627\u0644\u0652\u0623\u064e\u0631\u0652\u0636\u0650 \u0625\u0650\u0644\u0651\u064e\u0627 \u0639\u064e\u0644\u064e\u0649 \u0627\u0644\u0644\u0651\u0647\u0650 \u0631\u0650\u0632\u0652\u0642\u064f\u0647\u064e\u0627",
            translation: "There is no creature on earth but that its provision rests with Allah.",
            tafsirSnippet: "Every living being's sustenance is guaranteed by Allah — work hard and trust the Provider.",
          },
        ],
      },
      {
        test: /career|job|work|kerja|karier|pekerjaan|employment|profession|interview|lamaran/,
        verses: [
          {
            verseKey: "94:5",
            arabicText: "\u0641\u064e\u0625\u0650\u0646\u0651\u064e \u0645\u064e\u0639\u064e \u0627\u0644\u0652\u0639\u064f\u0633\u0652\u0631\u0650 \u064a\u064f\u0633\u0652\u0631\u064b\u0627",
            translation: "Indeed, with hardship comes ease.",
            tafsirSnippet: "Career struggles are temporary — Allah has promised relief alongside every difficulty.",
          },
          {
            verseKey: "53:39",
            arabicText: "\u0648\u064e\u0623\u064e\u0646 \u0644\u064e\u064a\u0652\u0633\u064e \u0644\u0650\u0644\u0652\u0625\u0650\u0646\u0633\u064e\u0627\u0646\u0650 \u0625\u0650\u0644\u0651\u064e\u0627 \u0645\u064e\u0627 \u0633\u064e\u0639\u064e\u0649",
            translation: "And that there is not for man except that for which he strives.",
            tafsirSnippet: "Your efforts are not wasted — every striving counts and is recorded by Allah.",
          },
          {
            verseKey: "65:3",
            arabicText: "\u0648\u064e\u0645\u064e\u0646 \u064a\u064e\u062a\u064e\u0648\u064e\u0643\u0651\u064e\u0644\u0652 \u0639\u064e\u0644\u064e\u0649 \u0627\u0644\u0644\u0651\u0647\u0650 \u0641\u064e\u0647\u064f\u0648\u064e \u062d\u064e\u0633\u0652\u0628\u064f\u0647\u064f",
            translation: "And whoever relies upon Allah — then He is sufficient for him.",
            tafsirSnippet: "After your best effort in seeking work, place your trust fully in Allah.",
          },
        ],
      },
      {
        test: /family|keluarga|marriage|nikah|spouse|husband|wife|child|anak|parent|ortu|silaturahmi/,
        verses: [
          {
            verseKey: "30:21",
            arabicText: "\u0648\u064e\u0645\u0650\u0646\u0652 \u0622\u064a\u064e\u0627\u062a\u0650\u0647\u0650 \u0623\u064e\u0646\u0652 \u062e\u064e\u0644\u064e\u0642\u064e \u0644\u064e\u0643\u064f\u0645 \u0645\u0651\u0650\u0646\u0652 \u0623\u064e\u0646\u0641\u064f\u0633\u0650\u0643\u064f\u0645\u0652 \u0623\u064e\u0632\u0652\u0648\u064e\u0627\u062c\u064b\u0627",
            translation: "And of His signs is that He created for you from yourselves mates that you may find tranquility in them.",
            tafsirSnippet: "Marriage is a sign of Allah's mercy — a source of sakinah, love, and compassion.",
          },
          {
            verseKey: "17:23",
            arabicText: "\u0648\u064e\u0642\u064e\u0636\u064e\u0649 \u0631\u064e\u0628\u0651\u064f\u0643\u064e \u0623\u064e\u0644\u0651\u064e\u0627 \u062a\u064e\u0639\u0652\u0628\u064f\u062f\u064f\u0648\u0627 \u0625\u0650\u0644\u0651\u064e\u0627 \u0625\u0650\u064a\u0651\u064e\u0627\u0647\u064f",
            translation: "Your Lord has decreed that you worship none but Him, and that you be good to parents.",
            tafsirSnippet: "Kindness to parents is linked directly to worship of Allah — it opens blessings in life.",
          },
          {
            verseKey: "4:1",
            arabicText: "\u0627\u062a\u0651\u064e\u0642\u064f\u0648\u0627 \u0631\u064e\u0628\u0651\u064e\u0643\u064f\u0645\u064f \u0627\u0644\u0651\u064e\u0630\u0650\u064a \u062e\u064e\u0644\u064e\u0642\u064e\u0643\u064f\u0645 \u0645\u0651\u0650\u0646 \u0646\u0651\u064e\u0641\u0652\u0633\u064d \u0648\u064e\u0627\u062d\u0650\u062f\u064e\u0629\u064d",
            translation: "Fear your Lord, who created you from one soul and created from it its mate.",
            tafsirSnippet: "All of humanity shares one origin — family bonds are sacred and to be nurtured.",
          },
        ],
      },
      {
        test: /health|sakit|sick|ill|disease|penyakit|recover|sembuh|hospital|dokter|doctor/,
        verses: [
          {
            verseKey: "26:80",
            arabicText: "\u0648\u064e\u0625\u0650\u0630\u064e\u0627 \u0645\u064e\u0631\u0650\u0636\u0652\u062a\u064f \u0641\u064e\u0647\u064f\u0648\u064e \u064a\u064e\u0634\u0652\u0641\u0650\u064a\u0646\u0650",
            translation: "And when I am ill, it is He who cures me.",
            tafsirSnippet: "Only Allah truly heals — doctors are means, but the cure comes from Allah alone.",
          },
          {
            verseKey: "2:286",
            arabicText: "\u0644\u0627 \u064a\u064f\u0643\u064e\u0644\u0651\u0650\u0641\u064f \u0627\u0644\u0644\u0651\u0647\u064f \u0646\u064e\u0641\u0652\u0633\u064b\u0627 \u0625\u0650\u0644\u0651\u0627 \u0648\u064f\u0633\u0652\u0639\u064e\u0647\u064e\u0627",
            translation: "Allah does not burden a soul beyond what it can bear.",
            tafsirSnippet: "Even illness is within what you can bear, and every hardship brings expiation of sins.",
          },
          {
            verseKey: "94:5",
            arabicText: "\u0641\u064e\u0625\u0650\u0646\u0651\u064e \u0645\u064e\u0639\u064e \u0627\u0644\u0652\u0639\u064f\u0633\u0652\u0631\u0650 \u064a\u064f\u0633\u0652\u0631\u064b\u0627",
            translation: "Indeed, with hardship comes ease.",
            tafsirSnippet: "Recovery and relief are promised alongside every illness and difficulty.",
          },
        ],
      },
      {
        test: /syukur|grateful|nikmat|gratitude|thankful|blessings|blessing|alhamdulillah/,
        verses: [
          {
            verseKey: "14:7",
            arabicText: "\u0644\u064e\u0626\u0650\u0646 \u0634\u064e\u0643\u064e\u0631\u0652\u062a\u064f\u0645\u0652 \u0644\u064e\u0623\u064e\u0632\u0650\u064a\u062f\u064e\u0646\u0651\u064e\u0643\u064f\u0645\u0652",
            translation: "If you are grateful, I will surely increase you in favor.",
            tafsirSnippet: "Gratitude that is real opens the door to more blessings in ways we cannot anticipate.",
          },
          {
            verseKey: "93:11",
            arabicText: "\u0648\u064e\u0623\u064e\u0645\u0651\u064e\u0627 \u0628\u0650\u0646\u0650\u0639\u0652\u0645\u064e\u0629\u0650 \u0631\u064e\u0628\u0651\u0650\u0643\u064e \u0641\u064e\u062d\u064e\u062f\u0651\u0650\u062b\u0652",
            translation: "And proclaim the blessings of your Lord.",
            tafsirSnippet: "Naming and speaking about Allah's blessings strengthens gratitude and spreads positivity.",
          },
          {
            verseKey: "2:152",
            arabicText: "\u0641\u064e\u0627\u0630\u0652\u0643\u064f\u0631\u064f\u0648\u0646\u0650\u064a \u0623\u064e\u0630\u0652\u0643\u064f\u0631\u0652\u0643\u064f\u0645\u0652",
            translation: "Remember Me; I will remember you.",
            tafsirSnippet: "Dhikr is a reciprocal bond — when you remember Allah, He remembers you in return.",
          },
        ],
      },
      {
        test: /tawakkul|trust|hope|harap|doa|prayer|supplication|goal|cita|impian|dream|manifest/,
        verses: [
          {
            verseKey: "3:160",
            arabicText: "\u0648\u064e\u0639\u064e\u0644\u064e\u0649 \u0627\u0644\u0644\u0651\u0647\u0650 \u0641\u064e\u0644\u0652\u064a\u064e\u062a\u064e\u0648\u064e\u0643\u0651\u064e\u0644\u0650 \u0627\u0644\u0652\u0645\u064f\u0624\u0652\u0645\u0650\u0646\u064f\u0648\u0646\u064e",
            translation: "And upon Allah let the believers rely.",
            tafsirSnippet: "The mark of true iman is placing full reliance on Allah after exhausting one's effort.",
          },
          {
            verseKey: "40:60",
            arabicText: "\u0627\u062f\u0652\u0639\u064f\u0648\u0646\u0650\u064a \u0623\u064e\u0633\u0652\u062a\u064e\u062c\u0650\u0628\u0652 \u0644\u064e\u0643\u064f\u0645\u0652",
            translation: "Call upon Me; I will respond to you.",
            tafsirSnippet: "Allah's promise to answer dua is absolute — sincerity and persistence are key.",
          },
          {
            verseKey: "65:3",
            arabicText: "\u0648\u064e\u0645\u064e\u0646 \u064a\u064e\u062a\u064e\u0648\u064e\u0643\u0651\u064e\u0644\u0652 \u0639\u064e\u0644\u064e\u0649 \u0627\u0644\u0644\u0651\u0647\u0650 \u0641\u064e\u0647\u064f\u0648\u064e \u062d\u064e\u0633\u0652\u0628\u064f\u0647\u064f",
            translation: "And whoever relies upon Allah — then He is sufficient for him.",
            tafsirSnippet: "True tawakkul combines sincere effort with complete trust in Allah's decree.",
          },
        ],
      },
    ];

    // Default (patience/hardship) verses
    const defaultVerses: VerseResult[] = [
      {
        verseKey: "94:5",
        arabicText: "\u0641\u064e\u0625\u0650\u0646\u0651\u064e \u0645\u064e\u0639\u064e \u0627\u0644\u0652\u0639\u064f\u0633\u0652\u0631\u0650 \u064a\u064f\u0633\u0652\u0631\u064b\u0627",
        translation: "Indeed, with hardship comes ease.",
        tafsirSnippet: "Allah confirms that hardship is never without its accompanying ease.",
      },
      {
        verseKey: "2:286",
        arabicText: "\u0644\u0627 \u064a\u064f\u0643\u064e\u0644\u0651\u0650\u0641\u064f \u0627\u0644\u0644\u0651\u0647\u064f \u0646\u064e\u0641\u0652\u0633\u064b\u0627 \u0625\u0650\u0644\u0651\u0627 \u0648\u064f\u0633\u0652\u0639\u064e\u0647\u064e\u0627",
        translation: "Allah does not burden a soul beyond what it can bear.",
        tafsirSnippet: "Every test is within your capacity — the difficulty itself contains potential for growth.",
      },
      {
        verseKey: "13:28",
        arabicText: "\u0623\u064e\u0644\u064e\u0627 \u0628\u0650\u0630\u0650\u0643\u0652\u0631\u0650 \u0627\u0644\u0644\u0651\u0647\u0650 \u062a\u064e\u0637\u0652\u0645\u064e\u0626\u0650\u0646\u0651\u064f \u0627\u0644\u0652\u0642\u064f\u0644\u064f\u0648\u0628\u064f",
        translation: "Surely in the remembrance of Allah do hearts find rest.",
        tafsirSnippet: "True peace of heart comes only from connecting with Allah through dhikr.",
      },
    ];

    const matched = topicMap.find((t) => t.test.test(q));
    const base = matched ? matched.verses : defaultVerses;
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
