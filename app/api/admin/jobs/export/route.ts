import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jobsOrderBy, jobsWhere, parseJobsQuery } from "@/lib/jobsQuery";
import { adminScope, viewingUserId } from "@/lib/scope";

export const dynamic = "force-dynamic";

const MAX_ROWS = 5000;

// Spreadsheet apps execute cells starting with = + - @ — prefix them with a
// quote so scraped text can never run as a formula.
function csvCell(v: unknown): string {
  let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET (same filters as the Jobs list, ?user= for whose) → CSV download of every matching job.
export async function GET(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const q = parseJobsQuery(new URL(req.url).searchParams);
  const userId = viewingUserId(scope);
  const userName = new Map(scope.users.map((u) => [u.id, u.username]));
  const jobs = await prisma.scrapedJob.findMany({
    where: jobsWhere(q, userId),
    orderBy: jobsOrderBy(q.sort),
    take: MAX_ROWS,
    select: {
      id: true,
      userId: true,
      createdAt: true,
      platform: true,
      title: true,
      company: true,
      location: true,
      status: true,
      aiScore: true,
      aiReason: true,
      eligibility: true,
      applyMethod: true,
      stage: true,
      closeReason: true,
      appliedAt: true,
      followUpAt: true,
      feedback: true,
      salary: true,
      techStack: true,
      url: true,
      manualApplyUrl: true,
    },
  });
  const header = [
    "id",
    "user",
    "found",
    "source",
    "title",
    "company",
    "location",
    "status",
    "score",
    "reason",
    "eligibility",
    "apply_via",
    "stage",
    "close_reason",
    "applied_at",
    "follow_up_at",
    "feedback",
    "salary",
    "tech_stack",
    "job_url",
    "apply_url",
  ];
  const lines = [header.join(",")];
  for (const j of jobs) {
    lines.push(
      [
        j.id,
        userName.get(j.userId) ?? j.userId,
        j.createdAt,
        j.platform,
        j.title,
        j.company,
        j.location,
        j.status,
        j.aiScore,
        j.aiReason,
        j.eligibility,
        j.applyMethod,
        j.stage,
        j.closeReason,
        j.appliedAt,
        j.followUpAt,
        j.feedback,
        j.salary,
        j.techStack,
        j.url,
        j.manualApplyUrl,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(`﻿${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="jobs-${userId != null ? `${userName.get(userId)}-` : ""}${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
