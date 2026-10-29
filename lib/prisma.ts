import { PrismaClient } from "../generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Supabase's session pooler gives the whole project about 15 connections, and
// on Vercel every warm function instance keeps its own Prisma pool (Prisma's
// default is 2 per CPU core + 1). A handful of instances can fill the 15, and
// the next request then fails with "max clients reached". Unless DATABASE_URL
// sets connection_limit itself, keep each Vercel instance to a small pool, so
// queries wait their turn instead of failing.
const VERCEL_CONNECTION_LIMIT = 2;

function datasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || !process.env.VERCEL || /[?&]connection_limit=/.test(url)) return undefined;
  return `${url}${url.includes("?") ? "&" : "?"}connection_limit=${VERCEL_CONNECTION_LIMIT}`;
}

const url = datasourceUrl();

// One client per server process. Next bundles this module separately for pages
// and for API routes, so keeping the client on globalThis also stops production
// from opening a second pool (and development from opening a new one on every
// hot reload).
//
// The client may come from another bundle's copy of Prisma, and it only treats
// Prisma.sql fragments from its own copy as SQL; others are sent as a value
// ("syntax error at or near $2"). Build a raw query with a fragment as one
// Prisma.sql`…` and pass it as prisma.$queryRaw(query), never nest fragments
// in a prisma.$queryRaw`…` template.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(url ? { datasourceUrl: url } : {}),
    log: ["error", "warn"],
  });

globalForPrisma.prisma = prisma;
