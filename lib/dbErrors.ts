// One readable line for a database error plus the fix when the cause is known,
// so admin pages can say what is wrong and what to do instead of failing with
// a bare HTTP 500. Prisma messages open with an "Invalid `prisma.x()`
// invocation:" header; the useful line comes after it.

type Hint = { codes?: string[]; test: RegExp; fix: string };

const HINTS: Hint[] = [
  {
    codes: ["P2021", "P2022"],
    test: /does not exist in the current database/i,
    fix: "Open /api/setup once to add the new tables and columns.",
  },
  {
    test: /max client|EMAXCONN|too many clients|remaining connection slots/i,
    fix: "Supabase's connection pool is full (15 connections on the free plan). Wait a minute and try again; if it keeps happening, add connection_limit=1 to DATABASE_URL in Vercel and redeploy.",
  },
  {
    codes: ["P2024"],
    test: /Timed out fetching a new connection/i,
    fix: "Every database connection was busy for 10 seconds. Try again in a moment.",
  },
  {
    codes: ["P1001", "P1002"],
    test: /Can't reach database server|was reached but timed out/i,
    fix: "Check DATABASE_URL in Vercel and that the Supabase project is not paused (Supabase → your project → Restore).",
  },
  {
    codes: ["P1000"],
    test: /Authentication failed|password authentication failed/i,
    fix: "The password in DATABASE_URL is wrong. Copy the session pooler URI again from Supabase → Connect.",
  },
  {
    test: /Tenant or user not found/i,
    fix: "DATABASE_URL points at the wrong Supabase project or region. Copy the session pooler URI again from Supabase → Connect.",
  },
  {
    test: /prepared statement .* (already exists|does not exist)/i,
    fix: "DATABASE_URL uses Supabase's transaction pooler (port 6543). Use the session pooler URI (port 5432) instead.",
  },
  {
    codes: ["P1017"],
    test: /Server has closed the connection|Connection terminated/i,
    fix: "The database dropped the connection. Try again; if it keeps happening, check the project status in Supabase.",
  },
  {
    test: /Environment variable not found: DATABASE_URL/i,
    fix: "Set DATABASE_URL in Vercel → Settings → Environment Variables and redeploy.",
  },
];

export function describeDbError(e: unknown): string {
  const message = String((e as Error)?.message ?? e);
  const line =
    message
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l && !/^Invalid `.+` invocation/.test(l))
      ?.slice(0, 300) || "Database query failed.";
  // Known request errors carry `code`, initialization errors `errorCode`.
  const err = e as { code?: unknown; errorCode?: unknown };
  const code = String(err?.code ?? err?.errorCode ?? "");
  const hint = HINTS.find((h) => (code && h.codes?.includes(code)) || h.test.test(message));
  if (!hint) return line;
  return `${/[.!?]$/.test(line) ? line : `${line.replace(/[:;,]$/, "")}.`} ${hint.fix}`;
}
