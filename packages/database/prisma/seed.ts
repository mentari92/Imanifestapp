import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create a demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@imanifest.app" },
    update: {},
    create: {
      email: "demo@imanifest.app",
      name: "Demo User",
    },
  });

  console.log(`✅ User created: ${user.email}`);

  // Create a sample manifestation
  const manifestation = await prisma.manifestation.create({
    data: {
      userId: user.id,
      intentText:
        "I intend to memorize Surah Al-Mulk to strengthen my connection with Allah before sleeping.",
      aiSummary:
        "Your intention aligns with the Prophet's recommendation to recite Al-Mulk before sleep. This surah protects and intercedes for the believer.",
      verses: {
        verses: [
          {
            reference: "67:1",
            arabic: "تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ",
            translation:
              "Blessed is He in whose hand is the dominion, and He is over all things competent.",
          },
        ],
      },
    },
  });

  console.log(`✅ Manifestation created: ${manifestation.id}`);

  // Create sample tasks for the manifestation
  await prisma.task.createMany({
    data: [
      {
        manifestationId: manifestation.id,
        description: "Listen to Surah Al-Mulk recitation by Mishary Alafasi",
      },
      {
        manifestationId: manifestation.id,
        description: "Read translation and tafsir of verses 1-10",
      },
      {
        manifestationId: manifestation.id,
        description: "Practice reciting verses 1-5 from memory",
      },
      {
        manifestationId: manifestation.id,
        description: "Write reflection on the meaning of Al-Mulk",
      },
      {
        manifestationId: manifestation.id,
        description: "Recite Surah Al-Mulk from memory before sleep",
      },
    ],
  });

  console.log("✅ 5 tasks created");

  // Create a sample reflection
  await prisma.reflection.create({
    data: {
      userId: user.id,
      transcriptText:
        "Today I felt grateful for the ability to memorize Quran. I struggled with verse 3 but I will keep trying.",
      sentiment: "grateful",
      sentimentScore: 0.85,
    },
  });

  console.log("✅ Reflection created");
  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });