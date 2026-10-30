import { NextRequest, NextResponse } from "next/server";
import { clearLoginFailures, clientIdFromHeaders, loginBlockedForMs, recordLoginFailure } from "@/lib/adminAuth";
import { describeDbError } from "@/lib/dbErrors";
import { extensionCorsHeaders, requireExtensionUser } from "@/lib/extensionAuth";
import { extensionMe } from "@/lib/extensionMe";
import { browserLabel, createExtensionToken, revokeExtensionToken } from "@/lib/extensionTokens";
import { normalizeUsername, verifyLogin } from "@/lib/users";

export const dynamic = "force-dynamic";

const CORS = extensionCorsHeaders("POST, DELETE, OPTIONS");

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { ...CORS, "Cache-Control": "no-store" } });
}

// POST { username, password } → sign this browser in to the extension: a token
// for the Authorization header, plus who is signed in and their settings
// (as GET /api/extension/me). Every role may sign in here, not only admins.
export async function POST(req: NextRequest) {
  let username = "";
  let password = "";
  try {
    const body = await req.json();
    username = normalizeUsername(body?.username);
    password = String(body?.password ?? "");
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }
  if (!username || !password) return json({ error: "Enter your user ID and password." }, 400);

  // The same throttle as the dashboard's sign-in: guesses count across both.
  const clientId = clientIdFromHeaders(req.headers);
  const blockedMs = loginBlockedForMs(clientId);
  if (blockedMs > 0) {
    return json({ error: `Too many failed attempts. Try again in ${Math.ceil(blockedMs / 60_000)} min.` }, 429);
  }

  try {
    const result = await verifyLogin(username, password, { extension: true });
    if (!result.ok) {
      if (result.reason === "invalid") {
        recordLoginFailure(clientId);
        // A short pause makes scripted guessing slower.
        await new Promise((r) => setTimeout(r, 400));
        return json({ error: "Wrong user ID or password." }, 401);
      }
      clearLoginFailures(clientId);
      return json({ error: "This account is disabled. Ask an admin to turn it back on." }, 403);
    }
    clearLoginFailures(clientId);
    const token = await createExtensionToken(result.user, browserLabel(req.headers.get("user-agent")));
    return json({ token, ...(await extensionMe(result.user, result.user)) });
  } catch (e) {
    return json({ error: `Cannot sign in right now. ${describeDbError(e)}` }, 503);
  }
}

// DELETE → sign this browser out (its token stops working).
export async function DELETE(req: NextRequest) {
  const auth = await requireExtensionUser(req, CORS);
  if (auth instanceof NextResponse) return auth;
  if (auth.tokenId != null) await revokeExtensionToken(auth.tokenId);
  return json({ ok: true });
}
