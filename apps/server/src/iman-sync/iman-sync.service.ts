import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@imanifest/database";
import { ZhipuService } from "../common/zhipu.service";
import { QuranApiService, VerseResult } from "../common/quran-api.service";
import { RedisService } from "../common/redis.service";
import { AnalyzeDto } from "./dto/analyze.dto";
import { createHash } from "crypto";

export interface AnalyzeResult {
  manifestationId: string;
  verses: VerseResult[];
  aiSummary: string;
  tasks: string[];
}

export interface ManifestationHistoryItem {
  id: string;
  intentText: string;
  aiSummary: string;
  createdAt: string;
  totalTasks: number;
  completedTasks: number;
  isAchieved: boolean;
}

export interface AnalyzeVisionResult extends AnalyzeResult {
  imagePath: string;
}

const CACHE_TTL = 3600;
const demoManifestationStore = new Map<string, {
  id: string;
  userId: string;
  intentText: string;
  aiSummary: string;
  createdAt: string;
}>();

@Injectable()
export class ImanSyncService {
  private readonly logger = new Logger(ImanSyncService.name);

  private extractQuickThemes(text: string): string[] {
    const source = text.toLowerCase();
    const themes: string[] = [];

    const pick = (pattern: RegExp, theme: string) => {
      if (pattern.test(source) && !themes.includes(theme)) {
        themes.push(theme);
      }
    };

    pick(/sedih|galau|cemas|anxious|takut|kehilangan|down|heavy|gelisah/, 'patience');
    pick(/rezeki|pekerjaan|karier|kerja|usaha|bisnis|job|work|career|money|finance|debt|cicilan/, 'provision');
    pick(/syukur|nikmat|grateful|alhamdulillah/, 'gratitude');
    pick(/tenang|hati|qalb|damai|remembrance|peace/, 'remembrance of Allah');
    pick(/dosa|taubat|ampun|istighfar|repentance/, 'repentance');
    pick(/keluarga|ortu|suami|istri|anak|family/, 'family ties');

    return themes.slice(0, 3);
  }

  private getFallbackVerseKeys(text: string, themes: string[]): string[] {
    const source = `${text} ${themes.join(' ')}`.toLowerCase();

    if (/sedih|cemas|takut|anxious|heavy|loss|kehilangan|galau|gelisah/.test(source)) {
      return ["13:28", "94:5", "94:6"];
    }

    if (/rezeki|pekerjaan|job|career|work|provision|money|finance|cicilan|debt/.test(source)) {
      return ["65:2", "65:3", "2:286"];
    }

    if (/syukur|gratitude|grateful|nikmat/.test(source)) {
      return ["14:7", "2:152", "93:11"];
    }

    if (/taubat|repentance|dosa|ampun|istighfar/.test(source)) {
      return ["39:53", "11:90", "66:8"];
    }

    return ["13:28", "2:286", "94:5"];
  }

  private async getCuratedFallbackVerses(
    text: string,
    themes: string[],
  ): Promise<VerseResult[]> {
    const verseKeys = this.getFallbackVerseKeys(text, themes);
    const seenKeys = new Set<string>();
    const verses: VerseResult[] = [];

    for (const verseKey of verseKeys) {
      if (seenKeys.has(verseKey)) continue;
      seenKeys.add(verseKey);
      const verse = await this.quranApi.getVerseWithTranslation(verseKey);
      if (verse) {
        verses.push(verse);
      }
    }

    return verses;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly zhipu: ZhipuService,
    private readonly quranApi: QuranApiService,
    private readonly redis: RedisService,
  ) {}

  async quickSearch(text: string): Promise<{ verses: VerseResult[] }> {
    try {
      const themes = this.extractQuickThemes(text.substring(0, 140));
      if (themes.length === 0) {
        const fallbackVerses = await this.getCuratedFallbackVerses(text, []);
        return { verses: fallbackVerses };
      }

      const verses = await this.searchVersesForThemes(themes);
      if (verses.length > 0) {
        return { verses };
      }

      const fallbackVerses = await this.getCuratedFallbackVerses(text, themes);
      return { verses: fallbackVerses };
    } catch (err) {
      this.logger.error("Quick search failed", err);
      try {
        const fallbackVerses = await this.getCuratedFallbackVerses(text, []);
        return { verses: fallbackVerses };
      } catch {
        return { verses: [] };
      }
    }
  }

  private hashText(text: string): string {
    return createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
  }

  private async searchVersesForThemes(themes: string[]): Promise<VerseResult[]> {
    this.logger.log(`Searching Quran verses for themes: ${themes.join(", ")}`);

    const allVerses: VerseResult[] = [];
    const seenKeys = new Set<string>();

    const searchResults = await Promise.all(
      themes.map((theme) => this.quranApi.searchVerses(theme, 3)),
    );

    for (const results of searchResults) {
      for (const verse of results) {
        if (!seenKeys.has(verse.verseKey) && allVerses.length < 3) {
          seenKeys.add(verse.verseKey);
          allVerses.push(verse);
        }
      }
      if (allVerses.length >= 3) break;
    }

    if (allVerses.length === 0) {
      this.logger.warn("No verses found from Quran API");
    }

    return allVerses;
  }

