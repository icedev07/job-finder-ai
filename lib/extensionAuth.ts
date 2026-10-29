import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "./config";
import { safeEqual } from "./adminAuth";
import { describeDbError } from "./dbErrors";
import { ownerUser, type UserRow } from "./users";

// The Chrome extension calls the API from linkedin.com pages and ATS forms, so
// these routes answer CORS for any origin — the X-API-Key header is what
// authenticates them.
export function extensionCorsHeaders(methods = "GET, POST, OPTIONS"): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
  };
}

function denied(error: string, code: string, cors: Record<string, string>, status = 401): NextResponse {
  return NextResponse.json({ error, code, action: "error", linkedInDismiss: false }, { status, headers: cors });
}

/**
 * The user an extension request works for, or the error response to return.
 * The key is required: without it anyone who finds the server URL could run
 * (paid) AI analysis or read resume data. The shared extension key acts as the
 * first admin, whose jobs and profile the extension used before users existed.
 */
export async function requireExtensionUser(
  req: NextRequest,
  cors: Record<string, string> = extensionCorsHeaders(),
): Promise<{ user: UserRow } | NextResponse> {
  let expected: string;
  let owner: UserRow | null;
  try {
    expected = (await getConfig()).extensionApiKey.trim();
    owner = await ownerUser();
  } catch (e) {
    return denied(describeDbError(e), "server_error", cors, 503);
  }
  if (!expected) {
    return denied(
      "The server has no extension API key yet. Open Admin → Extension, click New key, and paste it into the extension popup.",
      "extension_key_missing",
      cors,
    );
  }
  const given = (req.headers.get("x-api-key") || "").trim();
  if (!given || !safeEqual(given, expected)) {
    return denied("Invalid extension API key. Copy the key from Admin → Extension into the popup.", "extension_key_invalid", cors);
  }
  if (!owner || !owner.active) {
    return denied("The account this key belongs to is disabled. Ask the admin to enable it.", "user_disabled", cors, 403);
  }
  return { user: owner };
}
