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
