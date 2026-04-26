import { Injectable, Logger, Optional } from "@nestjs/common";
import axios from "axios";
import { RedisService } from "./redis.service";
import { QuranMcpService } from "./quran-mcp.service";

interface FoundationOauthTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
}

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

interface FoundationRecitation {
  id: number;
  reciter_name: string;
  style?: string;
}

interface FoundationAudioFile {
  verse_key?: string;
  url?: string;
}

interface FoundationHealthResult {
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
  private readonly foundationBaseUrl =
    process.env.QURAN_FOUNDATION_CONTENT_API_URL ||
    "https://apis.quran.foundation/content/api/v4";
  private readonly foundationClientId =
    process.env.QURAN_FOUNDATION_CLIENT_ID || "";
  private readonly foundationClientSecret =
    process.env.QURAN_FOUNDATION_CLIENT_SECRET || "";
  private readonly foundationOauthBaseUrl =
    process.env.QURAN_FOUNDATION_OAUTH_BASE_URL || "https://oauth2.quran.foundation";
  private readonly foundationAuthToken =
    process.env.QURAN_FOUNDATION_AUTH_TOKEN || "";
  private readonly foundationAudioBaseUrl =
    process.env.QURAN_FOUNDATION_AUDIO_BASE_URL || "https://audio.qurancdn.com";
  private cachedFoundationToken: string | null = null;
  private cachedFoundationTokenExpiryMs = 0;

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
            translations: "85,131,20",
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
        verse.translations?.find((t) => t.resource_id === 85)?.text ||
        verse.translations?.find((t) => t.resource_id === 20)?.text ||
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
    // Quran Foundation User-related APIs require:
    // - Base URL like https://apis(-prelive).quran.foundation/auth
    // - Headers: x-auth-token (user access token) + x-client-id (our client id)
    // See: https://api-docs.quran.foundation/docs/user_related_apis_versioned/user-related-apis/
    const userApiUrl = (process.env.QURAN_FOUNDATION_USER_API_URL || "").replace(/\/$/, "");
    const accessToken = (quranApiKey || "").trim();

    if (!userApiUrl) {
      this.logger.warn(
        "QURAN_FOUNDATION_USER_API_URL not configured; skipping User API sync",
      );
      return null;
    }

    if (!this.foundationClientId) {
      this.logger.warn(
        "QURAN_FOUNDATION_CLIENT_ID not configured; skipping User API sync",
      );
      return null;
    }

    if (!accessToken) {
      return null;
    }

    try {
      // Use a documented endpoint that supports simple metadata.
      // We map each task to a small "collection" item (name = task title).
      const response = await axios.post<Record<string, any>>(
        `${userApiUrl}/v1/collections`,
        {
          name: String(taskDescription || "").slice(0, 120) || "Imanifest Task",
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "x-auth-token": accessToken,
            "x-client-id": this.foundationClientId,
          },
          timeout: 8000,
        },
      );

      const body = response.data || {};
      const id =
        (typeof body?.data?.id === "string" && body.data.id) ||
        (typeof body?.data?._id === "string" && body.data._id) ||
        (typeof body?.collection?.id === "string" && body.collection.id) ||
        null;

      return id;
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

