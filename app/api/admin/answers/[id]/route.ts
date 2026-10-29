import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// PATCH { question?, answer?, tags? }
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const data: { question?: string; answer?: string; tags?: string | null } = {};
  if (typeof body.question === "string" && body.question.trim()) data.question = body.question.trim().slice(0, 1000);
  if (typeof body.answer === "string" && body.answer.trim()) data.answer = body.answer.trim().slice(0, 8000);
  if (typeof body.tags === "string") data.tags = body.tags.trim().slice(0, 300) || null;
  const updated = await prisma.savedAnswer.update({ where: { id }, data }).catch(() => null);
  if (!updated) return NextResponse.json({ error: "Answer not found" }, { status: 404 });
  return NextResponse.json({ ok: true, answer: updated });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const removed = await prisma.savedAnswer.delete({ where: { id } }).catch(() => null);
  if (!removed) return NextResponse.json({ error: "Answer not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
