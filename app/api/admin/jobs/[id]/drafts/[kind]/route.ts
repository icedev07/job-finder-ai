import { NextRequest, NextResponse } from "next/server";
import { isDraftKind, type DraftKind } from "@/lib/format";
import { LLMRateLimitedError } from "@/lib/llmClient";
import { adminScope, userWhere } from "@/lib/scope";
import { deleteDraft, parseDraftInput, parseWriteInput, saveDraft, WritingError, writeDraft } from "@/lib/writing";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; kind: string }> };

// One draft of the job's application (Writing in the job's panel), of the
// user being viewed (or of any user):
// POST { instructions?, resumeId? } → { ok, draft, costUsd }: the AI writes it,
//   or writes it again, on the Writing route (resumeId null: the profile only).
// PUT { text, instructions?, resumeId?, model?, edited? } → { ok, draft }: saved
//   by hand, or put back as it was by Undo.
// DELETE → { ok }.

async function target(params: Ctx["params"]): Promise<{ id: number; kind: DraftKind } | NextResponse> {
  const { id: raw, kind } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  if (!isDraftKind(kind)) return NextResponse.json({ error: `Unknown kind "${kind}"` }, { status: 400 });
  return { id, kind };
}

async function body(req: NextRequest, optional: boolean): Promise<unknown | NextResponse> {
  const text = await req.text();
  if (optional && !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const t = await target(params);
  if (t instanceof NextResponse) return t;
  const raw = await body(req, true);
  if (raw instanceof NextResponse) return raw;
  const input = parseWriteInput(raw);
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
  try {
    const r = await writeDraft(t.id, t.kind, input, { scope: userWhere(scope), signal: AbortSignal.timeout(57_000) });
    if (!r) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    return NextResponse.json({ ok: true, draft: r.draft, costUsd: r.costUsd });
  } catch (e) {
    // Every provider on the route failing (429, logged by the route) or one it can't run as set up, such as no key (400).
    return NextResponse.json({ error: (e as Error)?.message || String(e) }, { status: e instanceof LLMRateLimitedError ? 429 : 400 });
  }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const t = await target(params);
  if (t instanceof NextResponse) return t;
  const raw = await body(req, false);
  if (raw instanceof NextResponse) return raw;
  const input = parseDraftInput(raw);
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
  try {
    const draft = await saveDraft(t.id, t.kind, input, userWhere(scope));
    if (!draft) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    return NextResponse.json({ ok: true, draft });
  } catch (e) {
    if (e instanceof WritingError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const t = await target(params);
  if (t instanceof NextResponse) return t;
  try {
    const deleted = await deleteDraft(t.id, t.kind, userWhere(scope));
    if (deleted === null) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (!deleted) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof WritingError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
