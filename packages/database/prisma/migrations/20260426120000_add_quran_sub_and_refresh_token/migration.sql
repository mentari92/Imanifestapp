-- Add permanent Quran Foundation user identifier (sub claim from id_token)
ALTER TABLE "User" ADD COLUMN "quranSub" TEXT;
ALTER TABLE "User" ADD COLUMN "quranRefreshToken" TEXT;

-- quranSub must be unique (one Quran account per app user)
CREATE UNIQUE INDEX "User_quranSub_key" ON "User"("quranSub") WHERE "quranSub" IS NOT NULL;