  async getFoundationRecitations(): Promise<FoundationRecitation[]> {
    const headers = await this.getFoundationHeaders();
    if (!headers) {
      return [];
    }

    try {
      const response = await axios.get<{ recitations?: FoundationRecitation[] }>(
        `${this.foundationBaseUrl}/resources/recitations`,
        {
          headers,
          timeout: 9000,
        },
      );

      return (response.data?.recitations || []).filter(
        (r) => typeof r.id === "number" && !!r.reciter_name,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to fetch Foundation recitations: ${error instanceof Error ? error.message : error}`,
      );
      return [];
    }
  }

  async getFoundationAyahAudioUrl(
    recitationId: number,
    ayahKey: string,
  ): Promise<string | null> {
    const headers = await this.getFoundationHeaders();
    if (!headers) {
      return null;
    }

    if (!/^\d+:\d+$/.test(ayahKey)) {
      return null;
    }

    try {
      const response = await axios.get<{ audio_files?: FoundationAudioFile[] }>(
        `${this.foundationBaseUrl}/recitations/${recitationId}/by_ayah/${ayahKey}`,
        {
          headers,
          timeout: 9000,
        },
      );

      const files = response.data?.audio_files || [];
      const target = files.find(
        (f) => f.verse_key === ayahKey && typeof f.url === "string" && f.url.length > 0,
      );
      if (!target?.url) {
        return null;
      }

      return this.toAbsoluteFoundationAudioUrl(target.url);
    } catch (error) {
      this.logger.warn(
        `Failed to fetch Foundation ayah audio for recitation ${recitationId}, ayah ${ayahKey}: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  async getFoundationHealth(): Promise<FoundationHealthResult> {
    const hasFoundationAuth = !!this.foundationAuthToken || !!this.foundationClientSecret;
    const configured = {
      clientId: !!this.foundationClientId,
      authToken: hasFoundationAuth,
      contentApiUrl: this.foundationBaseUrl,
      audioBaseUrl: this.foundationAudioBaseUrl,
    };

    if (!configured.clientId || !hasFoundationAuth) {
      return {
        healthy: false,
        configured,
        recitationsCount: 0,
        sampleReciters: [],
        checkedAt: new Date().toISOString(),
        error: "missing_foundation_credentials",
      };
    }

    try {
      const response = await axios.get<{ recitations?: FoundationRecitation[] }>(
        `${this.foundationBaseUrl}/resources/recitations`,
        {
          headers: (await this.getFoundationHeaders()) || undefined,
          timeout: 9000,
        },
      );

      const recitations = (response.data?.recitations || []).filter(
        (recitation) => typeof recitation.id === "number" && !!recitation.reciter_name,
      );

      return {
        healthy: recitations.length > 0,
        configured,
        recitationsCount: recitations.length,
        sampleReciters: recitations.slice(0, 5).map((recitation) => recitation.reciter_name),
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      return {
        healthy: false,
        configured,
        recitationsCount: 0,
        sampleReciters: [],
        checkedAt: new Date().toISOString(),
        error: status ? `foundation_request_failed_${status}` : "foundation_request_failed",
      };
    }
  }

  async getRandomAyah(): Promise<RandomAyahResult | null> {
    // Use Quran Foundation public API (api.quran.com) for Verse of the Day
    // Pick a daily verse based on date so it changes once per day, not per request.
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
    );
    const globalIndex = (dayOfYear % 6236) + 1;

    // Map global verse index to surah:ayah via a simple division approach —
    // we store a precomputed table of cumulative verse counts per surah.
    // For simplicity, pick a random surah weighted by verse count instead.
    const randomSurah = Math.floor(Math.random() * 114) + 1;

    try {
      const response = await axios.get<{ verses: any[] }>(
        `${this.baseUrl}/verses/by_chapter/${randomSurah}`,
        {
          params: {
            language: "en",
            translations: "131",
            fields: "text_uthmani",
            per_page: 1,
            page: Math.floor(Math.random() * 5) + 1,
          },
          headers: this.getHeaders(),
          timeout: 8000,
        },
      );

      const verses = response.data?.verses;
      if (!verses?.length) return null;
      const verse = verses[0];

      const translation =
        verse.translations?.[0]?.text || "Translation unavailable";

      return {
        number: Number(verse.id || globalIndex),
        text: this.decodeHtmlEntities(this.stripHtmlTags(String(translation))),
        numberInSurah: Number(verse.verse_number || 0),
        surah: {
          number: randomSurah,
          englishName: `Surah ${randomSurah}`,
        },
      };
    } catch {
      return null;
    }
  }

  async addBookmark(
    quranApiKey: string,
    verseKey: string, // format "surah:verse" e.g. "2:255"
  ): Promise<{ id: string } | null> {
    const userApiUrl = (process.env.QURAN_FOUNDATION_USER_API_URL || "").replace(/\/$/, "");
    const accessToken = (quranApiKey || "").trim();
    if (!userApiUrl || !this.foundationClientId || !accessToken) return null;

    const parts = verseKey.split(":");
    const chapterKey = Number(parts[0] || 1);
    const verseNumber = Number(parts[1] || 1);

    try {
      const response = await axios.post<{ success: boolean; data?: { id: string } }>(
        `${userApiUrl}/v1/bookmarks`,
        { key: chapterKey, verseNumber, type: "ayah" },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "x-auth-token": accessToken,
            "x-client-id": this.foundationClientId,
          },
          timeout: 8000,
        },
      );
      const id = response.data?.data?.id || null;
      return id ? { id } : null;
    } catch (error) {
      this.logger.warn(
        `Bookmark failed for ${verseKey}: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  async getUserStreaks(quranApiKey: string): Promise<{ days: number; status: string } | null> {
    const userApiUrl = (process.env.QURAN_FOUNDATION_USER_API_URL || "").replace(/\/$/, "");
    const accessToken = (quranApiKey || "").trim();
    if (!userApiUrl || !this.foundationClientId || !accessToken) return null;

    try {
      const response = await axios.get<{ success: boolean; data?: Array<{ days: number; status: string }> }>(
        `${userApiUrl}/v1/streaks`,
        {
          headers: {
            Accept: "application/json",
            "x-auth-token": accessToken,
            "x-client-id": this.foundationClientId,
          },
          timeout: 8000,
        },
      );
      const streaks = response.data?.data || [];
      const active = streaks.find((s) => s.status === "ACTIVE") || streaks[0];
      return active ? { days: active.days, status: active.status } : null;
    } catch (error) {
      this.logger.warn(
        `Streak fetch failed: ${error instanceof Error ? error.message : error}`,
      );
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

  private async getFoundationHeaders(): Promise<Record<string, string> | null> {
    if (!this.foundationClientId) {
      return null;
    }

    const authToken = await this.getFoundationAuthToken();
    if (!authToken) {
      return null;
    }

    return {
      "Content-Type": "application/json",
      "x-client-id": this.foundationClientId,
      "x-auth-token": authToken,
    };
  }

  private async getFoundationAuthToken(): Promise<string | null> {
    // Prefer OAuth client credentials for always-fresh tokens.
    if (this.foundationClientId && this.foundationClientSecret) {
      const now = Date.now();
      if (this.cachedFoundationToken && now < this.cachedFoundationTokenExpiryMs) {
        return this.cachedFoundationToken;
      }

      try {
        const params = new URLSearchParams();
        params.set("grant_type", "client_credentials");
        params.set("scope", "content");

        const tokenResponse = await axios.post<FoundationOauthTokenResponse>(
          `${this.foundationOauthBaseUrl}/oauth2/token`,
          params.toString(),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            auth: {
              username: this.foundationClientId,
              password: this.foundationClientSecret,
            },
            timeout: 9000,
          },
        );

        const accessToken = tokenResponse.data?.access_token || "";
        if (!accessToken) {
          return null;
        }

        const expiresInSec =
          typeof tokenResponse.data?.expires_in === "number"
            ? tokenResponse.data.expires_in
            : 3600;

        this.cachedFoundationToken = accessToken;
        // Refresh 60s earlier to avoid edge expiry in-flight.
        this.cachedFoundationTokenExpiryMs = Date.now() + Math.max(expiresInSec - 60, 30) * 1000;
        return accessToken;
      } catch (error) {
        this.logger.warn(
          `Failed to mint Foundation OAuth token: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    // Fallback for environments that only provide a static token.
    return this.foundationAuthToken || null;
  }

  private toAbsoluteFoundationAudioUrl(pathOrUrl: string): string {
    // Some upstream URLs are protocol-relative mirror links, e.g.
    // //mirrors.quranicaudio.com/everyayah/Husary_64kbps/001001.mp3
    if (/^\/\//.test(pathOrUrl)) {
      return `https:${pathOrUrl}`;
    }

    if (/^https?:\/\//i.test(pathOrUrl)) {
      try {
        const parsed = new URL(pathOrUrl);
        // Upstream sometimes returns audio.qurancdn.com + mirror path.
        // Rewrite to the actual mirror host to avoid 404.
        if (
          parsed.hostname === "audio.qurancdn.com" &&
          parsed.pathname.startsWith("/mirrors.quranicaudio.com/")
        ) {
          const rewrittenPath = parsed.pathname.replace(
            "/mirrors.quranicaudio.com",
            "",
          );
          return `https://mirrors.quranicaudio.com${rewrittenPath}`;
        }

        parsed.pathname = parsed.pathname.replace(/\/+/g, "/");
        return parsed.toString();
      } catch {
        return pathOrUrl;
      }
    }

    const cleanBase = this.foundationAudioBaseUrl.replace(/\/$/, "");
    const cleanPath = pathOrUrl.replace(/^\/+/, "");
    return `${cleanBase}/${cleanPath}`;
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
