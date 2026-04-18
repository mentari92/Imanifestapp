import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@imanifest/database";
import { ZhipuService } from "../common/zhipu.service";
import { QuranApiService } from "../common/quran-api.service";

// In-memory task store for demo mode (no DB)
const demoTaskStore = new Map<string, any[]>();

@Injectable()
export class DuaToDoService {
  private readonly logger = new Logger(DuaToDoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zhipu: ZhipuService,
    private readonly quranApi: QuranApiService,
  ) {}

  /**
   * Generate 5 Ikhtiar action steps from a manifestation.
   * Falls back to in-memory tasks when database is unavailable.
   */
  async generateTasks(userId: string, manifestationId: string) {
    // Check if we already generated demo tasks for this manifestation
    const existingDemoTasks = demoTaskStore.get(manifestationId);
    if (existingDemoTasks) {
      return { tasks: existingDemoTasks };
    }

    let intentText = "Live a meaningful life guided by Islamic principles";
    let verses: { verseKey: string; translation: string }[] = [];
    let quranApiKey = "";

    // Try loading manifestation from DB
    try {
      const manifestation = await this.prisma.manifestation.findFirst({
        where: { id: manifestationId, userId },
        include: { user: { select: { quranApiKey: true } } },
      });

      if (manifestation) {
        intentText = manifestation.intentText;
        verses = (manifestation.verses as { verseKey: string; translation: string }[]) || [];
        quranApiKey = manifestation.user?.quranApiKey || "";
      } else {
        throw new NotFoundException("Manifestation not found");
      }
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      this.logger.warn(
        `DB lookup failed (demo mode): ${err?.message} — generating tasks with default intent`,
      );
    }

    // Generate tasks via AI
    this.logger.log(`Generating tasks for manifestation ${manifestationId}`);
    const taskDescriptions = await this.zhipu.generateTasks(intentText, verses);

    // Try saving to DB, fall back to in-memory
    try {
      const tasks = await Promise.all(
        taskDescriptions.map(async (desc) => {
          const task = await this.prisma.task.create({
            data: {
              manifestationId,
              description: desc,
            },
          });

          // Attempt to post goal to Quran Foundation API
          try {
            const quranGoalId = await this.quranApi.postGoal(quranApiKey, desc);
            if (quranGoalId) {
              return this.prisma.task.update({
                where: { id: task.id },
                data: { quranGoalId },
              });
            }
          } catch (goalErr) {
            this.logger.warn(
              `Failed to post goal for task ${task.id}`,
              goalErr instanceof Error ? goalErr.message : goalErr,
            );
          }

          return task;
        }),
      );

      this.logger.log(`Created ${tasks.length} tasks (DB) for manifestation ${manifestationId}`);
      return { tasks };
    } catch (dbErr: any) {
      this.logger.warn(`DB task save failed (demo mode): ${dbErr?.message}`);

      // Create in-memory tasks
      const now = new Date().toISOString();
      const demoTasks = taskDescriptions.map((desc, i) => ({
        id: `demo-task-${manifestationId}-${i}`,
        manifestationId,
        description: desc,
        isCompleted: false,
        quranGoalId: null,
        createdAt: now,
        updatedAt: now,
      }));

      demoTaskStore.set(manifestationId, demoTasks);
      this.logger.log(`Created ${demoTasks.length} tasks (in-memory) for manifestation ${manifestationId}`);
      return { tasks: demoTasks };
    }
  }

  /**
   * Update task completion status.
   */
  async updateTask(userId: string, taskId: string, isCompleted: boolean) {
    // Check demo task store first
    for (const [, tasks] of demoTaskStore) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        task.isCompleted = isCompleted;
        task.updatedAt = new Date().toISOString();
        return task;
      }
    }

    // Try DB
    try {
      const task = await this.prisma.task.findFirst({
        where: { id: taskId },
        include: { manifestation: true },
      });

      if (!task || task.manifestation.userId !== userId) {
        throw new NotFoundException("Task not found");
      }

      return this.prisma.task.update({
        where: { id: taskId },
        data: { isCompleted },
      });
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.warn(`DB task update failed: ${err instanceof Error ? err.message : err}`);
      throw new NotFoundException("Task not found");
    }
  }

  /**
   * Get all tasks for a manifestation.
   */
  async getTasks(userId: string, manifestationId: string) {
    // Check demo task store first
    const demoTasks = demoTaskStore.get(manifestationId);
    if (demoTasks) {
      return { tasks: demoTasks };
    }

    // Try DB
    try {
      const manifestation = await this.prisma.manifestation.findFirst({
        where: { id: manifestationId, userId },
      });

      if (!manifestation) {
        throw new NotFoundException("Manifestation not found");
      }

      const tasks = await this.prisma.task.findMany({
        where: { manifestationId },
        orderBy: { createdAt: "asc" },
      });

      return { tasks };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.warn(`DB task fetch failed: ${err instanceof Error ? err.message : err}`);
      return { tasks: [] };
    }
  }
}