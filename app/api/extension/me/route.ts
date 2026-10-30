import { NextRequest, NextResponse } from "next/server";
import { describeDbError } from "@/lib/dbErrors";
import { extensionCorsHeaders, requireExtensionUser } from "@/lib/extensionAuth";
import { extensionMe } from "@/lib/extensionMe";

export const dynamic = "force-dynamic";

const CORS = extensionCorsHeaders("GET, OPTIONS");

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// Who is signed in, whose jobs a scan saves (X-JF-For when an admin scans for
// someone else), their search and their extension settings. The popup asks
// each time it opens, so a revoked sign-in shows at once.
export async function GET(req: NextRequest) {
  const auth = await requireExtensionUser(req, CORS);
  if (auth instanceof NextResponse) return auth;
  try {
    return NextResponse.json(await extensionMe(auth.user, auth.signedIn), {
      headers: { ...CORS, "Cache-Control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json({ error: describeDbError(e) }, { status: 503, headers: CORS });
  }
}