  private async buildAndSaveManifestation(params: {
    userId: string;
    intentText: string;
    verses: VerseResult[];
    imagePath?: string;
  }): Promise<{ manifestationId: string; verses: VerseResult[]; aiSummary: string; tasks: string[] }> {
    const { userId, intentText, verses, imagePath } = params;

    this.logger.log("Generating AI summary and tasks...");
    const versesForAI = verses.map((v) => ({
      verseKey: v.verseKey,
      translation: v.translation,
    }));

    const [aiSummary, tasks] = await Promise.all([
      this.zhipu.generateSummary(intentText, versesForAI),
      typeof (this.zhipu as any).generateTasks === "function"
        ? (this.zhipu as any).generateTasks(intentText, versesForAI)
        : Promise.resolve([]),
    ]);

    let manifestationId: string;
    try {
      const manifestation = await this.prisma.manifestation.create({
        data: {
          userId,
          intentText,
          imagePath: imagePath ?? null,
          verses: verses.length > 0 ? (verses as any) : [],
          aiSummary,
        },
      });
      manifestationId = manifestation.id;
      this.logger.log(`Saved manifestation ${manifestationId}`);
    } catch (dbErr: any) {
      manifestationId = `demo-manifest-${Date.now()}`;
      demoManifestationStore.set(manifestationId, {
        id: manifestationId,
        userId,
        intentText,
        aiSummary,
        createdAt: new Date().toISOString(),
      });
      this.logger.warn(
        `DB save failed (demo mode): ${dbErr?.message}. Using in-memory ID: ${manifestationId}`,
      );
    }

    return { manifestationId, verses, aiSummary, tasks };
  }

  async analyze(userId: string, dto: AnalyzeDto): Promise<AnalyzeResult> {
    const cacheKey = `iman-sync:cache:${userId}:${this.hashText(dto.intentText)}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit for intentText hash: ${cacheKey.substring(0, 30)}...`);
        return JSON.parse(cached) as AnalyzeResult;
      }
    } catch (err) {
      this.logger.warn(
        "Cache read failed - continuing with full pipeline",
        err instanceof Error ? err.message : err,
      );
    }

    const startTime = Date.now();
    this.logger.log(`Extracting themes for user ${userId}`);

    const themes = await this.zhipu.extractThemes(dto.intentText);
    this.logger.log(`Themes extracted: ${themes.join(", ")}`);

    const allVerses = await this.searchVersesForThemes(themes);
    const result = await this.buildAndSaveManifestation({
      userId,
      intentText: dto.intentText,
      verses: allVerses,
    });

    const elapsed = Date.now() - startTime;
    this.logger.log(`Analysis complete in ${elapsed}ms - manifestation ${result.manifestationId}`);

    try {
      await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
      this.logger.log(`Cached result for key: ${cacheKey.substring(0, 30)}...`);
    } catch (err) {
      this.logger.warn(
        "Cache write failed - non-critical",
        err instanceof Error ? err.message : err,
      );
    }

    return result;
  }

  async analyzeVision(
    userId: string,
    intentText: string,
    imageBase64: string,
    mimeType: string,
    imagePath: string,
  ): Promise<AnalyzeVisionResult> {
    const visionHash = this.hashText(`${intentText}:${imageBase64}`);
    const cacheKey = `iman-sync:vision:${userId}:${visionHash}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.log(`Vision cache hit for key: ${cacheKey.substring(0, 30)}...`);
        return JSON.parse(cached) as AnalyzeVisionResult;
      }
    } catch (err) {
      this.logger.warn(
        "Vision cache read failed - continuing with full pipeline",
        err instanceof Error ? err.message : err,
      );
    }

    const startTime = Date.now();
    this.logger.log(`Extracting vision themes for user ${userId}`);

    const themes = await this.zhipu.extractThemesVision(intentText, imageBase64, mimeType);
    this.logger.log(`Vision themes extracted: ${themes.join(", ")}`);

    const allVerses = await this.searchVersesForThemes(themes);
    const baseResult = await this.buildAndSaveManifestation({
      userId,
      intentText,
      verses: allVerses,
      imagePath,
    });

    const elapsed = Date.now() - startTime;
    this.logger.log(`Vision analysis complete in ${elapsed}ms - manifestation ${baseResult.manifestationId}`);

    const result = { ...baseResult, imagePath };

    try {
      await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
      this.logger.log(`Cached vision result for key: ${cacheKey.substring(0, 30)}...`);
    } catch (err) {
      this.logger.warn(
        "Vision cache write failed - non-critical",
        err instanceof Error ? err.message : err,
      );
    }

    return result;
  }

  async getHistory(userId: string): Promise<{ manifestations: ManifestationHistoryItem[] }> {
    try {
      const manifestations = await this.prisma.manifestation.findMany({
        where: { userId },
        include: {
          tasks: {
            select: { isCompleted: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      });

      return {
        manifestations: manifestations.map((item) => {
          const completedTasks = item.tasks.filter((task) => task.isCompleted).length;
          const totalTasks = item.tasks.length;
          return {
            id: item.id,
            intentText: item.intentText,
            aiSummary: item.aiSummary || "",
            createdAt: item.createdAt.toISOString(),
            totalTasks,
            completedTasks,
            isAchieved: totalTasks > 0 && completedTasks === totalTasks,
          };
        }),
      };
    } catch (err: any) {
      this.logger.warn(`Manifestation history fallback (demo mode): ${err?.message}`);
      const fallback = Array.from(demoManifestationStore.values())
        .filter((item) => item.userId === userId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, 12)
        .map((item) => ({
          id: item.id,
          intentText: item.intentText,
          aiSummary: item.aiSummary,
          createdAt: item.createdAt,
          totalTasks: 0,
          completedTasks: 0,
          isAchieved: false,
        }));

      return { manifestations: fallback };
    }
  }
}
