import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { google } from "googleapis";
import { getConfig, maskApiKey } from "@/lib/config";
import {
  fetchOpenRouterFreeModels,
  generateWithGemini,
  generateWithOpenRouter,
  generateWithGroq,
  generateWithCerebras,
  generateWithCloudflare,
  resolveRoute,
} from "@/lib/llmClient";
import { callClaude, listClaudeModels } from "@/lib/claudeClient";
import { recordAiUsage } from "@/lib/aiUsage";
import { adminOnly } from "@/lib/scope";

export const dynamic = "force-dynamic";

// vercel.json caps this route at 30s. Bound every connection test well under
// that ceiling so the function always finishes and returns a JSON body — a
// function killed at the 30s wall sends the browser an empty response, which
// the settings page can only report as the opaque "Unexpected end of JSON
// input" with no clue as to the real cause.
const TEST_DEADLINE_MS = 20_000;

// Race a promise that cannot be cancelled (the Gemini SDK ignores AbortSignal)
// against a stopwatch, so one hung request cannot eat the whole function
// budget. AbortSignal-aware calls also get a real signal where possible.
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
        ms,
      ),
    ),
  ]);
}

export async function POST(req: NextRequest) {
  const denied = await adminOnly(req);
  if (denied) return denied;
  // Everything runs inside one try: a bad request body, a DB error in
  // getConfig(), or any unexpected throw must still leave as JSON. A route
  // handler that throws returns an empty 500 body, which is exactly what the
  // browser was reporting as "Unexpected end of JSON input".
  try {
    const { target } = await req.json();
    const config = await getConfig();

    if (target === "gemini") {
      if (!config.geminiApiKey) {
        return NextResponse.json({ ok: false, error: "Gemini API key is empty in DB" });
      }
      const model = config.geminiModel || "gemini-2.5-flash";
      try {
        const genAI = new GoogleGenerativeAI(config.geminiApiKey);
        const m = genAI.getGenerativeModel({ model });
        const result = await withTimeout(
          m.generateContent("Reply with the single word: OK"),
          TEST_DEADLINE_MS,
          "Gemini request",
        );
        const text = result.response.text().trim();
        return NextResponse.json({
          ok: true,
          model,
          keyPreview: config.geminiApiKey.slice(0, 6) + "..." + config.geminiApiKey.slice(-4),
          sample: text.slice(0, 200),
        });
      } catch (e: any) {
        return NextResponse.json({
          ok: false,
          model,
          keyPreview: config.geminiApiKey.slice(0, 6) + "..." + config.geminiApiKey.slice(-4),
          error: String(e?.message || e),
        });
      }
    }

    if (target === "openrouter") {
      const apiKey = config.openrouterApiKey;
      if (!apiKey) {
        return NextResponse.json({ ok: false, error: "OpenRouter API key is empty in DB" });
      }
      const keyPreview = apiKey.slice(0, 8) + "..." + apiKey.slice(-4);
      const requested = config.openrouterModel || "auto";
      // One shared deadline covers the model lookup and the test call; once it
      // fires, in-flight fetches abort and the handler returns its JSON instead
      // of running the function out of time.
      const signal = AbortSignal.timeout(TEST_DEADLINE_MS);

      // List the live :free models purely for diagnostics. The actual test
      // call below goes through generateWithOpenRouter, so it exercises the
      // exact path the analyzer uses — :free models first, cheap paid fallback
      // only when every free model is busy.
      let liveFreeModels: string[] = [];
      try {
        liveFreeModels = await fetchOpenRouterFreeModels(apiKey, signal);
      } catch (e: any) {
        return NextResponse.json({
          ok: false,
          keyPreview,
          requestedModel: requested,
          error: `Could not list models: ${String(e?.message || e)}`,
        });
      }

      // A configured :free model missing from the live list has been retired.
      const requestedModelDead =
        requested !== "auto" && !liveFreeModels.includes(requested);
      const retiredWarning =
        `Saved model "${requested}" is retired (no endpoints on OpenRouter). ` +
        `Analysis still works — it auto-falls back to live free models — but set ` +
        `OpenRouter Model to "auto" to clear this warning.`;

      try {
        const r = await generateWithOpenRouter(
          "Reply with the single word: OK",
          apiKey,
          requested,
          signal,
          { tier: config.openrouterTier, paidModel: config.openrouterPaidModel },
        );
        // generateWithOpenRouter only ever returns a paid model id (no ":free"
        // suffix) when every free model was busy and the paid fallback ran,
        // OR when the tier is "nitro" (paid model with :nitro suffix tag).
        const usedPaidFallback = !r.model.endsWith(":free");
        const usedNitro = r.model.endsWith(":nitro");
        return NextResponse.json({
          ok: true,
          keyPreview,
          requestedModel: requested,
          tier: config.openrouterTier,
          modelUsed: r.model,
          freeModelsAvailable: liveFreeModels.length,
          firstFreeModels: liveFreeModels.slice(0, 8),
          ...(requestedModelDead && { warning: retiredWarning }),
          ...(usedNitro && {
            note:
              `Tier "nitro": paid model "${r.model}" answered via throughput-routed ` +
              `endpoint (~$0.0002 per 5-job batch, sub-5s typical).`,
          }),
          ...(usedPaidFallback && !usedNitro && {
            note:
              `Every :free model was busy, so the cheap paid fallback "${r.model}" ` +
              `answered (~$0.0002 per 5-job batch). Free models are always tried first.`,
          }),
          sample: r.text.trim().slice(0, 200),
        });
      } catch (e: any) {
        return NextResponse.json({
          ok: false,
          keyPreview,
          requestedModel: requested,
          tier: config.openrouterTier,
          freeModelsAvailable: liveFreeModels.length,
          firstFreeModels: liveFreeModels.slice(0, 8),
          ...(requestedModelDead && { warning: retiredWarning }),
          error: String(e?.message || e),
        });
      }
    }

    if (target === "groq") {
      if (!config.groqApiKey) {
        return NextResponse.json({ ok: false, error: "Groq API key is empty in DB" });
      }
      const keyPreview = config.groqApiKey.slice(0, 6) + "..." + config.groqApiKey.slice(-4);
      try {
        const r = await generateWithGroq(
          "Reply with the single word: OK",
          config.groqApiKey,
          config.groqModel,
          AbortSignal.timeout(TEST_DEADLINE_MS),
        );
        return NextResponse.json({
          ok: true,
          keyPreview,
          requestedModel: config.groqModel,
          modelUsed: r.model,
          sample: r.text.slice(0, 200),
        });
      } catch (e: any) {
        return NextResponse.json({
          ok: false,
          keyPreview,
          requestedModel: config.groqModel,
          error: String(e?.message || e),
        });
      }
    }

    if (target === "cerebras") {
      if (!config.cerebrasApiKey) {
        return NextResponse.json({ ok: false, error: "Cerebras API key is empty in DB" });
      }
      const keyPreview =
        config.cerebrasApiKey.slice(0, 6) + "..." + config.cerebrasApiKey.slice(-4);
      try {
        const r = await generateWithCerebras(
          "Reply with the single word: OK",
          config.cerebrasApiKey,
          config.cerebrasModel,
          AbortSignal.timeout(TEST_DEADLINE_MS),
        );
        return NextResponse.json({
          ok: true,
          keyPreview,
          requestedModel: config.cerebrasModel,
          modelUsed: r.model,
          sample: r.text.slice(0, 200),
        });
      } catch (e: any) {
        return NextResponse.json({
          ok: false,
          keyPreview,
          requestedModel: config.cerebrasModel,
          error: String(e?.message || e),
        });
      }
    }

    if (target === "cloudflare") {
      if (!config.cloudflareAccountId) {
        return NextResponse.json({ ok: false, error: "Cloudflare account id is empty in DB" });
      }
      if (!config.cloudflareApiKey) {
        return NextResponse.json({ ok: false, error: "Cloudflare API token is empty in DB" });
      }
      const keyPreview =
        config.cloudflareApiKey.slice(0, 6) + "..." + config.cloudflareApiKey.slice(-4);
      const requested = config.cloudflareModel || "@cf/meta/llama-3.1-8b-instruct";
      try {
        const r = await generateWithCloudflare(
          "Reply with the single word: OK",
          config.cloudflareAccountId,
          config.cloudflareApiKey,
          requested,
          AbortSignal.timeout(TEST_DEADLINE_MS),
        );
        return NextResponse.json({
          ok: true,
          keyPreview,
          accountId: config.cloudflareAccountId.slice(0, 6) + "...",
          requestedModel: requested,
          modelUsed: r.model,
          sample: r.text.slice(0, 200),
        });
      } catch (e: any) {
        return NextResponse.json({
          ok: false,
          keyPreview,
          requestedModel: requested,
          error: String(e?.message || e),
        });
      }
    }

    if (target === "claude") {
      if (!config.anthropicApiKey) {
        return NextResponse.json({ ok: false, error: "Claude API key is empty in DB" });
      }
      // The model under test: the one the LinkedIn route uses (or the default).
      const model = resolveRoute(config, "extension").claudeModel;
      try {
        const models = await withTimeout(listClaudeModels(config.anthropicApiKey), TEST_DEADLINE_MS, "Claude models list");
        const startedAt = Date.now();
        const r = await callClaude({
          apiKey: config.anthropicApiKey,
          model,
          effort: "low",
          user: "Reply with the single word: OK",
          maxTokens: 1000,
          timeoutMs: TEST_DEADLINE_MS,
        });
        await recordAiUsage({
          task: "test",
          provider: "claude",
          model: r.model,
          ok: true,
          ...r.usage,
          costUsd: r.costUsd,
          durationMs: Date.now() - startedAt,
        });
        return NextResponse.json({
          ok: true,
          keyPreview: maskApiKey(config.anthropicApiKey),
          testedModel: model,
          modelUsed: r.model,
          sample: r.text.slice(0, 200),
          costUsd: r.costUsd,
          modelAvailable: models.some((m) => m.id === model),
          availableModels: models.map((m) => m.id).slice(0, 30),
        });
      } catch (e: any) {
        return NextResponse.json({ ok: false, testedModel: model, error: String(e?.message || e) });
      }
    }

    if (target === "rotation") {
      // Test every provider used by the scan or extension route (or ticked in
      // the legacy checklist).
      const selected = Array.from(
        new Set([
          ...resolveRoute(config, "scan").providers,
          ...resolveRoute(config, "extension").providers,
          ...config.aiProviders,
        ]),
      );
      if (selected.length === 0) {
        return NextResponse.json({
          ok: false,
          error: "No providers selected. Tick at least one provider in Settings.",
        });
      }
      const out: Record<string, any> = {};
      let anyOk = false;
      const ping = "Reply with the single word: OK";
      // Share the budget across every ticked provider — each call gets whatever
      // time is left, so a slow first provider cannot starve the function.
      const startedAt = Date.now();
      const remaining = () => Math.max(1_000, TEST_DEADLINE_MS - (Date.now() - startedAt));

      for (const id of selected) {
        try {
          if (id === "claude") {
            if (!config.anthropicApiKey) {
              out.claude = "no key — skipped";
              continue;
            }
            const model = resolveRoute(config, "extension").claudeModel;
            const r = await callClaude({
              apiKey: config.anthropicApiKey,
              model,
              effort: "low",
              user: ping,
              maxTokens: 1000,
              timeoutMs: remaining(),
            });
            await recordAiUsage({ task: "test", provider: "claude", model: r.model, ok: true, ...r.usage, costUsd: r.costUsd });
            out.claude = `OK · ${r.model}`;
            anyOk = true;
          } else if (id === "gemini") {
            if (!config.geminiApiKey) {
              out.gemini = "no key — skipped";
              continue;
            }
            const r = await withTimeout(
              generateWithGemini(ping, config.geminiApiKey, config.geminiModel || "gemini-2.5-flash"),
              remaining(),
              "Gemini",
            );
            out.gemini = `OK · ${r.model}`;
            anyOk = true;
          } else if (id === "groq") {
            if (!config.groqApiKey) {
              out.groq = "no key — skipped";
              continue;
            }
            const r = await generateWithGroq(
              ping,
              config.groqApiKey,
              config.groqModel,
              AbortSignal.timeout(remaining()),
            );
            out.groq = `OK · ${r.model}`;
            anyOk = true;
          } else if (id === "cerebras") {
            if (!config.cerebrasApiKey) {
              out.cerebras = "no key — skipped";
              continue;
            }
            const r = await generateWithCerebras(
              ping,
              config.cerebrasApiKey,
              config.cerebrasModel,
              AbortSignal.timeout(remaining()),
            );
            out.cerebras = `OK · ${r.model}`;
            anyOk = true;
          } else if (id === "openrouter") {
            if (!config.openrouterApiKey) {
              out.openrouter = "no key — skipped";
              continue;
            }
            // Use the real analyzer path: it walks several free models and
            // skips ones whose upstream host is momentarily full, so one busy
            // model no longer fails the whole provider with a bare HTTP 402.
            const r = await generateWithOpenRouter(
              ping,
              config.openrouterApiKey,
              config.openrouterModel || "auto",
              AbortSignal.timeout(remaining()),
              { tier: config.openrouterTier, paidModel: config.openrouterPaidModel },
            );
            out.openrouter = `OK · ${r.model} (tier: ${config.openrouterTier})`;
            anyOk = true;
          } else if (id === "cloudflare") {
            if (!config.cloudflareAccountId || !config.cloudflareApiKey) {
              out.cloudflare = "no account id / token — skipped";
              continue;
            }
            const r = await generateWithCloudflare(
              ping,
              config.cloudflareAccountId,
              config.cloudflareApiKey,
              config.cloudflareModel || "@cf/meta/llama-3.1-8b-instruct",
              AbortSignal.timeout(remaining()),
            );
            out.cloudflare = `OK · ${r.model}`;
            anyOk = true;
          }
        } catch (e: any) {
          out[id] = `FAILED · ${String(e?.message || e).slice(0, 160)}`;
        }
      }

      return NextResponse.json({ ok: anyOk, ...out });
    }

    if (target === "sheets") {
      if (!config.googleSheetsCredentials) {
        return NextResponse.json({ ok: false, error: "Service Account JSON is empty" });
      }
      if (!config.googleSheetId) {
        return NextResponse.json({ ok: false, error: "Google Sheet ID is empty" });
      }
      try {
        const credentials = JSON.parse(config.googleSheetsCredentials);
        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
        const sheets = google.sheets({ version: "v4", auth });
        const meta = await withTimeout(
          sheets.spreadsheets.get({ spreadsheetId: config.googleSheetId }),
          TEST_DEADLINE_MS,
          "Google Sheets request",
        );
        return NextResponse.json({
          ok: true,
          sheetTitle: meta.data.properties?.title || "(unknown)",
          tabs: meta.data.sheets?.map((s) => s.properties?.title).filter(Boolean) || [],
          serviceAccount: credentials.client_email || "(no client_email field)",
        });
      } catch (e: any) {
        return NextResponse.json({ ok: false, error: String(e?.message || e) });
      }
    }

    return NextResponse.json({ ok: false, error: "Unknown target" }, { status: 400 });
  } catch (e: any) {
    // Last line of defence: the handler threw before any branch could answer
    // (malformed body, DB failure, etc.). Return JSON so the settings page can
    // show the real reason instead of choking on an empty body.
    return NextResponse.json({
      ok: false,
      error: `Connection test could not run: ${String(e?.message || e)}`,
    });
  }
}
