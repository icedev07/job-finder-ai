import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listResumes, MAX_RESUME_BYTES, RESUME_TYPES, setDefaultResume } from "@/lib/resumes";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ resumes: await listResumes() });
  } catch (e) {
    return NextResponse.json(
      { resumes: [], error: `Resumes unavailable — run /api/setup once. (${(e as Error).message})` },
      { status: 200 },
    );
  }
}

// POST multipart/form-data: file, name?, tags?, makeDefault?
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart form with a file" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "The file is empty" }, { status: 400 });
  if (file.size > MAX_RESUME_BYTES) {
    return NextResponse.json({ error: "The file is larger than 4 MB" }, { status: 400 });
  }
  const mimeType = file.type || "application/octet-stream";
  if (!RESUME_TYPES[mimeType]) {
    return NextResponse.json({ error: "Upload a PDF, DOCX or plain-text resume" }, { status: 400 });
  }
  const name = String(form.get("name") || file.name.replace(/\.[a-z0-9]+$/i, "")).trim().slice(0, 120) || "Resume";
  const tags = String(form.get("tags") || "").trim().slice(0, 500) || null;
  const data = Buffer.from(await file.arrayBuffer());

  const count = await prisma.resume.count();
  const created = await prisma.resume.create({
    data: {
      name,
      fileName: file.name.slice(0, 255),
      mimeType,
      sizeBytes: file.size,
      data,
      tags,
      isDefault: count === 0,
    },
    select: { id: true },
  });
  if (form.get("makeDefault") === "true" && count > 0) await setDefaultResume(created.id);
  return NextResponse.json({ ok: true, id: created.id });
}
