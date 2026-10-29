import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminOnly } from "@/lib/scope";

export const dynamic = "force-dynamic";

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    console.error("[admin/stats] query failed:", (e as Error)?.message);
    return fallback;
  }
}

export async function GET(req: NextRequest) {
  const denied = await adminOnly(req);
  if (denied) return denied;
  const [
    totalJobs,
    pendingJobs,
    approvedJobs,
    rejectedJobs,
    syncedJobs,
    recentScans,
    latestPerBoardRaw,
    dbSizeRows,
    activeConnRows,
    tableSizeRows,
  ] = await Promise.all([
    safe(prisma.scrapedJob.count(), 0),
    safe(prisma.scrapedJob.count({ where: { status: "PENDING" } }), 0),
    safe(prisma.scrapedJob.count({ where: { status: "APPROVED" } }), 0),
    safe(prisma.scrapedJob.count({ where: { status: "REJECTED" } }), 0),
    safe(prisma.scrapedJob.count({ where: { sheetSynced: true } }), 0),
    safe(
      prisma.scanLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
      [] as Awaited<ReturnType<typeof prisma.scanLog.findMany>>,
    ),
    safe(
      prisma.$queryRaw<{ board: string; jobs_found: number; jobs_saved: number; errors: string | null; created_at: Date }[]>`
        SELECT DISTINCT ON (board)
          board,
          "jobsFound" AS jobs_found,
          "jobsSaved" AS jobs_saved,
          errors,
          "createdAt" AS created_at
        FROM "ScanLog"
        ORDER BY board, "createdAt" DESC
      `,
      [] as { board: string; jobs_found: number; jobs_saved: number; errors: string | null; created_at: Date }[],
    ),
    safe(
      prisma.$queryRaw<{ db_size_bytes: bigint }[]>`
        SELECT pg_database_size(current_database()) AS db_size_bytes
      `,
      [] as { db_size_bytes: bigint }[],
    ),
    safe(
      prisma.$queryRaw<{ active_connections: bigint }[]>`
        SELECT COUNT(*)::bigint AS active_connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `,
      [] as { active_connections: bigint }[],
    ),
    safe(
      prisma.$queryRaw<{ table_name: string; table_size_bytes: bigint }[]>`
        SELECT
          relname::text AS table_name,
          pg_total_relation_size(c.oid)::bigint AS table_size_bytes
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND n.nspname = 'public'
        ORDER BY pg_total_relation_size(c.oid) DESC
        LIMIT 10
      `,
      [] as { table_name: string; table_size_bytes: bigint }[],
    ),
  ]);

  const dbSizeBytes = Number(dbSizeRows[0]?.db_size_bytes || 0);
  const activeConnections = Number(activeConnRows[0]?.active_connections || 0);
  const dbSizeMb = Number((dbSizeBytes / (1024 * 1024)).toFixed(2));
  const topTables = tableSizeRows.map((t) => ({
    tableName: t.table_name,
    sizeMb: Number((Number(t.table_size_bytes || 0) / (1024 * 1024)).toFixed(2)),
  }));

  const latestPerBoard = latestPerBoardRaw.map((r) => ({
    board: r.board,
    jobsFound: Number(r.jobs_found || 0),
    jobsSaved: Number(r.jobs_saved || 0),
    errors: r.errors,
    createdAt: r.created_at,
  }));

  return NextResponse.json({
    totalJobs,
    pendingJobs,
    approvedJobs,
    rejectedJobs,
    syncedJobs,
    recentScans,
    latestPerBoard,
    dbMetrics: {
      dbSizeMb,
      activeConnections,
      topTables,
    },
  });
}
