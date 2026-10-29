import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminScope } from "@/lib/scope";
import { reviewQueueWhere, scopedUsers } from "@/lib/status";

export const dynamic = "force-dynamic";

// The review queue of the user being viewed (or of every user): recent
// verdicts inside each user's own score band that nobody has rated or put in
// the pipeline yet. Newest first.
export async function GET(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const users = await scopedUsers(scope);
  const where = reviewQueueWhere(users);
  const [jobs, total] = users.length
    ? await Promise.all([
        prisma.scrapedJob.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            userId: true,
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
      ])
    : [[], 0];
  // One user's band; with all users each has their own, so none is shown.
  const one = users.length === 1 ? users[0].settings : null;
  return NextResponse.json({
    jobs: jobs.map((j) => ({ ...j, description: j.description ? j.description.slice(0, 4000) : null })),
    total,
    band: one ? { min: one.reviewBandMin, max: one.reviewBandMax } : null,
  });
}
