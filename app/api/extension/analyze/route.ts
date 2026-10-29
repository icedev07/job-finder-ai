import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { upsertScrapedJob } from "@/lib/scrapedJobs";
import { analyzeJob } from "@/lib/jobAnalyzer";
import { LLMRateLimitedError } from "@/lib/llmClient";
import { syncJobToLinkedInTab } from "@/lib/googleSheetsSync";
import { prisma } from "@/lib/prisma";
import { extensionCorsHeaders, requireExtensionUser } from "@/lib/extensionAuth";

const CORS = extensionCorsHeaders("POST, OPTIONS");
const MAX_DESC_CHARS = 120_000;
// Vercel caps this route at 60s; stop the AI chain a little before that so
// the extension always gets a JSON answer.
const ROUTE_DEADLINE_MS = 52_000;

// Reason stored when the extension auto-rejects an Easy Apply job. Rows with
// this reason were never judged by the AI, so "Analyze with AI" re-checks them.
const EASY_APPLY_AUTO_REASON = "Easy Apply - auto rejected (detected by extension)";

type EasyApplyMode = "skip" | "analyze";

// Ghost-job signals the extension read from LinkedIn (posting age, reposted,
// applicant count). Only these three short fields are kept.
function cleanSignals(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (typeof r.postedText === "string" && r.postedText.trim()) out.postedText = r.postedText.trim().slice(0, 60);
  if (typeof r.reposted === "boolean") out.reposted = r.reposted;
  if (typeof r.applicants === "string" && r.applicants.trim()) out.applicants = r.applicants.trim().slice(0, 60);
  return Object.keys(out).length ? JSON.stringify(out) : null;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: CORS });
}

