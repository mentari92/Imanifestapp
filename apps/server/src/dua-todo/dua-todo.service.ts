import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@imanifest/database";
import { ZhipuService } from "../common/zhipu.service";
import { QuranApiService } from "../common/quran-api.service";

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
   * After saving each task, attempt to post it as a Goal to Quran Foundation API.
   */
  async generateTasks(userId: string, manifestationId: string) {
    // Load manifestation with ownership check
    const manifestation = await this.prisma.manifestation.findFirst({
      where: { id: manifestationId, userId },
      include: { user: { select: { quranApiKey: true } } },
    });

    if (!manifestation) {
      throw new NotFoundException("Manifestation not found");
    }

    // Parse verses from JSON
    const verses = (manifestation.verses as Array<{ verseKey: string; translation: string }>) || [];

    // Generate tasks via GLM-5
    this.logger.log(`Generating tasks for manifestation ${manifestationId}`);
    const taskDescriptions = await this.zhipu.generateTasks(
      manifestation.intentText,
      verses,
    );

    // Save tasks to DB and post to Quran Goals API
    const quranApiKey = manifestation.user?.quranApiKey || "";

    const tasks = await Promise.all(
      taskDescriptions.map(async (desc) => {
        const task = await this.prisma.task.create({
          data: {
            manifestationId,
            description: desc,
          },
        });

        // Attempt to post goal to Quran Foundation API (graceful fallback)
        try {
          const quranGoalId = await this.quranApi.postGoal(quranApiKey, desc);
          if (quranGoalId) {
            const updated = await this.prisma.task.update({
              where: { id: task.id },
              data: { quranGoalId },
            });
            return updated;
          }
        } catch (err) {
          this.logger.warn(
            `Failed to post goal for task ${task.id} — continuing without quranGoalId`,
            err instanceof Error ? err.message : err,
          );
        }

        return task;
      }),
    );

    this.logger.log(`Created ${tasks.length} tasks for manifestation ${manifestationId}`);

    return { tasks };
  }

  /**
   * Update task completion status.
   */
  async updateTask(userId: string, taskId: string, isCompleted: boolean) {
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
  }

  /**
   * Get all tasks for a manifestation.
   */
  async getTasks(userId: string, manifestationId: string) {
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
  }
}