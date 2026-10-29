import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const answers = await prisma.savedAnswer.findMany({ orderBy: [{ uses: "desc" }, { updatedAt: "desc" }] });
    return NextResponse.json({ answers });
  } catch (e) {
    return NextResponse.json({ answers: [], error: `Answer bank unavailable — run /api/setup once. (${(e as Error).message})` });
  }
}

// POST { question, answer, tags? }
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 1000) : "";
  const answer = typeof body.answer === "string" ? body.answer.trim().slice(0, 8000) : "";
  if (!question || !answer) return NextResponse.json({ error: "question and answer are required" }, { status: 400 });
  const tags = typeof body.tags === "string" ? body.tags.trim().slice(0, 300) || null : null;
  const created = await prisma.savedAnswer.create({ data: { question, answer, tags } });
  return NextResponse.json({ ok: true, answer: created });
}
