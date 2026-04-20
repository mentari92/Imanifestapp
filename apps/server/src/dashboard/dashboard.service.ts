import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@imanifest/database';
import { QuranApiService } from '../common/quran-api.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private prisma: PrismaService,
    private quranApiService: QuranApiService,
  ) {}

  async getOverview(userId: string) {
    // Fetch user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    // Fetch stats in parallel
    const [
      totalIntentions,
      totalJournalEntries,
      totalDuaTasks,
      completedDuaTasks,
      streak,
      recentImanSync,
      recentHeartPulse,
    ] = await Promise.all([
      this.prisma.manifestation.count({ where: { userId } }),
      this.prisma.reflection.count({ where: { userId } }),
      this.prisma.task.count({
        where: {
          manifestation: { userId },
        },
      }),
      this.prisma.task.count({
        where: {
          isCompleted: true,
          manifestation: { userId },
        },
      }),
      this.prisma.reflection.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { streakDate: true },
        take: 30,
      }),
      this.prisma.manifestation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, intentText: true, createdAt: true },
        take: 3,
      }),
      this.prisma.reflection.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, transcriptText: true, createdAt: true },
        take: 3,
      }),
    ]);

    const streakCount = Array.isArray(streak)
      ? new Set(streak.map((r: any) => new Date(r.streakDate).toISOString().slice(0, 10))).size
      : 0;

    // Build recent activity list
    const recentActivity = [
      ...recentImanSync.map((r: any) => ({
        id: r.id,
        type: 'imanifest',
        title:
          (r.intentText || '').substring(0, 50) +
          ((r.intentText || '').length > 50 ? '...' : ''),
        createdAt: r.createdAt,
      })),
      ...recentHeartPulse.map((r: any) => ({
        id: r.id,
        type: 'qalb',
        title:
          (r.transcriptText || '').substring(0, 50) +
          ((r.transcriptText || '').length > 50 ? '...' : ''),
        createdAt: r.createdAt,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);

    // Get verse of the day
    let verseOfTheDay = null;
    try {
      const randomVerse = await this.quranApiService.getRandomAyah();
      if (randomVerse) {
        verseOfTheDay = {
          number: randomVerse.number,
          text: randomVerse.text,
          surahName: randomVerse.surah?.englishName || '',
          surahNumber: randomVerse.surah?.number || 0,
          ayahNumber: randomVerse.numberInSurah || 0,
        };
      }
    } catch (error) {
      this.logger.warn(
        `Failed to get verse of the day: ${error instanceof Error ? error.message : error}`,
      );
    }

    return {
      user: user || { id: userId, name: 'Muslim', email: '' },
      stats: {
        totalIntentions,
        totalJournalEntries,
        totalDuaTasks,
        completedDuaTasks,
        currentStreak: streakCount,
        longestStreak: streakCount,
      },
      recentActivity,
      verseOfTheDay,
    };
  }
}