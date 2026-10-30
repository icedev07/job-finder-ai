import { NextRequest, NextResponse } from "next/server";
import { addResume, listResumes, ResumeUploadError } from "@/lib/resumes";
import { adminScope, requireOneUser } from "@/lib/scope";

export const dynamic = "force-dynamic";

// The resumes of the user being viewed.
export async function GET(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const userId = requireOneUser(scope);
  if (userId instanceof NextResponse) return userId;
  try {
    return NextResponse.json({ resumes: await listResumes(userId) });
  } catch (e) {
    return NextResponse.json(
      { resumes: [], error: `Resumes unavailable — run /api/setup once. (${(e as Error).message})` },
      { status: 200 },
    );
  }
}

// POST multipart/form-data: file, name?, tags?, makeDefault?, reading?, fillProfile? — for the user being viewed.
export async function POST(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const userId = requireOneUser(scope);
  if (userId instanceof NextResponse) return userId;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart form with a file" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });
  try {
    const added = await addResume(userId, {
      file,
      name: form.get("name"),
      tags: form.get("tags"),
      makeDefault: form.get("makeDefault"),
      reading: form.get("reading"),
      fillProfile: form.get("fillProfile"),
    });
    return NextResponse.json({ ok: true, ...added });
  } catch (e) {
    if (e instanceof ResumeUploadError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
