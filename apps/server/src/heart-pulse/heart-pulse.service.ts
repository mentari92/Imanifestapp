import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@imanifest/database";
import { ZhipuService } from "../common/zhipu.service";

/** Allow up to 36h gap between reflection days for timezone flexibility */
const STREAK_TOLERANCE_DAYS = 1.5;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class HeartPulseService {
  private readonly logger = new Logger(HeartPulseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zhipu: ZhipuService,
  ) {}

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

    const streakCount = await this.calculateStreak(userId);

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

  /** Calculate current streak for user. */
  private async calculateStreak(userId: string): Promise<number> {
    const reflections = await this.prisma.reflection.findMany({
      where: { userId },
      orderBy: { streakDate: "desc" },
      take: 365,
    });

    if (reflections.length === 0) return 0;

    let streak = 1;

    for (let i = 1; i < reflections.length; i++) {
      const diff =
        new Date(reflections[i - 1].streakDate).getTime() -
        new Date(reflections[i].streakDate).getTime();

      if (diff <= ONE_DAY_MS * STREAK_TOLERANCE_DAYS) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /** Get reflection history for user. */
  async getHistory(userId: string) {
    const reflections = await this.prisma.reflection.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const streakCount = await this.calculateStreak(userId);

    return { reflections, streakCount };
  }
}