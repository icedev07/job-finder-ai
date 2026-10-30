import { NextRequest, NextResponse } from "next/server";
import { parseResume } from "@/lib/resumes";
import { LLMRateLimitedError } from "@/lib/llmClient";
import { adminScope, userWhere } from "@/lib/scope";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// POST { reuse? } → Claude reads the resume and returns the extracted profile (also stored on the resume); with
// reuse, an earlier reading comes back at once. The admin then chooses what to copy into the profile.
export async function POST(req: NextRequest, { params }: Ctx) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  if (!(await prisma.resume.findFirst({ where: { id, ...userWhere(scope) }, select: { id: true } }))) {
    return NextResponse.json({ ok: false, error: "Resume not found" }, { status: 404 });
  }
  let reuse = false;
  try {
    reuse = ((await req.json()) as { reuse?: unknown } | null)?.reuse === true;
  } catch {
    // No body: read it again.
  }
  try {
    const r = await parseResume(id, AbortSignal.timeout(57_000), { reuse });
    return NextResponse.json({
      ok: true,
      profile: r.profile,
      textPreview: r.text.slice(0, 2000),
      model: r.model,
      costUsd: r.costUsd,
      reused: r.reused,
    });
  } catch (e) {
    const message = (e as Error).message || String(e);
    const status = e instanceof LLMRateLimitedError ? 429 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
