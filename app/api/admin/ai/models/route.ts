import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { listClaudeModels } from "@/lib/claudeClient";
import { CLAUDE_MODELS } from "@/lib/aiRoutes";

export const dynamic = "force-dynamic";

// The Claude models this key can use, straight from Anthropic's Models API —
// doubles as a key check. Known models carry their price for the cost hints.
export async function GET() {
  const config = await getConfig();
  if (!config.anthropicApiKey) {
    return NextResponse.json({ ok: false, error: "No Claude API key saved yet.", known: CLAUDE_MODELS, live: [] });
  }
  try {
    const live = await listClaudeModels(config.anthropicApiKey);
    return NextResponse.json({ ok: true, known: CLAUDE_MODELS, live });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: (e as Error).message || String(e),
      known: CLAUDE_MODELS,
      live: [],
    });
  }
}
