import { prisma } from "./prisma";

// How far the database is from the server: every query waits one round trip,
// so a database in another region slows every page. Measured as the quickest
// of a few trivial queries; for a Supabase pooler address (aws-0-<region>.
// pooler.supabase.com) the database's region is known too, and the Vercel
// region in the same place can be named.

export type DbPlacement = {
  /** The quickest round trip, in ms; null when it could not be measured. */
  latencyMs: number | null;
  /** The database's AWS region (Supabase pooler addresses only). */
  databaseRegion: string | null;
  /** The Vercel region the functions run in (VERCEL_REGION). */
  functionRegion: string | null;
  /** The Vercel region next to the database, when it is not the one in use. */
  suggest: { id: string; city: string } | null;
};

// Supabase's AWS regions and the Vercel region in the same city.
const VERCEL_REGION_FOR: Record<string, { id: string; city: string }> = {
  "us-east-1": { id: "iad1", city: "Washington, D.C." },
  "us-east-2": { id: "cle1", city: "Cleveland" },
  "us-west-1": { id: "sfo1", city: "San Francisco" },
  "us-west-2": { id: "pdx1", city: "Portland" },
  "sa-east-1": { id: "gru1", city: "São Paulo" },
  "eu-west-1": { id: "dub1", city: "Dublin" },
  "eu-west-2": { id: "lhr1", city: "London" },
  "eu-west-3": { id: "cdg1", city: "Paris" },
  "eu-central-1": { id: "fra1", city: "Frankfurt" },
  "eu-north-1": { id: "arn1", city: "Stockholm" },
  "ap-south-1": { id: "bom1", city: "Mumbai" },
  "ap-southeast-1": { id: "sin1", city: "Singapore" },
  "ap-southeast-2": { id: "syd1", city: "Sydney" },
  "ap-northeast-1": { id: "hnd1", city: "Tokyo" },
  "ap-northeast-2": { id: "icn1", city: "Seoul" },
  "ap-northeast-3": { id: "kix1", city: "Osaka" },
  "ap-east-1": { id: "hkg1", city: "Hong Kong" },
  "af-south-1": { id: "cpt1", city: "Cape Town" },
};

export function databaseRegionOf(url: string | undefined): string | null {
  return /aws-\d+-([a-z]{2}-[a-z]+-\d)\.pooler\.supabase\.com/i.exec(url || "")?.[1]?.toLowerCase() ?? null;
}

export async function measureDbPlacement(): Promise<DbPlacement> {
  let latencyMs: number | null = null;
  try {
    // The first query may open a connection; the quickest of three is the round trip.
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      await prisma.$queryRaw`SELECT 1`;
      const ms = performance.now() - t0;
      latencyMs = latencyMs == null ? ms : Math.min(latencyMs, ms);
    }
  } catch {
    latencyMs = null;
  }
  const databaseRegion = databaseRegionOf(process.env.DATABASE_URL);
  const functionRegion = process.env.VERCEL_REGION?.trim() || null;
  const near = databaseRegion ? VERCEL_REGION_FOR[databaseRegion] ?? null : null;
  return {
    latencyMs: latencyMs == null ? null : Math.round(latencyMs),
    databaseRegion,
    functionRegion,
    // Only on Vercel, where the functions' region can be set.
    suggest: near && functionRegion && near.id !== functionRegion ? near : null,
  };
}
