import { PrismaService } from "@imanifest/database";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const STREAK_TOLERANCE_DAYS = 1.5;
const STREAK_LOOKBACK_DAYS = 35;

/**
 * Calculate consecutive-day streak from reflections.
 * Shared utility used by both Qalb and Dashboard services.
 *
 * Uses `streakDate` field with a 36h tolerance between days
 * for timezone flexibility.
 */
export async function calculateReflectionStreak(
  prisma: PrismaService,
  userId: string,
): Promise<number> {
  const lookbackDate = new Date(Date.now() - STREAK_LOOKBACK_DAYS * ONE_DAY_MS);

  const reflections = await prisma.reflection.findMany({
    where: {
      userId,
      streakDate: { gte: lookbackDate },
    },
    orderBy: { streakDate: "desc" },
    take: STREAK_LOOKBACK_DAYS,
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