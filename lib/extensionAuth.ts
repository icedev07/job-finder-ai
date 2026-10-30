import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "./config";
import { isWrite, markStatusStale } from "./statusCache";
import { safeEqual } from "./adminAuth";
import { describeDbError } from "./dbErrors";
import { checkExtensionToken } from "./extensionTokens";
import { getUser, ownerUser, type UserRow } from "./users";

// The Chrome extension calls the API from linkedin.com pages and ATS forms, so
// these routes answer CORS for any origin — the Authorization header (or the
// old X-API-Key) is what authenticates them.
export function extensionCorsHeaders(methods = "GET, POST, OPTIONS"): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-JF-For",
  };
}

/** "Scan for": the user id an admin works for in the extension (their own when absent). */
export const SCAN_FOR_HEADER = "x-jf-for";

function denied(error: string, code: string, cors: Record<string, string>, status = 401): NextResponse {
  return NextResponse.json({ error, code, action: "error", linkedInDismiss: false }, { status, headers: cors });
}

export type ExtensionAuth = {
  /** Whose data the request works on: the signed-in user, or the user an admin scans for. */
  user: UserRow;
  /** Who is signed in to the extension (the first admin for the old shared key). */
  signedIn: UserRow;
  /** The browser's sign-in; null for the old shared key, which has none. */
  tokenId: number | null;
};

const SIGN_IN_AGAIN = "Open the extension popup and sign in again with your user ID and password.";

// The extension 2.0 and older sends the shared key from Admin → Extension. It
// still works, as the first admin (whose jobs and profile it used before users
// existed), until an admin turns it off.
async function legacyKeyUser(given: string, cors: Record<string, string>): Promise<UserRow | NextResponse> {
  const expected = (await getConfig()).extensionApiKey.trim();
  if (!expected || !safeEqual(given, expected)) {
    return denied(
      `The shared extension key is ${expected ? "wrong" : "turned off"}. Update the extension to 2.1 or newer and sign in with your user ID and password.`,
      "extension_key_invalid",
      cors,
    );
  }
  const owner = await ownerUser();
  if (!owner || !owner.active) {
    return denied("The account this key belongs to is disabled. Ask the admin to enable it.", "user_disabled", cors, 403);
  }
  return owner;
}

/**
 * The user an extension request works for, or the error response to return.
 * A sign-in is required: without it anyone who finds the server URL could run
 * (paid) AI analysis or read resume data.
 */
export async function requireExtensionUser(
  req: NextRequest,
  cors: Record<string, string> = extensionCorsHeaders(),
): Promise<ExtensionAuth | NextResponse> {
  // A scan saves jobs: the status strip (the extension's last call) reads everything again.
  if (isWrite(req.method)) markStatusStale();
  const bearer = /^Bearer\s+(\S+)$/i.exec(req.headers.get("authorization") || "")?.[1];
  const key = (req.headers.get("x-api-key") || "").trim();
  let signedIn: UserRow;
  let tokenId: number | null = null;
  try {
    if (bearer) {
      const check = await checkExtensionToken(bearer);
      if (!check.ok) {
        if (check.reason === "disabled") {
          return denied("Your account is disabled. Ask an admin to turn it back on.", "user_disabled", cors, 403);
        }
        return denied(
          check.reason === "ended"
            ? `Your sign-in ended (a new password, or "sign out everywhere"). ${SIGN_IN_AGAIN}`
            : `This browser is signed out. ${SIGN_IN_AGAIN}`,
          "signed_out",
          cors,
        );
      }
      signedIn = check.user;
      tokenId = check.tokenId;
    } else if (key) {
      const owner = await legacyKeyUser(key, cors);
      if (owner instanceof NextResponse) return owner;
      signedIn = owner;
    } else {
      return denied("Sign in first: open the extension popup and enter your user ID and password.", "signed_out", cors);
    }
  } catch (e) {
    return denied(describeDbError(e), "server_error", cors, 503);
  }

  const forRaw = (req.headers.get(SCAN_FOR_HEADER) || "").trim();
  const forId = forRaw ? Number(forRaw) : signedIn.id;
  if (forId === signedIn.id) return { user: signedIn, signedIn, tokenId };
  if (signedIn.role !== "ADMIN") {
    return denied("Only admins can scan for another user.", "scan_for_forbidden", cors, 403);
  }
  let target: UserRow | null;
  try {
    target = Number.isInteger(forId) && forId > 0 ? await getUser(forId) : null;
  } catch (e) {
    return denied(describeDbError(e), "server_error", cors, 503);
  }
  if (!target) {
    return denied("That user no longer exists. Pick another one under “Scan for” in the popup.", "scan_for_unknown", cors, 404);
  }
  if (!target.active) {
    return denied(`${target.name}'s account is disabled. Pick another user under “Scan for”.`, "scan_for_disabled", cors, 403);
  }
  return { user: target, signedIn, tokenId };
}
