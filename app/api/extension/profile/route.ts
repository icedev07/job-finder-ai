import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProfile } from "@/lib/profile";
import { listResumes } from "@/lib/resumes";
import { extensionCorsHeaders, requireExtensionKey } from "@/lib/extensionAuth";

export const dynamic = "force-dynamic";

const CORS = extensionCorsHeaders("GET, OPTIONS");

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// Everything autofill needs up front: the profile, the resume variants (no
// file bytes) and the most-used saved answers.
export async function GET(req: NextRequest) {
  const denied = await requireExtensionKey(req, CORS);
  if (denied) return denied;
  const [profile, resumes, answers] = await Promise.all([
    getProfile(),
    listResumes().catch(() => []),
    prisma.savedAnswer
      .findMany({ orderBy: [{ uses: "desc" }, { updatedAt: "desc" }], take: 100, select: { question: true, answer: true } })
      .catch(() => []),
  ]);
  return NextResponse.json(
    {
      profile,
      resumes: resumes.map((r) => ({ id: r.id, name: r.name, fileName: r.fileName, mimeType: r.mimeType, tags: r.tags, isDefault: r.isDefault })),
      answers,
    },
    { headers: { ...CORS, "Cache-Control": "no-store" } },
  );
}
