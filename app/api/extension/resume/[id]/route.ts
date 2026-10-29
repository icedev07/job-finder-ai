import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extensionCorsHeaders, requireExtensionUser } from "@/lib/extensionAuth";

export const dynamic = "force-dynamic";

const CORS = extensionCorsHeaders("GET, OPTIONS");

type Ctx = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// The resume file itself, attached to the form's upload field by autofill.
export async function GET(req: NextRequest, { params }: Ctx) {
  const auth = await requireExtensionUser(req, CORS);
  if (auth instanceof NextResponse) return auth;
  const userId = auth.user.id;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400, headers: CORS });
  const r = await prisma.resume.findFirst({ where: { id, userId }, select: { data: true, fileName: true, mimeType: true } });
  if (!r) return NextResponse.json({ error: "Resume not found" }, { status: 404, headers: CORS });
  return new NextResponse(new Uint8Array(r.data), {
    headers: {
      ...CORS,
      "Content-Type": r.mimeType,
      "X-File-Name": encodeURIComponent(r.fileName),
      "Access-Control-Expose-Headers": "X-File-Name",
      "Cache-Control": "private, no-store",
    },
  });
}
