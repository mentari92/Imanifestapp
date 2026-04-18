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

export interface AnalyzeVisionResult extends AnalyzeResult {
  imagePath: string;
}

const CACHE_TTL = 3600;

@Injectable()
export class ImanSyncService {
  private readonly logger = new Logger(ImanSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zhipu: ZhipuService,
    private readonly quranApi: QuranApiService,
    private readonly redis: RedisService,
  ) {}

  async quickSearch(text: string): Promise<{ verses: VerseResult[] }> {
    try {
      const themes = await this.zhipu.extractThemes(text.substring(0, 140));
      if (themes.length === 0) return { verses: [] };

      const verses = await this.quranApi.searchVerses(themes[0], 2, {
        includeTafsir: false,
      });
      return { verses };
    } catch (err) {
      this.logger.error("Quick search failed", err);
      return { verses: [] };
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
}
