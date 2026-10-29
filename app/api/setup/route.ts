import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { describeDbError } from "@/lib/dbErrors";
import { DEFAULT_ANALYSIS_PROMPT } from "@/lib/defaultPrompt";
import { LEGACY_ADMIN_PASSWORD_KEY } from "@/lib/config";
import { invalidateUserCache } from "@/lib/users";

export const dynamic = "force-dynamic";

const DEFAULT_SHEET_COLUMNS = JSON.stringify([
  { key: "title", label: "Title" },
  { key: "company", label: "Company" },
  { key: "location", label: "Location" },
  { key: "url", label: "URL" },
  { key: "platform", label: "Source" },
  { key: "aiScore", label: "AI Score" },
  { key: "techStack", label: "Tech Stack" },
  { key: "salary", label: "Salary" },
  { key: "createdAt", label: "Date Found" },
]);

// Idempotent schema evolution for databases created by an older version of
// this route (or migrated before a new table/column existed). Every statement
// is safe to re-run; a failing one is skipped so the rest still apply.
const EVOLUTION_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "ExtensionLog" (
    "id" SERIAL NOT NULL,
    "level" VARCHAR(20) NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "sessionId" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExtensionLog_pkey" PRIMARY KEY ("id")
  );`,
  `ALTER TABLE "ScrapedJob" ADD COLUMN IF NOT EXISTS "manualApplyUrl" VARCHAR(2048);`,
  `ALTER TABLE "ScrapedJob" ADD COLUMN IF NOT EXISTS "applyMethod" VARCHAR(20);`,
  `CREATE TABLE IF NOT EXISTS "AiUsage" (
    "id" SERIAL NOT NULL,
    "task" VARCHAR(30) NOT NULL,
    "provider" VARCHAR(30) NOT NULL,
    "model" VARCHAR(120) NOT NULL,
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheWriteTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE INDEX IF NOT EXISTS "AiUsage_createdAt_idx" ON "AiUsage"("createdAt");`,
  `CREATE INDEX IF NOT EXISTS "AiUsage_provider_createdAt_idx" ON "AiUsage"("provider", "createdAt");`,
  // Pipeline, feedback and signals on jobs.
  `ALTER TABLE "ScrapedJob" ADD COLUMN IF NOT EXISTS "stage" VARCHAR(20);`,
  `ALTER TABLE "ScrapedJob" ADD COLUMN IF NOT EXISTS "stageUpdatedAt" TIMESTAMP(3);`,
  `ALTER TABLE "ScrapedJob" ADD COLUMN IF NOT EXISTS "appliedAt" TIMESTAMP(3);`,
  `ALTER TABLE "ScrapedJob" ADD COLUMN IF NOT EXISTS "followUpAt" TIMESTAMP(3);`,
  `ALTER TABLE "ScrapedJob" ADD COLUMN IF NOT EXISTS "notes" TEXT;`,
  `ALTER TABLE "ScrapedJob" ADD COLUMN IF NOT EXISTS "resumeId" INTEGER;`,
  `ALTER TABLE "ScrapedJob" ADD COLUMN IF NOT EXISTS "applicationData" TEXT;`,
  `ALTER TABLE "ScrapedJob" ADD COLUMN IF NOT EXISTS "feedback" INTEGER;`,
  `ALTER TABLE "ScrapedJob" ADD COLUMN IF NOT EXISTS "feedbackAt" TIMESTAMP(3);`,
  `ALTER TABLE "ScrapedJob" ADD COLUMN IF NOT EXISTS "eligibility" VARCHAR(30);`,
  `ALTER TABLE "ScrapedJob" ADD COLUMN IF NOT EXISTS "signals" TEXT;`,
  `CREATE INDEX IF NOT EXISTS "ScrapedJob_stage_idx" ON "ScrapedJob"("stage");`,
  `CREATE INDEX IF NOT EXISTS "ScrapedJob_status_createdAt_idx" ON "ScrapedJob"("status", "createdAt");`,
  // Profile & resumes.
  `CREATE TABLE IF NOT EXISTS "Resume" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "textContent" TEXT,
    "parsed" TEXT,
    "tags" VARCHAR(500),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE TABLE IF NOT EXISTS "SavedAnswer" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "tags" VARCHAR(300),
    "uses" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedAnswer_pkey" PRIMARY KEY ("id")
  );`,
  // Users: everyone signs in with a user ID and password.
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(40) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "role" VARCHAR(10) NOT NULL DEFAULT 'USER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");`,
];

async function applyEvolution(): Promise<string[]> {
  const applied: string[] = [];
  for (const sql of EVOLUTION_STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
      applied.push(sql.split("\n")[0].trim());
    } catch {
      // Skip a failing statement so the rest (and seedDefaults) still run.
    }
  }
  return applied;
}

