import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "./config";
import { safeEqual } from "./adminAuth";

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

// Returns an error response when the request is not allowed, else null.
// The key is required: without it anyone who finds the server URL could run
// (paid) AI analysis or read resume data.
export async function requireExtensionKey(
  req: NextRequest,
  cors: Record<string, string> = extensionCorsHeaders(),
): Promise<NextResponse | null> {
  const config = await getConfig();
  const expected = config.extensionApiKey.trim();
  if (!expected) {
    return NextResponse.json(
      {
        error:
          "The server has no extension API key yet. Open Admin → Extension, click New key, and paste it into the extension popup.",
        code: "extension_key_missing",
        action: "error",
        linkedInDismiss: false,
      },
      { status: 401, headers: cors },
    );
  }
  const given = (req.headers.get("x-api-key") || "").trim();
  if (!given || !safeEqual(given, expected)) {
    return NextResponse.json(
      {
        error: "Invalid extension API key. Copy the key from Admin → Extension into the popup.",
        code: "extension_key_invalid",
        action: "error",
        linkedInDismiss: false,
      },
      { status: 401, headers: cors },
    );
  }
  return null;
}
