import { NextRequest, NextResponse } from "next/server";
import { parseResume } from "@/lib/resumes";
import { LLMRateLimitedError } from "@/lib/llmClient";
import { adminOnly } from "@/lib/scope";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// POST → Claude reads the resume and returns the extracted profile (also stored
// on the resume). The admin then chooses what to copy into their profile.
export async function POST(req: NextRequest, { params }: Ctx) {
  const denied = await adminOnly(req);
  if (denied) return denied;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  try {
    const r = await parseResume(id, AbortSignal.timeout(57_000));
    return NextResponse.json({ ok: true, profile: r.profile, textPreview: r.text.slice(0, 2000), model: r.model, costUsd: r.costUsd });
  } catch (e) {
    const message = (e as Error).message || String(e);
    const status = e instanceof LLMRateLimitedError ? 429 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
