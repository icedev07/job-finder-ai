-- Writing: what the AI wrote for each application, one draft of each kind.

-- CreateTable
CREATE TABLE "Draft" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "text" TEXT NOT NULL,
    "instructions" TEXT,
    "resumeId" INTEGER,
    "model" VARCHAR(160),
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Draft_jobId_kind_key" ON "Draft"("jobId", "kind");

-- CreateIndex
CREATE INDEX "Draft_userId_idx" ON "Draft"("userId");

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ScrapedJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
