import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

// The review queue: recent verdicts close to the approval line that you have
// not rated or put in the pipeline yet. Newest first.
export async function GET() {
  const config = await getConfig();
  const where = {
    status: { in: ["APPROVED", "REJECTED"] as ("APPROVED" | "REJECTED")[] },
    feedback: null,
    stage: null,
    aiScore: { gte: config.reviewBandMin, lte: config.reviewBandMax },
    createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60_000) },
  };
  const [jobs, total] = await Promise.all([
    prisma.scrapedJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        platform: true,
        title: true,
        company: true,
        location: true,
        url: true,
        manualApplyUrl: true,
        applyMethod: true,
        salary: true,
        techStack: true,
        status: true,
        aiScore: true,
        aiReason: true,
        eligibility: true,
        description: true,
        createdAt: true,
      },
    }),
    prisma.scrapedJob.count({ where }),
  ]);
  return NextResponse.json({
    jobs: jobs.map((j) => ({ ...j, description: j.description ? j.description.slice(0, 4000) : null })),
    total,
    band: { min: config.reviewBandMin, max: config.reviewBandMax },
  });
}
