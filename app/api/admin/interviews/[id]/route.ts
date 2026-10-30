import { NextRequest, NextResponse } from "next/server";
import { deleteInterview, parseInterviewInput, updateInterview } from "@/lib/interviews";
import { adminActor, adminScope, userWhere } from "@/lib/scope";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// One interview of the user being viewed (or of any user):
// PATCH { at?, kind?, link?, notes? } → { ok, interview }: a new time moves the
//   job's follow-up after it.
// DELETE → { ok }: the job stays where it is.

async function idOf(params: Ctx["params"]): Promise<number | null> {
  const id = Number((await params).id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const id = await idOf(params);
  if (id == null) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const input = parseInterviewInput(body, true);
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
  const interview = await updateInterview(id, input, { scope: userWhere(scope), actor: adminActor(scope) });
  if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  return NextResponse.json({ ok: true, interview });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const id = await idOf(params);
  if (id == null) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  if (!(await deleteInterview(id, { scope: userWhere(scope), actor: adminActor(scope) }))) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
