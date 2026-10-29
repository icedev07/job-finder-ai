import { NextRequest, NextResponse } from "next/server";
import { reanalyzeJobs } from "@/lib/jobAnalyzer";

export const dynamic = "force-dynamic";

// POST { ids } → judge these jobs again with the board-scan route.
export async function POST(req: NextRequest) {
  let ids: number[] = [];
  try {
    const body = await req.json();
    ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter((n: number) => Number.isInteger(n) && n > 0) : [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (ids.length === 0) return NextResponse.json({ error: "ids[] is required" }, { status: 400 });
  if (ids.length > 60) return NextResponse.json({ error: "Re-analyze at most 60 jobs at a time." }, { status: 400 });
  try {
    const result = await reanalyzeJobs(ids, { timeBudgetMs: 48_000 });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message || String(e) }, { status: 500 });
  }
}
