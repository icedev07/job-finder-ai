import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminPassword } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

const READ_KEYWORDS = ["SELECT", "WITH", "SHOW", "EXPLAIN", "VALUES", "TABLE"];

function firstKeyword(sql: string): string {
  const stripped = sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .trim();
  const match = stripped.match(/^[A-Za-z]+/);
  return match ? match[0].toUpperCase() : "";
}

function serializeRows(rows: unknown): unknown {
  return JSON.parse(
    JSON.stringify(rows, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
  );
}

// The admin session (checked by middleware) is enough to read. Reads run in a
// READ ONLY transaction, so a "read" that smuggles a write — e.g.
// WITH x AS (DELETE …) SELECT … — fails inside Postgres instead of running.
// Writes additionally require the admin password, re-entered for each query.
export async function POST(req: NextRequest) {
  let body: { sql?: unknown; password?: unknown; confirmWrite?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sql = typeof body.sql === "string" ? body.sql.trim() : "";
  if (!sql) {
    return NextResponse.json({ error: "sql is required" }, { status: 400 });
  }

  const keyword = firstKeyword(sql);
  const isRead = READ_KEYWORDS.includes(keyword);

  if (!isRead) {
    if (body.confirmWrite !== true) {
      return NextResponse.json(
        {
          error: "This query is not a read query. Set confirmWrite=true to execute it.",
          keyword,
        },
        { status: 400 },
      );
    }
    const password = typeof body.password === "string" ? body.password : "";
    const check = password ? await verifyAdminPassword(password) : { ok: false };
    if (!check.ok) {
      return NextResponse.json(
        { error: "Write queries need the admin password. Enter it and try again." },
        { status: 401 },
      );
    }
  }

  const startedAt = Date.now();
  try {
    if (isRead) {
      const rows = await prisma.$transaction(
        async (tx) => {
          await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
          await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '15s'");
          return tx.$queryRawUnsafe<unknown[]>(sql);
        },
        { timeout: 20_000 },
      );
      return NextResponse.json({
        kind: "rows",
        rows: serializeRows(rows),
        rowCount: Array.isArray(rows) ? rows.length : 0,
        durationMs: Date.now() - startedAt,
      });
    }
    const affected = await prisma.$executeRawUnsafe(sql);
    return NextResponse.json({
      kind: "affected",
      affected,
      durationMs: Date.now() - startedAt,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Query failed";
    return NextResponse.json(
      { error: message, durationMs: Date.now() - startedAt },
      { status: 400 },
    );
  }
}
