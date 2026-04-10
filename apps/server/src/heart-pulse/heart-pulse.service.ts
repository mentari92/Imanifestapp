import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@imanifest/database";
import { ZhipuService } from "../common/zhipu.service";

@Injectable()
export class HeartPulseService {
  private readonly logger = new Logger(HeartPulseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zhipu: ZhipuService,
  ) {}

  /**
   * Process a text reflection — sentiment analysis + save.
   */
  async reflectText(userId: string, transcriptText: string) {
    const startTime = Date.now();

    // Analyze sentiment
    this.logger.log(`Analyzing sentiment for user ${userId}`);
    const { label, score } = await this.zhipu.analyzeSentiment(transcriptText);

    // Save reflection
    const reflection = await this.prisma.reflection.create({
      data: {
        userId,
        transcriptText,
        sentiment: label,
        sentimentScore: score,
      },
    });

    // Get streak count
    const streakCount = await this.calculateStreak(userId);

    const elapsed = Date.now() - startTime;
    this.logger.log(`Reflection complete in ${elapsed}ms — ${label} (${score})`);

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

  /**
   * Process a voice reflection — save audio path + transcribe + sentiment.
   */
  async reflectVoice(
    userId: string,
    audioPath: string,
    transcriptText: string,
  ) {
    const startTime = Date.now();

    // Analyze sentiment on transcript
    this.logger.log(`Analyzing voice sentiment for user ${userId}`);
    const { label, score } = await this.zhipu.analyzeSentiment(transcriptText);

    // Save reflection
    const reflection = await this.prisma.reflection.create({
      data: {
        userId,
        audioPath,
        transcriptText,
        sentiment: label,
        sentimentScore: score,
      },
    });

    const streakCount = await this.calculateStreak(userId);

    const elapsed = Date.now() - startTime;
    this.logger.log(`Voice reflection complete in ${elapsed}ms`);

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

  /**
   * Calculate current streak for user.
   */
  private async calculateStreak(userId: string): Promise<number> {
    const reflections = await this.prisma.reflection.findMany({
      where: { userId },
      orderBy: { streakDate: "desc" },
      take: 365, // max lookback
    });

    if (reflections.length === 0) return 0;

    let streak = 1;
    const oneDayMs = 24 * 60 * 60 * 1000;

    for (let i = 1; i < reflections.length; i++) {
      const diff =
        new Date(reflections[i - 1].streakDate).getTime() -
        new Date(reflections[i].streakDate).getTime();

      if (diff <= oneDayMs * 1.5) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Get reflection history for user.
   */
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