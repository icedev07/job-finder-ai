import { NextRequest, NextResponse } from "next/server";
import { markApplied } from "@/lib/applications";
import { extensionCorsHeaders, requireExtensionKey } from "@/lib/extensionAuth";

export const dynamic = "force-dynamic";

const CORS = extensionCorsHeaders("POST, OPTIONS");

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// POST { url, title?, company?, resumeId?, resumeName?, answers?: [{question, answer}], saveAnswers? }
// → moves the job to Applied (creating it when this form was found outside
// the scanners), stores what was sent, optionally keeps the answers.
export async function POST(req: NextRequest) {
  const denied = await requireExtensionKey(req, CORS);
  if (denied) return denied;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: CORS });
  }
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!/^https?:\/\//i.test(url)) return NextResponse.json({ error: "url is required" }, { status: 400, headers: CORS });
  try {
    const r = await markApplied({
      url,
      title: typeof body.title === "string" ? body.title.slice(0, 500) : undefined,
      company: typeof body.company === "string" ? body.company.slice(0, 300) : undefined,
      resumeId: Number.isInteger(body.resumeId) ? (body.resumeId as number) : null,
      resumeName: typeof body.resumeName === "string" ? body.resumeName.slice(0, 200) : null,
      answers: Array.isArray(body.answers) ? (body.answers as { question: string; answer: string }[]) : [],
      saveAnswers: body.saveAnswers === true,
    });
    return NextResponse.json({ ok: true, ...r }, { headers: CORS });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message || String(e) }, { status: 500, headers: CORS });
  }
}
