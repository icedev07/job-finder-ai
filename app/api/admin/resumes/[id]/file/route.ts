import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminScope, userWhere } from "@/lib/scope";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const r = await prisma.resume.findFirst({
    where: { id, ...userWhere(scope) },
    select: { data: true, fileName: true, mimeType: true },
  });
  if (!r) return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  return new NextResponse(new Uint8Array(r.data), {
    headers: {
      "Content-Type": r.mimeType,
      "Content-Disposition": `inline; filename="${r.fileName.replace(/["\\\r\n]/g, "_")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
