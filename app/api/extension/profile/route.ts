import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProfile } from "@/lib/profile";
import { listResumes } from "@/lib/resumes";
import { extensionCorsHeaders, requireExtensionUser } from "@/lib/extensionAuth";

export const dynamic = "force-dynamic";

const CORS = extensionCorsHeaders("GET, OPTIONS");

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// Everything autofill needs up front: the profile, the resume variants (no
// file bytes) and the most-used saved answers.
export async function GET(req: NextRequest) {
  const auth = await requireExtensionUser(req, CORS);
  if (auth instanceof NextResponse) return auth;
  const userId = auth.user.id;
  const [profile, resumes, answers] = await Promise.all([
    getProfile(userId),
    listResumes(userId).catch(() => []),
    prisma.savedAnswer
      .findMany({
        where: { userId },
        orderBy: [{ uses: "desc" }, { updatedAt: "desc" }],
        take: 100,
        select: { question: true, answer: true },
      })
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
