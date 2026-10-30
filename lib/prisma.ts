import { PrismaClient } from "../generated/prisma";
import { databaseUrlFor } from "./dbUrl";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// On Vercel: Supabase's transaction pooler and a small pool per instance (lib/dbUrl.ts).
const url = databaseUrlFor(process.env);

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
