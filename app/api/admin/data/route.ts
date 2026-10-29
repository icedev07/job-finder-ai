import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LEGACY_ADMIN_PASSWORD_KEY, getAllConfig, isSecretConfigKey } from "@/lib/config";
import { describeDbError } from "@/lib/dbErrors";
import { SUPABASE_FREE_DB_BYTES } from "@/lib/status";
import { adminScope, userWhere, viewingUserId, type AdminScope } from "@/lib/scope";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60_000;
const WIPE_JOBS_PHRASE = "DELETE ALL JOBS";

type TableRow = { name: string; bytes: bigint; rows: bigint };

// GET            → storage overview (database size, per-table size and rows).
// GET ?export=settings → JSON download of the app settings and each user's own
// settings (the user being viewed, or every user), without any secret.
export async function GET(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  if (new URL(req.url).searchParams.get("export") === "settings") {
    const all = await getAllConfig();
    const settings = Object.fromEntries(
      Object.entries(all).filter(([k]) => !isSecretConfigKey(k) && k !== LEGACY_ADMIN_PASSWORD_KEY),
    );
    const rows = await prisma.userConfig.findMany({ where: userWhere(scope), orderBy: [{ userId: "asc" }, { key: "asc" }] });
    const users = scope.users
      .filter((u) => scope.viewing === "all" || u.id === scope.viewing)
      .map((u) => ({
        username: u.username,
        name: u.name,
        role: u.role,
        settings: Object.fromEntries(rows.filter((r) => r.userId === u.id).map((r) => [r.key, r.value])),
      }));
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), settings, users }, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="job-finder-settings-${stamp}.json"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // Each query fails soft, so one problem (a column missing until /api/setup
  // runs, a busy connection pool) never blanks the whole card, and the first
  // error goes back to the page instead of a bare HTTP 500.
  const errors: string[] = [];
  const soft = async <T>(p: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await p;
    } catch (e) {
      console.error("[admin/data] query failed:", (e as Error)?.message);
      errors.push(describeDbError(e));
      return fallback;
    }
  };

  const [size, tables, oldRejected] = await Promise.all([
    soft(prisma.$queryRaw<{ size: bigint }[]>`SELECT pg_database_size(current_database())::bigint AS size`, []),
    soft(
      prisma.$queryRaw<TableRow[]>`
        SELECT c.relname AS name,
               pg_total_relation_size(c.oid)::bigint AS bytes,
               GREATEST(c.reltuples, 0)::bigint AS rows
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r' AND n.nspname = 'public'
        ORDER BY pg_total_relation_size(c.oid) DESC`,
      [] as TableRow[],
    ),
    soft(
      prisma.scrapedJob.count({
        where: {
          ...userWhere(scope),
          status: "REJECTED",
          feedback: null,
          stage: null,
          createdAt: { lt: new Date(Date.now() - 30 * DAY_MS) },
        },
      }),
      null as number | null,
    ),
  ]);

  return NextResponse.json({
    sizeBytes: size[0] ? Number(size[0].size) : null,
    limitBytes: SUPABASE_FREE_DB_BYTES,
    tables: tables.map((t) => ({ name: t.name, bytes: Number(t.bytes), rows: Number(t.rows) })),
    rejectedOlderThan30d: oldRejected,
    error: errors[0] ?? null,
  });
}

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

// POST { action, olderThanDays?, confirm? }
//   cleanup-rejected — rejected jobs older than N days you never rated or saved
//   cleanup-logs     — scan / analysis / extension logs older than N days
//   cleanup-usage    — AI usage rows older than N days (≥ 35, so the month's budget is untouched)
//   wipe-jobs        — every job and its AI history; needs confirm = "DELETE ALL JOBS"
// Jobs and logs: only the user being viewed (every user's with all users).
// AI usage is app-wide (it feeds the shared Claude budget).
export async function POST(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  try {
    return await runAction(req, scope);
  } catch (e) {
    console.error("[admin/data] action failed:", (e as Error)?.message);
    return NextResponse.json({ ok: false, error: describeDbError(e) }, { status: 500 });
  }
}

async function runAction(req: NextRequest, scope: AdminScope) {
  const mine = userWhere(scope);
  const userId = viewingUserId(scope);
  const whose = userId != null ? `${scope.users.find((u) => u.id === userId)?.name ?? "this user"}'s ` : "";
  let body: { action?: unknown; olderThanDays?: unknown; confirm?: unknown };
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const days = Math.round(Number(body.olderThanDays));
  const cutoff = (min: number) => {
    if (!Number.isFinite(days) || days < min || days > 3650) return null;
    return new Date(Date.now() - days * DAY_MS);
  };

  switch (body.action) {
    case "cleanup-rejected": {
      const before = cutoff(7);
      if (!before) return badRequest("olderThanDays must be between 7 and 3650");
      const r = await prisma.scrapedJob.deleteMany({
        where: { ...mine, status: "REJECTED", feedback: null, stage: null, createdAt: { lt: before } },
      });
      return NextResponse.json({ ok: true, deleted: r.count, message: `Deleted ${r.count} of ${whose}old rejected jobs` });
    }
    case "cleanup-logs": {
      const before = cutoff(1);
      if (!before) return badRequest("olderThanDays must be between 1 and 3650");
      const [scans, analysis, extension] = await prisma.$transaction([
        prisma.scanLog.deleteMany({ where: { ...mine, createdAt: { lt: before } } }),
        prisma.analysisLog.deleteMany({
          where: { ...(userId != null ? { scrapedJob: { userId } } : {}), createdAt: { lt: before } },
        }),
        prisma.extensionLog.deleteMany({ where: { ...mine, createdAt: { lt: before } } }),
      ]);
      const total = scans.count + analysis.count + extension.count;
      return NextResponse.json({ ok: true, deleted: total, message: `Deleted ${total} of ${whose}log rows` });
    }
    case "cleanup-usage": {
      const before = cutoff(35);
      if (!before) return badRequest("olderThanDays must be between 35 and 3650 (the current month feeds the budget cap)");
      const r = await prisma.aiUsage.deleteMany({ where: { createdAt: { lt: before } } });
      return NextResponse.json({ ok: true, deleted: r.count, message: `Deleted ${r.count} AI usage rows` });
    }
    case "wipe-jobs": {
      if (body.confirm !== WIPE_JOBS_PHRASE) return badRequest(`Type "${WIPE_JOBS_PHRASE}" to confirm`);
      const [analysis, jobs] = await prisma.$transaction([
        prisma.analysisLog.deleteMany({ where: userId != null ? { scrapedJob: { userId } } : {} }),
        prisma.scrapedJob.deleteMany({ where: mine }),
      ]);
      return NextResponse.json({
        ok: true,
        deleted: jobs.count,
        message: `Deleted ${whose}${jobs.count} jobs and ${analysis.count} analysis logs`,
      });
    }
    default:
      return badRequest("Unknown action");
  }
}