// The first run after users arrived creates the first admin, user ID "admin".
// On an upgraded install they keep the old admin password (hashed at their
// first sign-in); on a new install the password is "admin" until changed.
async function bootstrapAdmin(): Promise<string | null> {
  if ((await prisma.user.count()) > 0) return null;
  const legacy = await prisma.appConfig.findUnique({ where: { key: LEGACY_ADMIN_PASSWORD_KEY } });
  await prisma.user.create({
    data: { username: "admin", name: "Admin", role: "ADMIN", passwordHash: legacy?.value ?? "" },
  });
  invalidateUserCache();
  return legacy?.value
    ? 'Created the first admin: user ID "admin" with your current admin password.'
    : 'Created the first admin: user ID "admin", password "admin". Change it in Settings.';
}

async function seedDefaults() {
  const defaults: Record<string, string> = {
    // Default to rotating across the four free providers; keys can be filled in
    // one at a time. ai_provider is kept for backward compatibility only.
    ai_provider: "gemini",
    ai_providers: '["gemini","groq","cerebras","openrouter"]',
    gemini_model: "gemini-2.5-flash",
    openrouter_model: "auto",
    openrouter_tier: "auto",
    openrouter_paid_model: "meta-llama/llama-3.1-8b-instruct",
    cloudflare_model: "@cf/meta/llama-3.1-8b-instruct",
    target_market: "Europe, Eastern Europe, Remote worldwide",
    current_location: "Armenia",
    job_analysis_prompt: DEFAULT_ANALYSIS_PROMPT,
    sheet_columns: DEFAULT_SHEET_COLUMNS,
    linkedin_sheet_tab: "LinkedIn",
    // The extension must authenticate; a fresh install gets a random key the
    // admin reveals in Settings and pastes into the popup.
    extension_api_key: `jf_${randomBytes(24).toString("hex")}`,
  };

  for (const [key, value] of Object.entries(defaults)) {
    await prisma.appConfig.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
}

export async function GET() {
  try {
    const hasTable = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'AppConfig'
      )
    `;

    if (hasTable[0]?.exists) {
      const appliedAlters = await applyEvolution();
      const users = await bootstrapAdmin();
      await seedDefaults();
      return NextResponse.json({
        status: "already_initialized",
        message: "Database tables already exist. Default config values seeded.",
        appliedAlters,
        ...(users ? { users } : {}),
      });
    }

    await prisma.$executeRawUnsafe(`
      CREATE TYPE "SkipRuleType" AS ENUM ('TITLE', 'COMPANY', 'URL');
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      CREATE TABLE "ScrapedJob" (
        "id" SERIAL NOT NULL,
        "platform" VARCHAR(50) NOT NULL,
        "title" TEXT NOT NULL,
        "company" TEXT NOT NULL,
        "location" TEXT,
        "url" VARCHAR(2048) NOT NULL,
        "manualApplyUrl" VARCHAR(2048),
        "applyMethod" VARCHAR(20),
        "description" TEXT,
        "salary" TEXT,
        "techStack" TEXT,
        "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
        "aiScore" INTEGER,
        "aiReason" TEXT,
        "sheetSynced" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ScrapedJob_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "ScrapedJob_platform_url_key" ON "ScrapedJob"("platform", "url");`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "ScrapedJob_platform_title_company_key" ON "ScrapedJob"("platform", "title", "company");`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE "AppConfig" (
        "key" VARCHAR(255) NOT NULL,
        "value" TEXT NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("key")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE "SkipRule" (
        "id" SERIAL NOT NULL,
        "type" "SkipRuleType" NOT NULL,
        "pattern" TEXT NOT NULL,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SkipRule_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE "ScanLog" (
        "id" SERIAL NOT NULL,
        "board" VARCHAR(50) NOT NULL,
        "jobsFound" INTEGER NOT NULL DEFAULT 0,
        "jobsSaved" INTEGER NOT NULL DEFAULT 0,
        "errors" TEXT,
        "durationMs" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ScanLog_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE "AnalysisLog" (
        "id" SERIAL NOT NULL,
        "scrapedJobId" INTEGER NOT NULL,
        "model" VARCHAR(100) NOT NULL,
        "approved" BOOLEAN NOT NULL,
        "score" INTEGER,
        "reason" TEXT,
        "tokensUsed" INTEGER,
        "durationMs" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AnalysisLog_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "AnalysisLog" ADD CONSTRAINT "AnalysisLog_scrapedJobId_fkey"
      FOREIGN KEY ("scrapedJobId") REFERENCES "ScrapedJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `);

    await applyEvolution();
    const users = await bootstrapAdmin();
    await seedDefaults();

    return NextResponse.json({ status: "success", message: "All tables created and defaults seeded.", users });
  } catch (error) {
    return NextResponse.json({ status: "error", message: describeDbError(error) }, { status: 500 });
  }
}
