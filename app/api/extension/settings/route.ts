import { NextRequest, NextResponse } from "next/server";
import { describeDbError } from "@/lib/dbErrors";
import { extensionCorsHeaders, requireExtensionUser } from "@/lib/extensionAuth";
import { saveExtensionSettings } from "@/lib/extensionSettings";

export const dynamic = "force-dynamic";

const CORS = extensionCorsHeaders("PUT, OPTIONS");

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// PUT { easyApplyMode?, easyApplyMinScore?, jobLimit?, hideApproved?, betaMode?, sendLogs? }
// → save the popup's settings for the user it works for; the rest stay. Returns all of them.
export async function PUT(req: NextRequest) {
  const auth = await requireExtensionUser(req, CORS);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: CORS });
  }
  try {
    return NextResponse.json({ settings: await saveExtensionSettings(auth.user.id, body) }, { headers: CORS });
  } catch (e) {
    return NextResponse.json({ error: describeDbError(e) }, { status: 503, headers: CORS });
  }
}
