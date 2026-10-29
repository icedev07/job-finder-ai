import { NextRequest, NextResponse } from "next/server";
import { draftAnswers, type QuestionIn, type QuestionKind } from "@/lib/answers";
import { LLMRateLimitedError } from "@/lib/llmClient";
import { extensionCorsHeaders, requireExtensionKey } from "@/lib/extensionAuth";

export const dynamic = "force-dynamic";

const CORS = extensionCorsHeaders("POST, OPTIONS");
const KINDS: QuestionKind[] = ["text", "textarea", "select", "radio"];

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// POST { questions: [{ id, label, kind, options?, maxLength? }], job: { title, company, url, text } }
// → [{ id, answer, source: "bank" | "ai", needsUser }]
export async function POST(req: NextRequest) {
  const denied = await requireExtensionKey(req, CORS);
  if (denied) return denied;
  let body: { questions?: unknown; job?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: CORS });
  }
  const questions: QuestionIn[] = (Array.isArray(body.questions) ? body.questions : [])
    .filter((q): q is Record<string, unknown> => !!q && typeof q === "object")
    .map((q) => ({
      id: String(q.id ?? "").slice(0, 100),
      label: String(q.label ?? "").trim().slice(0, 600),
      kind: KINDS.includes(q.kind as QuestionKind) ? (q.kind as QuestionKind) : "text",
      options: Array.isArray(q.options) ? q.options.map((o) => String(o).slice(0, 200)).slice(0, 60) : undefined,
      maxLength: Number.isFinite(Number(q.maxLength)) && Number(q.maxLength) > 0 ? Number(q.maxLength) : null,
    }))
    .filter((q) => q.id && q.label)
    .slice(0, 40);
  if (!questions.length) return NextResponse.json({ answers: [] }, { headers: CORS });
  const job = body.job ?? {};
  try {
    const answers = await draftAnswers(
      questions,
      {
        title: typeof job.title === "string" ? job.title.slice(0, 300) : undefined,
        company: typeof job.company === "string" ? job.company.slice(0, 200) : undefined,
        url: typeof job.url === "string" ? job.url.slice(0, 2000) : undefined,
        text: typeof job.text === "string" ? job.text.slice(0, 8000) : undefined,
      },
      AbortSignal.timeout(55_000),
    );
    return NextResponse.json({ answers }, { headers: CORS });
  } catch (e) {
    const message = (e as Error).message || String(e);
    return NextResponse.json(
      { error: message, code: e instanceof LLMRateLimitedError ? "ai_unavailable" : "ai_error" },
      { status: e instanceof LLMRateLimitedError ? 503 : 500, headers: CORS },
    );
  }
}
