import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { describeDbError } from "@/lib/dbErrors";
import { LEGACY_ADMIN_PASSWORD_KEY } from "@/lib/config";
import { LEGACY_DEFAULT_RULES } from "@/lib/jobSkipRules";
import { invalidateUserCache } from "@/lib/users";
import { USER_KEY_LIST, invalidateUserSettings } from "@/lib/userSettings";

export const dynamic = "force-dynamic";

// "userId → User.id, deleted with the user", added only when missing.
function addForeignKey(table: string, name: string): string {
  return `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN
      ALTER TABLE "${table}" ADD CONSTRAINT "${name}" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$;`;
}

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
  // Each user's own settings and data.
  `CREATE TABLE IF NOT EXISTS "UserConfig" (
    "userId" INTEGER NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserConfig_pkey" PRIMARY KEY ("userId","key")
  );`,
  addForeignKey("UserConfig", "UserConfig_userId_fkey"),
  `ALTER TABLE "ScrapedJob" ADD COLUMN IF NOT EXISTS "userId" INTEGER;`,
  `ALTER TABLE "Resume" ADD COLUMN IF NOT EXISTS "userId" INTEGER;`,
  `ALTER TABLE "SavedAnswer" ADD COLUMN IF NOT EXISTS "userId" INTEGER;`,
  `ALTER TABLE "SkipRule" ADD COLUMN IF NOT EXISTS "userId" INTEGER;`,
  `ALTER TABLE "ScanLog" ADD COLUMN IF NOT EXISTS "userId" INTEGER;`,
  `ALTER TABLE "AiUsage" ADD COLUMN IF NOT EXISTS "userId" INTEGER;`,
  `ALTER TABLE "ExtensionLog" ADD COLUMN IF NOT EXISTS "userId" INTEGER;`,
];

