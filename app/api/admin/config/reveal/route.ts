import { NextRequest, NextResponse } from "next/server";
import { CONFIG_KEYS, getAllConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

// Secrets are write-only, with one exception: the extension API key has to be
// copied into the extension popup, so the signed-in admin may reveal it.
const REVEALABLE = new Set<string>([CONFIG_KEYS.EXTENSION_API_KEY]);

export async function POST(req: NextRequest) {
  let key = "";
  try {
    key = String((await req.json())?.key ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!REVEALABLE.has(key)) {
    return NextResponse.json({ error: "This setting cannot be revealed." }, { status: 403 });
  }
  const all = await getAllConfig();
  return NextResponse.json({ key, value: all[key] || "" }, { headers: { "Cache-Control": "no-store" } });
}
