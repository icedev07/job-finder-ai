import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { adminScope, userWhere, viewingUserId } from "@/lib/scope";

export const dynamic = "force-dynamic";

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    console.error("[admin/stats] query failed:", (e as Error)?.message);
    return fallback;
  }
}

// Job counts and scan results of the user being viewed (or of every user);
// database metrics are app-wide.
export async function GET(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const mine = userWhere(scope);
  const userId = viewingUserId(scope);
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
    safe(prisma.scrapedJob.count({ where: mine }), 0),
    safe(prisma.scrapedJob.count({ where: { ...mine, status: "PENDING" } }), 0),
    safe(prisma.scrapedJob.count({ where: { ...mine, status: "APPROVED" } }), 0),
    safe(prisma.scrapedJob.count({ where: { ...mine, status: "REJECTED" } }), 0),
    safe(prisma.scrapedJob.count({ where: { ...mine, sheetSynced: true } }), 0),
    safe(
      prisma.scanLog.findMany({ where: mine, orderBy: { createdAt: "desc" }, take: 10 }),
      [] as Awaited<ReturnType<typeof prisma.scanLog.findMany>>,
    ),
    safe(
      // One Prisma.sql query, not a nested fragment (see lib/prisma.ts).
      prisma.$queryRaw<{ board: string; jobs_found: number; jobs_saved: number; errors: string | null; created_at: Date }[]>(Prisma.sql`
        SELECT DISTINCT ON (board)
          board,
          "jobsFound" AS jobs_found,
          "jobsSaved" AS jobs_saved,
          errors,
          "createdAt" AS created_at
        FROM "ScanLog"
        ${userId != null ? Prisma.sql`WHERE "userId" = ${userId}` : Prisma.empty}
        ORDER BY board, "createdAt" DESC
      `),
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
