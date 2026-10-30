import { NextRequest, NextResponse } from "next/server";
import { LLMRateLimitedError } from "@/lib/llmClient";
import { resumeFileProblem, resumeType } from "@/lib/resumeFiles";
import { readResume } from "@/lib/resumes";
import { requireAdmin } from "@/lib/scope";

export const dynamic = "force-dynamic";

// POST multipart/form-data: file → what Claude finds in a resume that is not stored: Add user reads a new user's
// resume while the rest of the form is filled in, then uploads it with this reading. Billed to the signed-in admin.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart form with a file" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });
  const problem = resumeFileProblem(file);
  if (problem) return NextResponse.json({ ok: false, error: problem }, { status: 400 });
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const r = await readResume({ bytes, mimeType: resumeType(file.type, file.name)!, fileName: file.name }, admin.id, AbortSignal.timeout(57_000));
    return NextResponse.json({ ok: true, profile: r.profile, text: r.text, model: r.model, costUsd: r.costUsd });
  } catch (e) {
    const message = (e as Error).message || String(e);
    const status = e instanceof LLMRateLimitedError ? 429 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
