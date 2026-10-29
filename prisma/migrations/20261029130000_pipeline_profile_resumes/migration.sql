-- AlterTable
ALTER TABLE "ScrapedJob" ADD COLUMN "stage" VARCHAR(20),
ADD COLUMN "stageUpdatedAt" TIMESTAMP(3),
ADD COLUMN "appliedAt" TIMESTAMP(3),
ADD COLUMN "followUpAt" TIMESTAMP(3),
ADD COLUMN "notes" TEXT,
ADD COLUMN "resumeId" INTEGER,
ADD COLUMN "applicationData" TEXT,
ADD COLUMN "feedback" INTEGER,
ADD COLUMN "feedbackAt" TIMESTAMP(3),
ADD COLUMN "eligibility" VARCHAR(30),
ADD COLUMN "signals" TEXT;

-- CreateIndex
CREATE INDEX "ScrapedJob_stage_idx" ON "ScrapedJob"("stage");

-- CreateIndex
CREATE INDEX "ScrapedJob_status_createdAt_idx" ON "ScrapedJob"("status", "createdAt");

-- CreateTable
CREATE TABLE "Resume" (
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
);

-- CreateTable
CREATE TABLE "SavedAnswer" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "tags" VARCHAR(300),
    "uses" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedAnswer_pkey" PRIMARY KEY ("id")
);
