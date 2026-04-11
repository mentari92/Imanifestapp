import { Injectable } from "@nestjs/common";
import { PrismaService } from "@imanifest/database";
import { calculateReflectionStreak } from "../common/streak.util";

interface ManifestationWithTasks {
  id: string;
  intentText: string;
  createdAt: Date;
  tasks: { isCompleted: boolean }[];
}

interface SentimentDay {
  date: string;
  sentiment: string;
  score: number;
}

export interface DashboardOverview {
  stats: {
    totalManifestations: number;
    totalTasks: number;
    completedTasks: number;
    currentStreak: number;
  };
  sentiment7Days: SentimentDay[];
  manifestations: {
    id: string;
    title: string;
    createdAt: string;
    taskTotal: number;
    taskCompleted: number;
    completionPct: number;
  }[];
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId: string): Promise<DashboardOverview> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // ─── Parallel DB queries ──────────────────────────────
    const [
      manifestationCount,
      totalTaskCount,
      completedTaskCount,
      currentStreak,
      recentReflections,
      manifestations,
    ] = await Promise.all([
      this.prisma.manifestation.count({ where: { userId } }),
      this.prisma.task.count({ where: { manifestation: { userId } } }),
      this.prisma.task.count({ where: { manifestation: { userId }, isCompleted: true } }),
      calculateReflectionStreak(this.prisma, userId),
      this.prisma.reflection.findMany({
        where: { userId, createdAt: { gte: sevenDaysAgo }, sentiment: { not: null } },
        orderBy: { createdAt: "asc" },
        select: { sentiment: true, sentimentScore: true, createdAt: true },
      }),
      this.prisma.manifestation.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, intentText: true, createdAt: true, tasks: { select: { isCompleted: true } } },
      }),
    ]);

    // ─── Assemble response ────────────────────────────────
    const sentiment7Days: SentimentDay[] = recentReflections.map((r) => ({
      date: r.createdAt.toISOString().slice(0, 10),
      sentiment: r.sentiment!,
      score: r.sentimentScore ?? 0.5,
    }));

    const manifestationList = manifestations.map((m: ManifestationWithTasks) => {
      const taskTotal = m.tasks.length;
      const taskCompleted = m.tasks.filter((t) => t.isCompleted).length;
      return {
        id: m.id,
        title: m.intentText.slice(0, 50) + (m.intentText.length > 50 ? "…" : ""),
        createdAt: m.createdAt.toISOString(),
        taskTotal,
        taskCompleted,
        completionPct: taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 100) : 0,
      };
    });

    return {
      stats: {
        totalManifestations: manifestationCount,
        totalTasks: totalTaskCount,
        completedTasks: completedTaskCount,
        currentStreak,
      },
      sentiment7Days,
      manifestations: manifestationList,
    };
  }
}
