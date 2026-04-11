import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
}

export interface AnalyzeVisionResult extends AnalyzeResult {
  imagePath: string;
}

const CACHE_TTL = 3600; // 1 hour

/**
 * ImanSync service — orchestrates text and vision analysis flows:
 * 1. Check Redis cache for existing result (text only)
 * 2. Extract themes from intent via GLM-5 / GLM-5V
 * 3. Search Quran verses matching themes
 * 4. Generate AI summary via GLM-5
 * 5. Save to Manifestation table
 * 6. Cache result in Redis (text only)
 */
@Injectable()
export class ImanSyncService {
  private readonly logger = new Logger(ImanSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zhipu: ZhipuService,
    private readonly quranApi: QuranApiService,
    private readonly redis: RedisService,
  ) {}

  private hashText(text: string): string {
    return createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
  }

  /**
   * Search Quran verses for given themes, returning up to 3 unique results.
   */
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

  /**
   * Shared pipeline: generate summary, save manifestation, build result.
   */
  private async buildAndSaveManifestation(params: {
    userId: string;
    intentText: string;
    verses: VerseResult[];
    imagePath?: string;
  }): Promise<{ manifestationId: string; verses: VerseResult[]; aiSummary: string }> {
    const { userId, intentText, verses, imagePath } = params;

    // Generate AI summary
    this.logger.log("Generating AI summary...");
    const aiSummary = await this.zhipu.generateSummary(
      intentText,
      verses.map((v) => ({ verseKey: v.verseKey, translation: v.translation })),
    );

    // Save to Manifestation table
    const manifestation = await this.prisma.manifestation.create({
      data: {
        userId,
        intentText,
        imagePath: imagePath ?? null,
        verses: verses.length > 0 ? (verses as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        aiSummary,
      },
    });

    this.logger.log(`Saved manifestation ${manifestation.id}`);

    return { manifestationId: manifestation.id, verses, aiSummary };
  }

  /**
   * Full ImanSync text analysis pipeline with caching.
   * Target: < 8 seconds response time, < 200ms on cache hit.
   */
  async analyze(userId: string, dto: AnalyzeDto): Promise<AnalyzeResult> {
    // Check cache first — include userId to ensure data isolation
    const cacheKey = `iman-sync:cache:${userId}:${this.hashText(dto.intentText)}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit for intentText hash: ${cacheKey.substring(0, 30)}...`);
        return JSON.parse(cached) as AnalyzeResult;
      }
    } catch (err) {
      this.logger.warn("Cache read failed — continuing with full pipeline", err instanceof Error ? err.message : err);
    }

    const startTime = Date.now();

    // Step 1: Extract spiritual themes from intent text
    this.logger.log(`Extracting themes for user ${userId}`);
    const themes = await this.zhipu.extractThemes(dto.intentText);
    this.logger.log(`Themes extracted: ${themes.join(", ")}`);

    // Step 2: Search Quran verses
    const allVerses = await this.searchVersesForThemes(themes);

    // Step 3+4: Generate summary + save manifestation
    const result = await this.buildAndSaveManifestation({
      userId,
      intentText: dto.intentText,
      verses: allVerses,
    });

    const elapsed = Date.now() - startTime;
    this.logger.log(`Analysis complete in ${elapsed}ms — manifestation ${result.manifestationId}`);

    // Cache the result
    try {
      await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
      this.logger.log(`Cached result for key: ${cacheKey.substring(0, 30)}...`);
    } catch (err) {
      this.logger.warn("Cache write failed — non-critical", err instanceof Error ? err.message : err);
    }

    return result;
  }

  /**
   * ImanSync vision analysis pipeline — image + text via GLM-5V.
   * Target: < 12 seconds response time.
   */
  async analyzeVision(
    userId: string,
    intentText: string,
    imageBase64: string,
    mimeType: string,
    imagePath: string,
  ): Promise<AnalyzeVisionResult> {
    const startTime = Date.now();

    // Step 1: Extract spiritual themes from image + text via GLM-5V
    this.logger.log(`Extracting vision themes for user ${userId}`);
    const themes = await this.zhipu.extractThemesVision(intentText, imageBase64, mimeType);
    this.logger.log(`Vision themes extracted: ${themes.join(", ")}`);

    // Step 2: Search Quran verses
    const allVerses = await this.searchVersesForThemes(themes);

    // Step 3+4: Generate summary + save manifestation
    const baseResult = await this.buildAndSaveManifestation({
      userId,
      intentText,
      verses: allVerses,
      imagePath,
    });

    const elapsed = Date.now() - startTime;
    this.logger.log(`Vision analysis complete in ${elapsed}ms — manifestation ${baseResult.manifestationId}`);

    return { ...baseResult, imagePath };
  }
}