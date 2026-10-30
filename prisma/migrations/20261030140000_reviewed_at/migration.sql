-- Review: when a job left the Review queue (approved, rejected or kept as the
-- AI judged it), so "Mark all reviewed" can empty the queue without rating.

-- AlterTable
ALTER TABLE "ScrapedJob" ADD COLUMN "reviewedAt" TIMESTAMP(3);
