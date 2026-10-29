-- Each user's own data and settings. Everything that existed before belongs to
-- the first admin (the lowest-id ADMIN, "admin" after the users migration).

-- CreateTable
CREATE TABLE "UserConfig" (
    "userId" INTEGER NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserConfig_pkey" PRIMARY KEY ("userId","key")
);

-- AddForeignKey
ALTER TABLE "UserConfig" ADD CONSTRAINT "UserConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The first admin's search options, Google Sheet and profile move to their own settings.
INSERT INTO "UserConfig" ("userId", "key", "value")
SELECT (SELECT MIN("id") FROM "User" WHERE "role" = 'ADMIN'), "key", "value"
FROM "AppConfig"
WHERE "key" IN (
    'target_market', 'current_location', 'job_analysis_prompt', 'profile_in_matching', 'candidate_profile',
    'review_band_min', 'review_band_max', 'followup_days', 'google_sheet_id', 'linkedin_sheet_tab', 'sheet_columns'
);

-- An install that never saved these used the old built-in defaults; keep them.
INSERT INTO "UserConfig" ("userId", "key", "value")
SELECT (SELECT MIN("id") FROM "User" WHERE "role" = 'ADMIN'), d."key", d."value"
FROM (VALUES ('target_market', 'Europe, Eastern Europe, Remote worldwide'), ('current_location', 'Armenia')) AS d("key", "value")
WHERE EXISTS (SELECT 1 FROM "ScrapedJob")
ON CONFLICT ("userId", "key") DO NOTHING;

-- AlterTable: every job belongs to a user.
ALTER TABLE "ScrapedJob" ADD COLUMN "userId" INTEGER;
UPDATE "ScrapedJob" SET "userId" = (SELECT MIN("id") FROM "User" WHERE "role" = 'ADMIN');
ALTER TABLE "ScrapedJob" ALTER COLUMN "userId" SET NOT NULL;

-- DropIndex: duplicates are now checked per user.
DROP INDEX "ScrapedJob_platform_url_key";
DROP INDEX "ScrapedJob_platform_title_company_key";

-- CreateIndex
CREATE UNIQUE INDEX "ScrapedJob_userId_platform_url_key" ON "ScrapedJob"("userId", "platform", "url");
CREATE UNIQUE INDEX "ScrapedJob_userId_platform_title_company_key" ON "ScrapedJob"("userId", "platform", "title", "company");
CREATE INDEX "ScrapedJob_userId_status_createdAt_idx" ON "ScrapedJob"("userId", "status", "createdAt");
CREATE INDEX "ScrapedJob_userId_stage_idx" ON "ScrapedJob"("userId", "stage");

-- AddForeignKey
ALTER TABLE "ScrapedJob" ADD CONSTRAINT "ScrapedJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: resumes and saved answers belong to a user.
ALTER TABLE "Resume" ADD COLUMN "userId" INTEGER;
UPDATE "Resume" SET "userId" = (SELECT MIN("id") FROM "User" WHERE "role" = 'ADMIN');
ALTER TABLE "Resume" ALTER COLUMN "userId" SET NOT NULL;
CREATE INDEX "Resume_userId_idx" ON "Resume"("userId");
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SavedAnswer" ADD COLUMN "userId" INTEGER;
UPDATE "SavedAnswer" SET "userId" = (SELECT MIN("id") FROM "User" WHERE "role" = 'ADMIN');
ALTER TABLE "SavedAnswer" ALTER COLUMN "userId" SET NOT NULL;
CREATE INDEX "SavedAnswer_userId_idx" ON "SavedAnswer"("userId");
ALTER TABLE "SavedAnswer" ADD CONSTRAINT "SavedAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: a skip rule belongs to a user, or to everyone when userId is null.
-- The existing rules were the first admin's own.
ALTER TABLE "SkipRule" ADD COLUMN "userId" INTEGER;
UPDATE "SkipRule" SET "userId" = (SELECT MIN("id") FROM "User" WHERE "role" = 'ADMIN');
CREATE INDEX "SkipRule_userId_idx" ON "SkipRule"("userId");
ALTER TABLE "SkipRule" ADD CONSTRAINT "SkipRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- With no rules saved, the old version used a built-in list. It becomes the
-- first admin's own rules, so their scans keep skipping the same jobs.
INSERT INTO "SkipRule" ("userId", "type", "pattern")
SELECT (SELECT MIN("id") FROM "User" WHERE "role" = 'ADMIN'), r."type"::"SkipRuleType", r."pattern"
FROM (VALUES
    ('TITLE', 'vice president'),
    ('URL', 'nvidia'), ('URL', 'redhat'), ('URL', 'pinterest'), ('URL', 'metacareer'), ('URL', 'alignerr'),
    ('URL', 'capitalone'), ('URL', 'hackajob'), ('URL', 'generalmotors'), ('URL', 'allstate'), ('URL', 'micro1'),
    ('URL', 'expedia'), ('URL', 'reddit'), ('URL', 'horizontaltalent'), ('URL', 'fleetai.com'), ('URL', 'shieldai'),
    ('URL', 'metacareers'), ('URL', 'dayforcehcm'), ('URL', 'griddynamics'), ('URL', 'www.usajobs.gov'),
    ('URL', 'usajobs.gov'), ('URL', 'gdit'), ('URL', 'hopper'), ('URL', 'libertymutualgroup'), ('URL', 'smarterdx'),
    ('URL', 'caci'),
    ('COMPANY', 'Alignerr'), ('COMPANY', 'NVIDIA'), ('COMPANY', 'Pinterest'), ('COMPANY', 'Meta'),
    ('COMPANY', 'Innovaccer'), ('COMPANY', 'PathAI'), ('COMPANY', 'Instacart')
) AS r("type", "pattern")
WHERE NOT EXISTS (SELECT 1 FROM "SkipRule") AND EXISTS (SELECT 1 FROM "ScrapedJob");

-- AlterTable: logs and AI usage remember whose work they were.
ALTER TABLE "ScanLog" ADD COLUMN "userId" INTEGER;
UPDATE "ScanLog" SET "userId" = (SELECT MIN("id") FROM "User" WHERE "role" = 'ADMIN');
ALTER TABLE "AiUsage" ADD COLUMN "userId" INTEGER;
UPDATE "AiUsage" SET "userId" = (SELECT MIN("id") FROM "User" WHERE "role" = 'ADMIN');
CREATE INDEX "AiUsage_userId_createdAt_idx" ON "AiUsage"("userId", "createdAt");
ALTER TABLE "ExtensionLog" ADD COLUMN "userId" INTEGER;
UPDATE "ExtensionLog" SET "userId" = (SELECT MIN("id") FROM "User" WHERE "role" = 'ADMIN');

-- Done once: /api/setup must not give later rules and logs without a user
-- ("everyone" / app-wide) to the first admin again.
INSERT INTO "AppConfig" ("key", "value") VALUES ('user_data_migrated', '1')
ON CONFLICT ("key") DO NOTHING;
