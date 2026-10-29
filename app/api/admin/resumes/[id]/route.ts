import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setDefaultResume } from "@/lib/resumes";
import { adminScope, userWhere } from "@/lib/scope";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// PATCH { name?, tags?, isDefault? } — a resume of the user being viewed.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const resume = await prisma.resume.findFirst({ where: { id, ...userWhere(scope) }, select: { userId: true } });
  if (!resume) return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  const data: { name?: string; tags?: string | null } = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 120);
  if (typeof body.tags === "string") data.tags = body.tags.trim().slice(0, 500) || null;
  if (Object.keys(data).length) await prisma.resume.update({ where: { id }, data });
  if (body.isDefault === true) await setDefaultResume(resume.userId, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const resume = await prisma.resume.findFirst({ where: { id, ...userWhere(scope) }, select: { userId: true } });
  if (!resume) return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  const removed = await prisma.resume.delete({ where: { id }, select: { isDefault: true } }).catch(() => null);
  if (!removed) return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  // Keep a default when one was deleted.
  if (removed.isDefault) {
    const next = await prisma.resume.findFirst({
      where: { userId: resume.userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (next) await setDefaultResume(resume.userId, next.id);
  }
  return NextResponse.json({ ok: true });
}
