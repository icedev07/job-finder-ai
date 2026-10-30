import { after, NextRequest, NextResponse } from "next/server";
import { updateSheetsAfterChange } from "@/lib/googleSheetsSync";
import { addInterview, parseInterviewInput, type InterviewInput } from "@/lib/interviews";
import { adminActor, adminScope, userWhere } from "@/lib/scope";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// POST { at, kind, link?, notes? } → { ok, interview }: adds an interview to the
// job. While Applications is on for its user the job moves to Interview (its
// Stage in the Google Sheet follows right after the response) and its
// follow-up goes after the interview.
export async function POST(req: NextRequest, { params }: Ctx) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const input = parseInterviewInput(body, false);
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
  const r = await addInterview(id, input as InterviewInput, { scope: userWhere(scope), actor: adminActor(scope) });
  if (!r) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (r.moved) after(() => updateSheetsAfterChange([id], userWhere(scope)));
  return NextResponse.json({ ok: true, interview: r.interview });
}