// After migrateUserData() gave every existing row an owner: the constraints
// that need one, and duplicates checked per user instead of app-wide.
const USER_CONSTRAINT_STATEMENTS = [
  `ALTER TABLE "ScrapedJob" ALTER COLUMN "userId" SET NOT NULL;`,
  `ALTER TABLE "Resume" ALTER COLUMN "userId" SET NOT NULL;`,
  `ALTER TABLE "SavedAnswer" ALTER COLUMN "userId" SET NOT NULL;`,
  `DROP INDEX IF EXISTS "ScrapedJob_platform_url_key";`,
  `DROP INDEX IF EXISTS "ScrapedJob_platform_title_company_key";`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ScrapedJob_userId_platform_url_key" ON "ScrapedJob"("userId", "platform", "url");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ScrapedJob_userId_platform_title_company_key" ON "ScrapedJob"("userId", "platform", "title", "company");`,
  `CREATE INDEX IF NOT EXISTS "ScrapedJob_userId_status_createdAt_idx" ON "ScrapedJob"("userId", "status", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "ScrapedJob_userId_stage_idx" ON "ScrapedJob"("userId", "stage");`,
  `CREATE INDEX IF NOT EXISTS "Resume_userId_idx" ON "Resume"("userId");`,
  `CREATE INDEX IF NOT EXISTS "SavedAnswer_userId_idx" ON "SavedAnswer"("userId");`,
  `CREATE INDEX IF NOT EXISTS "SkipRule_userId_idx" ON "SkipRule"("userId");`,
  `CREATE INDEX IF NOT EXISTS "AiUsage_userId_createdAt_idx" ON "AiUsage"("userId", "createdAt");`,
  addForeignKey("ScrapedJob", "ScrapedJob_userId_fkey"),
  addForeignKey("Resume", "Resume_userId_fkey"),
  addForeignKey("SavedAnswer", "SavedAnswer_userId_fkey"),
  addForeignKey("SkipRule", "SkipRule_userId_fkey"),
];

async function applyStatements(statements: string[]): Promise<string[]> {
  const applied: string[] = [];
  for (const sql of statements) {
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

// Marks the one-time move below as done (also set by the user_data migration).
const USER_DATA_MIGRATED_KEY = "user_data_migrated";

// Before each user had their own data, everything was the admin's. The first
// run after the upgrade gives the first admin the old search options, Google
// Sheet and profile, plus every existing job, resume, answer, skip rule and
// log. It runs once: later, a rule without a user means "everyone" and a log
// without one is app-wide. Jobs, resumes and answers always need an owner, so
// any left without one go to the first admin on every run.
async function migrateUserData(upgrading: boolean): Promise<string[]> {
  const notes: string[] = [];
  const owner = await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { id: "asc" }, select: { id: true } });
  if (!owner) return notes;

  const done = await prisma.appConfig.findUnique({ where: { key: USER_DATA_MIGRATED_KEY } });
  if (!done) {
    const old = await prisma.appConfig.findMany({ where: { key: { in: USER_KEY_LIST } } });
    const values = new Map(old.map((r) => [r.key, r.value]));
    const hasJobs = (await prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*)::int AS n FROM "ScrapedJob"`))[0]?.n > 0;
    if (upgrading && hasJobs) {
      // Installs that never saved these used the old built-in defaults.
      if (!values.has("target_market")) values.set("target_market", "Europe, Eastern Europe, Remote worldwide");
      if (!values.has("current_location")) values.set("current_location", "Armenia");
    }
    if (values.size) {
      await prisma.userConfig.createMany({
        data: [...values].map(([key, value]) => ({ userId: owner.id, key, value })),
        skipDuplicates: true,
      });
      invalidateUserSettings(owner.id);
      notes.push("Moved the search options, Google Sheet and profile to the first admin's own settings.");
    }
    for (const table of ["SkipRule", "ScanLog", "AiUsage", "ExtensionLog"]) {
      await prisma.$executeRawUnsafe(`UPDATE "${table}" SET "userId" = $1 WHERE "userId" IS NULL`, owner.id);
    }
    // The single-user version fell back to a built-in list while no rules were saved.
    if (upgrading && hasJobs && (await prisma.skipRule.count()) === 0) {
      await prisma.skipRule.createMany({ data: LEGACY_DEFAULT_RULES.map((r) => ({ ...r, userId: owner.id })) });
      notes.push(`Saved the ${LEGACY_DEFAULT_RULES.length} built-in skip rules as the first admin's own rules.`);
    }
    await prisma.appConfig.create({ data: { key: USER_DATA_MIGRATED_KEY, value: "1" } });
  }

  for (const table of ["ScrapedJob", "Resume", "SavedAnswer"]) {
    const n = await prisma.$executeRawUnsafe(`UPDATE "${table}" SET "userId" = $1 WHERE "userId" IS NULL`, owner.id);
    if (n > 0) notes.push(`${table}: gave ${n} row${n === 1 ? "" : "s"} to the first admin.`);
  }
  return notes;
}

// The steps every run takes once the base tables exist.
async function evolve(upgrading: boolean): Promise<{ appliedAlters: string[]; users: string | null; notes: string[] }> {
  const appliedAlters = await applyStatements(EVOLUTION_STATEMENTS);
  const users = await bootstrapAdmin();
  const notes = await migrateUserData(upgrading);
  appliedAlters.push(...(await applyStatements(USER_CONSTRAINT_STATEMENTS)));
  await seedDefaults();
  return { appliedAlters, users, notes };
}

// App-wide defaults. Each user's own settings (location, target market, sheet,
// prompt) start empty: the Add user dialog and Settings ask for them.
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
      const { appliedAlters, users, notes } = await evolve(true);
      return NextResponse.json({
        status: "already_initialized",
        message: "Database tables already exist. Default config values seeded.",
        appliedAlters,
        ...(users ? { users } : {}),
        ...(notes.length ? { notes } : {}),
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

    // Its unique indexes (per user) come with the user statements.

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

    const { users } = await evolve(false);

    return NextResponse.json({ status: "success", message: "All tables created and defaults seeded.", users });
  } catch (error) {
    return NextResponse.json({ status: "error", message: describeDbError(error) }, { status: 500 });
  }
}
