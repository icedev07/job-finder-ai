// The database URL the app connects with, from DATABASE_URL (pure, so Setup can
// say which way it connects and a test can check every case).
//
// Supabase's session pooler (port 5432) gives every connected client a database
// connection of its own and allows only 15 on the free plan. On Vercel every
// function instance keeps its connections open between requests, frozen ones
// too, and right after a deploy the old deployment's as well, so a few
// instances fill it and pages fail with "max clients reached in session mode".
// Supabase's transaction pooler, the same address on port 6543, takes about 200
// clients and shares the database connections between them: Supabase's advice
// for serverless. With pgbouncer=true Prisma uses no named prepared statements,
// which the transaction pooler cannot keep (the app has nothing else that needs
// a session: its transactions and SET LOCAL stay inside one transaction).
//
// So on Vercel a Supabase pooler URL goes through the transaction pooler, unless
// DATABASE_POOL_MODE=session. Each Vercel instance also keeps a small pool
// (connection_limit) unless the URL sets one, so queries wait their turn
// instead of opening more connections.

export const VERCEL_CONNECTION_LIMIT = 2;

// postgres://user:password@aws-0-<region>.pooler.supabase.com:5432/postgres?…
const SUPABASE_POOLER = /^(postgres(?:ql)?:\/\/[^/?#]*@[^/?#:@]+\.pooler\.supabase\.com):(5432|6543)(?=[/?#]|$)/i;

type Env = Record<string, string | undefined>;

export type DbConnection = {
  /** How the app reaches the database. */
  kind: "transaction-pooler" | "session-pooler" | "other";
  /** The session pooler in DATABASE_URL was switched to the transaction pooler. */
  switched: boolean;
  /** DATABASE_POOL_MODE=session keeps the session pooler. */
  sessionKept: boolean;
};

function withParam(url: string, key: string, value: string): string {
  if (new RegExp(`[?&]${key}=`, "i").test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${key}=${value}`;
}

const keepSession = (env: Env) => (env.DATABASE_POOL_MODE ?? "").trim().toLowerCase() === "session";

/** The URL Prisma connects with, or undefined to use DATABASE_URL as it is (off Vercel). */
export function databaseUrlFor(env: Env): string | undefined {
  const raw = env.DATABASE_URL?.trim();
  if (!raw || !env.VERCEL) return undefined;
  let url = raw;
  const pooler = url.match(SUPABASE_POOLER);
  if (pooler && !keepSession(env)) {
    if (pooler[2] === "5432") url = url.replace(SUPABASE_POOLER, "$1:6543");
    url = withParam(url, "pgbouncer", "true");
  }
  return withParam(url, "connection_limit", String(VERCEL_CONNECTION_LIMIT));
}

/** Which way the app reaches the database (for Setup). */
export function databaseConnection(env: Env): DbConnection {
  const raw = env.DATABASE_URL?.trim() ?? "";
  const used = databaseUrlFor(env) ?? raw;
  const pooler = used.match(SUPABASE_POOLER);
  const kind = !pooler ? "other" : pooler[2] === "6543" ? "transaction-pooler" : "session-pooler";
  return {
    kind,
    switched: kind === "transaction-pooler" && raw.match(SUPABASE_POOLER)?.[2] === "5432",
    sessionKept: kind === "session-pooler" && !!env.VERCEL && keepSession(env),
  };
}
