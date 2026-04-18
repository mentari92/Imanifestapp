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
  private static readonly INSIGHT_TIMEOUT_MS = 9000;
  private static readonly INSIGHT_FALLBACK = {
    spiritual: "May Allah grant your heart peace.",
    tafsir: "Reflecting on one's state is a form of ibadah that brings tranquility.",
    scientific:
      "Neural studies suggest that focused prayer or meditation activates the frontal lobes associated with calm.",
    hadith: [
      {
        reference: "Sahih Muslim 2699",
        text: "Whoever relieves a believer's distress, Allah will relieve his distress on the Day of Resurrection.",
      },
      {
        reference: "Sunan Ibn Majah 4241",
        text: "The most beloved deeds to Allah are those that are consistent, even if small.",
      },
    ],
  };

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

    this.logger.log(`Analyzing ${mode} sentiment and generating insight for user ${userId}`);
    const [sentimentResult, insight] = await Promise.all([
      this.zhipu.analyzeSentiment(data.transcriptText),
      this.generateReflectionInsightWithTimeout(data.transcriptText, "uncertain"),
    ]);
    
    const { label, score } = sentimentResult;

    let reflection: any;
    let streakCount = 0;

    try {
      reflection = await this.prisma.reflection.create({
        data: {
          userId,
          transcriptText: data.transcriptText,
          audioPath: data.audioPath ?? null,
          sentiment: label,
          sentimentScore: score,
          // If schema supports it, save the insight. For now (demo), we return it dynamically.
        },
      });
      streakCount = await calculateReflectionStreak(this.prisma, userId);
    } catch (dbErr: any) {
      this.logger.warn(`DB save failed (demo mode): ${dbErr?.message}`);
      // Create in-memory reflection for demo
      reflection = {
        id: `demo-reflection-${Date.now()}`,
        userId,
        audioPath: data.audioPath ?? null,
        transcriptText: data.transcriptText,
        sentiment: label,
        sentimentScore: score,
        streakDate: new Date(),
        createdAt: new Date(),
      };
      streakCount = 1;
    }

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
      aiInsight: {
        spiritual: insight.spiritual,
        tafsir:    insight.tafsir,
        scientific: insight.scientific,
        hadith: insight.hadith,
      },
    };
  }

  /**
   * Ensure reflection endpoint remains responsive even when external AI is slow.
   */
  private async generateReflectionInsightWithTimeout(
    transcriptText: string,
    sentiment: string,
  ): Promise<{
    spiritual: string;
    tafsir: string;
    scientific: string;
    hadith: Array<{ reference: string; text: string }>;
  }> {
    try {
      return await Promise.race([
        this.zhipu.generateReflectionInsight(transcriptText, sentiment),
        new Promise<{
          spiritual: string;
          tafsir: string;
          scientific: string;
          hadith: Array<{ reference: string; text: string }>;
        }>((resolve) => {
          setTimeout(() => {
            this.logger.warn(
              `Reflection insight timed out after ${HeartPulseService.INSIGHT_TIMEOUT_MS}ms, using fallback`,
            );
            resolve(HeartPulseService.INSIGHT_FALLBACK);
          }, HeartPulseService.INSIGHT_TIMEOUT_MS);
        }),
      ]);
    } catch (err) {
      this.logger.warn(
        `Reflection insight failed, using fallback: ${err instanceof Error ? err.message : err}`,
      );
      return HeartPulseService.INSIGHT_FALLBACK;
    }
  }

  /** Get reflection history for user. */
  async getHistory(userId: string) {
    try {
      const reflections = await this.prisma.reflection.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
      });

      const streakCount = await calculateReflectionStreak(this.prisma, userId);
      return { reflections, streakCount };
    } catch (err: any) {
      this.logger.warn(`DB history fetch failed (demo mode): ${err?.message}`);
      return { reflections: [], streakCount: 0 };
    }
  }
}