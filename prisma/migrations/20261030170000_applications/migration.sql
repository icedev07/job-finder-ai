-- Applications: why an application closed, and each application's timeline.

-- AlterTable
ALTER TABLE "ScrapedJob" ADD COLUMN "closeReason" VARCHAR(20);

-- CreateTable
CREATE TABLE "ApplicationEvent" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "fromStage" VARCHAR(20),
    "toStage" VARCHAR(20),
    "detail" TEXT,
    "actorId" INTEGER,
    "via" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationEvent_jobId_createdAt_idx" ON "ApplicationEvent"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicationEvent_userId_createdAt_idx" ON "ApplicationEvent"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ApplicationEvent" ADD CONSTRAINT "ApplicationEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ScrapedJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Applications the company rejected closed for that reason.
UPDATE "ScrapedJob" SET "closeReason" = 'REJECTED' WHERE "stage" = 'REJECTED' AND "closeReason" IS NULL;

-- Each application's timeline starts with what is known so far: when it was
-- applied to and the stage it is in.
INSERT INTO "ApplicationEvent" ("jobId", "userId", "kind", "toStage", "detail", "via", "createdAt")
SELECT j."id", j."userId", 'stage', s."stage", '{"imported":true}', 'app', s."at"
FROM "ScrapedJob" j
CROSS JOIN LATERAL (
    SELECT 'APPLIED'::VARCHAR(20) AS "stage", j."appliedAt" AS "at" WHERE j."appliedAt" IS NOT NULL
    UNION ALL
    SELECT j."stage", COALESCE(j."stageUpdatedAt", j."createdAt")
    WHERE j."stage" IS NOT NULL AND NOT (j."stage" = 'APPLIED' AND j."appliedAt" IS NOT NULL)
) s
WHERE NOT EXISTS (SELECT 1 FROM "ApplicationEvent" e WHERE e."jobId" = j."id");
