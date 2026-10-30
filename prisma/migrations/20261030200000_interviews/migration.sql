-- Interviews: when each application's interviews are, what kind, where to join.

-- CreateTable
CREATE TABLE "Interview" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "link" VARCHAR(2048),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Interview_jobId_at_idx" ON "Interview"("jobId", "at");

-- CreateIndex
CREATE INDEX "Interview_userId_at_idx" ON "Interview"("userId", "at");

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ScrapedJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