export async function POST(req: NextRequest) {
  const auth = await requireExtensionUser(req, CORS);
  if (auth instanceof NextResponse) return auth;
  const userId = auth.user.id;

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body", action: "error", linkedInDismiss: false }, 400);
  }
  const { title, company, location, url, applyUrl, description } = body;
  const easyApply = body.easyApply === true;
  // Older extension builds don't send a mode — they expect the original
  // skip-and-hide behaviour.
  const easyApplyMode: EasyApplyMode = body.easyApplyMode === "analyze" ? "analyze" : "skip";
  const easyApplyMinScore = Math.min(100, Math.max(0, Math.round(Number(body.easyApplyMinScore) || 0)));

  if (!title || !company || !url) {
    return json({ error: "title, company, and url are required" }, 400);
  }

  const applyMethod = easyApply ? "EASY_APPLY" : "EXTERNAL";
  const desc = typeof description === "string" ? description.slice(0, MAX_DESC_CHARS) : description;

  try {
    const manualApplyStored =
      !easyApply && typeof applyUrl === "string" && applyUrl.trim().length > 0 ? applyUrl.trim() : null;
    console.log(
      `[Extension] Received: title="${title}", company="${company}", location="${location}", easyApply=${easyApply} (mode=${easyApplyMode}), descLen=${description?.length || 0}, url=${url}, applyUrl=${typeof applyUrl === "string" ? applyUrl : ""}`,
    );

    const saved = await upsertScrapedJob({
      userId,
      platform: "linkedin",
      title,
      company,
      url,
      location,
      description: desc,
      manualApplyUrl: manualApplyStored,
    });

    if (!saved) {
      return json({
        action: easyApply && easyApplyMode === "skip" ? "easy_apply" : "skipped",
        reason: "Blocked by skip rule",
        alreadyExists: false,
        score: 0,
        applyMethod,
      });
    }

    const existing = await prisma.scrapedJob.findUnique({
      where: { id: saved.id },
      select: { status: true, aiScore: true, aiReason: true, platform: true, applyMethod: true },
    });
    if (!existing) {
      return json({ error: "Job record not found", action: "error", linkedInDismiss: false }, 500);
    }
    // Dedup can match the same job stored from another board. Only LinkedIn
    // rows get LinkedIn's apply method.
    const isLinkedInRow = existing.platform === "linkedin";
    const autoRejectedAsEasyApply = (existing.aiReason || "").startsWith("Easy Apply - auto rejected");
    const signals = cleanSignals(body.signals);
    if (signals && isLinkedInRow) {
      await prisma.scrapedJob.update({ where: { id: saved.id }, data: { signals } }).catch(() => {});
    }

    // ── Easy Apply, "Skip and hide" mode (the default) ─────────────────────
    if (easyApply && easyApplyMode === "skip") {
      if (existing.status !== "PENDING") {
        // Never overwrite a verdict that already exists — e.g. the same job
        // approved from a job board.
        return json({
          action: "easy_apply",
          reason: autoRejectedAsEasyApply ? "Easy Apply - auto rejected" : "Easy Apply - kept the earlier verdict for this job",
          alreadyExists: !autoRejectedAsEasyApply,
          score: existing.aiScore || 0,
          applyMethod,
        });
      }
      const easyUp = await prisma.scrapedJob.updateMany({
        where: { id: saved.id, status: "PENDING" },
        data: {
          status: "REJECTED",
          aiScore: 0,
          aiReason: EASY_APPLY_AUTO_REASON,
          manualApplyUrl: null,
          ...(isLinkedInRow ? { applyMethod } : {}),
        },
      });
      if (easyUp.count > 0) {
        await prisma.analysisLog.create({
          data: {
            scrapedJobId: saved.id,
            model: "extension-auto",
            approved: false,
            score: 0,
            reason: EASY_APPLY_AUTO_REASON,
            tokensUsed: 0,
            durationMs: 0,
          },
        });
      }
      return json({ action: "easy_apply", reason: "Easy Apply - auto rejected", alreadyExists: false, score: 0, applyMethod });
    }

    // ── Normal AI analysis (external apply, or Easy Apply in "Analyze" mode) ─
    const reanalyzeEasyApply = easyApply && autoRejectedAsEasyApply;
    if (existing.status !== "PENDING" && !reanalyzeEasyApply) {
      if (isLinkedInRow && !existing.applyMethod) {
        await prisma.scrapedJob.update({ where: { id: saved.id }, data: { applyMethod } });
      }
      return json({
        action: existing.status === "APPROVED" ? "approved" : "rejected",
        reason: existing.aiReason || "Already analyzed",
        alreadyExists: true,
        score: existing.aiScore || 0,
        applyMethod,
      });
    }

    const prep = await prisma.scrapedJob.updateMany({
      where: { id: saved.id },
      data: {
        ...(typeof desc === "string" && desc.length > 0 ? { description: desc } : {}),
        ...(isLinkedInRow ? { applyMethod } : {}),
        // An Easy Apply job auto-rejected by an earlier scan goes back to
        // PENDING so the AI judges it this time.
        ...(reanalyzeEasyApply ? { status: "PENDING" as const, aiScore: null, aiReason: null } : {}),
      },
    });
    if (prep.count === 0) {
      return json({ error: "Job record not found for description update", action: "error", linkedInDismiss: false }, 500);
    }

    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(), ROUTE_DEADLINE_MS);
    let result;
    try {
      result = await analyzeJob(
        saved.id,
        deadline.signal,
        easyApply && easyApplyMinScore > 0
          ? { minScore: easyApplyMinScore, minScoreLabel: "Easy Apply minimum score" }
          : {},
      );
    } finally {
      clearTimeout(timer);
    }
    console.log(
      `[Extension] AI result for "${title}": approved=${result.approved}, score=${result.score}, reason="${result.reason}"`,
    );

    if (result.approved) {
      const job = await prisma.scrapedJob.findUnique({ where: { id: saved.id } });
      if (job) {
        try {
          await syncJobToLinkedInTab(job);
        } catch (err: any) {
          console.error(`LinkedIn sheet sync failed: ${err.message}`);
        }
      }
    }

    return json({
      action: result.approved ? "approved" : "rejected",
      reason: result.reason,
      alreadyExists: false,
      score: result.score,
      applyMethod,
      ...(!result.approved && result.linkedInDismiss === false ? { linkedInDismiss: false } : {}),
    });
  } catch (error: any) {
    // Every AI provider is rate-limited / out of quota (or the deadline hit).
    // The job row is still PENDING (analyzeJob re-throws before writing a
    // verdict), so leave it for a later pass and tell the extension NOT to
    // dismiss it on LinkedIn.
    if (error instanceof LLMRateLimitedError || error?.message === "LLM call aborted") {
      return json({
        action: "error",
        reason: `AI unavailable — job kept pending, will retry later: ${error.message}`,
        alreadyExists: false,
        score: 0,
        linkedInDismiss: false,
      });
    }
    return json({ error: error.message, action: "error", linkedInDismiss: false }, 500);
  }
}
