import { after, NextRequest, NextResponse } from "next/server";
import { markApplied } from "@/lib/applications";
import { updateSheetsAfterChange } from "@/lib/googleSheetsSync";
import { extensionCorsHeaders, requireExtensionUser } from "@/lib/extensionAuth";

export const dynamic = "force-dynamic";

const CORS = extensionCorsHeaders("POST, OPTIONS");

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// POST { url, title?, company?, resumeId?, resumeName?, answers?: [{question, answer}], saveAnswers? }
// → moves the job to Applied (creating it when this form was found outside
// the scanners), stores what was sent, optionally keeps the answers. Right
// after the response the job goes to the user's Google Sheet, or its Stage
// there is updated.
export async function POST(req: NextRequest) {
  const auth = await requireExtensionUser(req, CORS);
  if (auth instanceof NextResponse) return auth;
  const userId = auth.user.id;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: CORS });
  }
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!/^https?:\/\//i.test(url)) return NextResponse.json({ error: "url is required" }, { status: 400, headers: CORS });
  try {
    const r = await markApplied(
      {
        userId,
        url,
        title: typeof body.title === "string" ? body.title.slice(0, 500) : undefined,
        company: typeof body.company === "string" ? body.company.slice(0, 300) : undefined,
        resumeId: Number.isInteger(body.resumeId) ? (body.resumeId as number) : null,
        resumeName: typeof body.resumeName === "string" ? body.resumeName.slice(0, 200) : null,
        answers: Array.isArray(body.answers) ? (body.answers as { question: string; answer: string }[]) : [],
        saveAnswers: body.saveAnswers === true,
      },
      // Who was signed in: the user, or an admin scanning for them.
      { id: auth.signedIn.id, via: "extension" },
    );
    after(() => updateSheetsAfterChange([r.jobId], { userId }));
    return NextResponse.json({ ok: true, ...r }, { headers: CORS });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message || String(e) }, { status: 500, headers: CORS });
  }
}
