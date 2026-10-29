import { prisma } from "./prisma";
import { normalizeUrl } from "./scrapedJobs";
import { updateJobs } from "./jobActions";
import { rememberAnswers } from "./answers";

// Link an application form the extension is filling to a stored job, and
// record "Mark as applied".

export type MatchedJob = {
  id: number;
  title: string;
  company: string;
  status: string;
  aiScore: number | null;
  aiReason: string | null;
  stage: string | null;
  description: string | null;
};

// The same posting shows up under slightly different URLs (…/apply, tracking
// params, a trailing slash), so try a few spellings.
function urlCandidates(raw: string): string[] {
  const out = new Set<string>();
  try {
    const u = new URL(raw);
    out.add(normalizeUrl(u.toString()));
    const noQuery = new URL(u.toString());
    noQuery.search = "";
    out.add(normalizeUrl(noQuery.toString()));
    for (const base of [u, noQuery]) {
      const stripped = new URL(base.toString());
      stripped.pathname = stripped.pathname.replace(/\/(apply|application)\/?$/i, "");
      out.add(normalizeUrl(stripped.toString()));
    }
  } catch {
    if (raw.trim()) out.add(raw.trim());
  }
  return [...out].filter(Boolean);
}

const MATCH_SELECT = {
  id: true,
  title: true,
  company: true,
  status: true,
  aiScore: true,
  aiReason: true,
  stage: true,
  description: true,
} as const;

export async function findJobForPage(params: { url: string; title?: string; company?: string }): Promise<MatchedJob | null> {
  const candidates = urlCandidates(params.url);
  if (candidates.length) {
    const byUrl = await prisma.scrapedJob.findFirst({
      where: { OR: [{ manualApplyUrl: { in: candidates } }, { url: { in: candidates } }] },
      orderBy: { createdAt: "desc" },
      select: MATCH_SELECT,
    });
    if (byUrl) return byUrl;
  }
  const title = params.title?.trim();
  const company = params.company?.trim();
  if (title && company) {
    return prisma.scrapedJob.findFirst({
      where: { title: { equals: title, mode: "insensitive" }, company: { equals: company, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      select: MATCH_SELECT,
    });
  }
  return null;
}

export function platformFromUrl(raw: string): string {
  let host = "";
  try {
    host = new URL(raw).hostname.toLowerCase();
  } catch {
    return "company-site";
  }
  const known: [RegExp, string][] = [
    [/greenhouse\.io$/, "greenhouse"],
    [/lever\.co$/, "lever"],
    [/ashbyhq\.com$/, "ashby"],
    [/workable\.com$/, "workable"],
    [/smartrecruiters\.com$/, "smartrecruiters"],
    [/personio\.(de|com)$/, "personio"],
    [/recruitee\.com$/, "recruitee"],
    [/teamtailor\.com$/, "teamtailor"],
    [/myworkdayjobs\.com$/, "workday"],
    [/linkedin\.com$/, "linkedin"],
  ];
  return known.find(([re]) => re.test(host))?.[1] ?? "company-site";
}

export type ApplyInput = {
  url: string;
  title?: string;
  company?: string;
  resumeId?: number | null;
  resumeName?: string | null;
  answers?: { question: string; answer: string }[];
  saveAnswers?: boolean;
};

export async function markApplied(input: ApplyInput): Promise<{ jobId: number; created: boolean; savedAnswers: number }> {
  let job = await findJobForPage(input);
  let created = false;
  if (!job) {
    const title = input.title?.trim() || "Untitled role";
    const company = input.company?.trim() || "Unknown company";
    const url = normalizeUrl(input.url);
    const platform = platformFromUrl(input.url);
    try {
      const row = await prisma.scrapedJob.create({
        data: {
          platform,
          title,
          company,
          url,
          manualApplyUrl: url,
          applyMethod: platform === "linkedin" ? "EASY_APPLY" : "EXTERNAL",
          status: "APPROVED",
          aiReason: "Added by the extension when you applied (not judged by the AI).",
        },
        select: MATCH_SELECT,
      });
      job = row;
      created = true;
    } catch {
      // A concurrent request (or the same posting stored under another URL
      // spelling) created it first.
      job = await prisma.scrapedJob.findFirst({ where: { platform, title, company }, select: MATCH_SELECT });
      if (!job) throw new Error("Could not create the job record");
    }
  }

  const answers = (input.answers ?? [])
    .filter((a) => a && typeof a.question === "string" && typeof a.answer === "string" && a.answer.trim())
    .slice(0, 60)
    .map((a) => ({ question: a.question.slice(0, 1000), answer: a.answer.slice(0, 8000) }));

  await updateJobs([job.id], { stage: "APPLIED" });
  await prisma.scrapedJob.update({
    where: { id: job.id },
    data: {
      resumeId: input.resumeId ?? null,
      applicationData: JSON.stringify({
        appliedAt: new Date().toISOString(),
        url: input.url,
        resumeName: input.resumeName ?? null,
        answers,
      }),
    },
  });
  const savedAnswers = input.saveAnswers ? await rememberAnswers(answers) : 0;
  return { jobId: job.id, created, savedAnswers };
}
