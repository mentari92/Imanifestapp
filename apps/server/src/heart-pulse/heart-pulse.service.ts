import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@imanifest/database";
import { ZhipuService } from "../common/zhipu.service";
import { calculateReflectionStreak } from "../common/streak.util";

/** Quran Foundation User API — configurable, graceful fallback if not set */
const QF_USER_API_URL = process.env.QURAN_FOUNDATION_USER_API_URL || "";
const QF_API_KEY = process.env.QURAN_FOUNDATION_API_KEY || "";

@Injectable()
export class HeartPulseService {
  private readonly logger = new Logger(HeartPulseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zhipu: ZhipuService,
  ) {}

  /** Sync reflection to Quran Foundation User API (stub — graceful no-op if not configured). */
  async syncToQuranFoundation(
    userId: string,
    reflectionData: { transcriptText: string; sentiment: string },
  ): Promise<void> {
    if (!QF_USER_API_URL) {
      this.logger.debug("QF User API not configured — skipping sync");
      return;
    }

    try {
      const response = await fetch(`${QF_USER_API_URL}/reflections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(QF_API_KEY ? { "X-API-Key": QF_API_KEY } : {}),
        },
        body: JSON.stringify({
          userId,
          text: reflectionData.transcriptText,
          sentiment: reflectionData.sentiment,
        }),
      });

      if (!response.ok) {
        this.logger.warn(
          `QF User API sync failed: ${response.status} ${response.statusText}`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `QF User API unavailable: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /**
   * Fetch streak from Quran Foundation User API.
   *
   * ⚠️ INTENTIONAL STUB: This method is declared for future QF API integration.
   * It is NOT called from any controller or service method yet.
   * Will be activated when Quran Foundation User API is ready for integration.
   * See: deferred-work.md
   */
  async fetchQuranFoundationStreak(
    userId: string,
  ): Promise<number | null> {
    if (!QF_USER_API_URL) {
      return null;
    }

    try {
      const response = await fetch(
        `${QF_USER_API_URL}/streak?userId=${userId}`,
        {
          headers: {
            ...(QF_API_KEY ? { "X-API-Key": QF_API_KEY } : {}),
          },
        },
      );

      if (!response.ok) {
        this.logger.warn(
          `QF User API streak fetch failed: ${response.status}`,
        );
        return null;
      }

      const data = await response.json() as { streakCount?: number };
      return typeof data.streakCount === "number" ? data.streakCount : null;
    } catch (err) {
      this.logger.warn(
        `QF User API streak unavailable: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  /** Process a text reflection — sentiment analysis + save. */
  async reflectText(userId: string, transcriptText: string) {
    return this.processReflection(userId, { transcriptText });
  }

  /** Process a voice reflection — save audio path + transcript + sentiment. */
  async reflectVoice(userId: string, audioPath: string, transcriptText: string) {
    return this.processReflection(userId, { transcriptText, audioPath });
  }

  /** Shared pipeline for both text and voice reflections. */
  private async processReflection(
    userId: string,
    data: { transcriptText: string; audioPath?: string },
  ) {
    const startTime = Date.now();
    const mode = data.audioPath ? "voice" : "text";

    this.logger.log(`Analyzing ${mode} sentiment for user ${userId}`);
    const { label, score } = await this.zhipu.analyzeSentiment(data.transcriptText);

    const reflection = await this.prisma.reflection.create({
      data: {
        userId,
        transcriptText: data.transcriptText,
        audioPath: data.audioPath ?? null,
        sentiment: label,
        sentimentScore: score,
      },
    });

    const streakCount = await calculateReflectionStreak(this.prisma, userId);

    // Fire-and-forget sync to Quran Foundation (don't block response)
    this.syncToQuranFoundation(userId, {
      transcriptText: data.transcriptText,
      sentiment: label,
    }).catch(() => {});

    const elapsed = Date.now() - startTime;
    this.logger.log(`${mode} reflection complete in ${elapsed}ms — ${label} (${score})`);

    return {
      reflection: {
        id: reflection.id,
        userId: reflection.userId,
        audioPath: reflection.audioPath,
        transcriptText: reflection.transcriptText,
        sentiment: reflection.sentiment,
        sentimentScore: reflection.sentimentScore,
        streakDate: reflection.streakDate,
        createdAt: reflection.createdAt,
      },
      sentiment: label,
      sentimentScore: score,
      streakCount,
    };
  }

  /** Get reflection history for user. */
  async getHistory(userId: string) {
    const reflections = await this.prisma.reflection.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const streakCount = await calculateReflectionStreak(this.prisma, userId);

    return { reflections, streakCount };
  }
}