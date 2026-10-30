import Link from "next/link";

import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CLAUDE_EFFORT_INFO, claudeModelInfo, modelLabel, parseAiRoutes, PROVIDER_INFO, type ProviderId } from "@/lib/aiRoutes";
import { getConfig } from "@/lib/config";
import { formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type Config = Awaited<ReturnType<typeof getConfig>>;

const DAY_MS = 24 * 60 * 60_000;

/** The model a provider on the route answers with, and whether it has a key. */
function providerLine(id: ProviderId, c: Config, claudeModel: string, effort: string): { model: string; key: boolean } {
  switch (id) {
    case "claude":
      return { model: `${claudeModelInfo(claudeModel)?.label ?? claudeModel}, effort ${effort}`, key: !!c.anthropicApiKey };
    case "gemini":
      return { model: c.geminiModel || "gemini-2.5-flash", key: !!c.geminiApiKey };
    case "groq":
      return { model: c.groqModel, key: !!c.groqApiKey };
    case "cerebras":
      return { model: c.cerebrasModel, key: !!c.cerebrasApiKey };
    case "openrouter":
      return { model: c.openrouterModel || "auto", key: !!c.openrouterApiKey };
    case "cloudflare":
      return { model: c.cloudflareModel || "@cf/meta/llama-3.1-8b-instruct", key: !!(c.cloudflareAccountId && c.cloudflareApiKey) };
  }
}

/** The LinkedIn jobs each model judged in the last 7 days, and how many of its calls failed. */
async function answeredLastWeek(userId: number | null): Promise<Map<string, { ok: number; failed: number }>> {
  const groups = await prisma.aiUsage
    .groupBy({
      by: ["provider", "model", "ok"],
      where: { task: "extension", createdAt: { gte: new Date(Date.now() - 7 * DAY_MS) }, ...(userId == null ? {} : { userId }) },
      _count: { _all: true },
    })
    .catch(() => []);
  const byModel = new Map<string, { ok: number; failed: number }>();
  for (const g of groups) {
    const key = `${g.provider}:${g.model}`;
    const row = byModel.get(key) ?? { ok: 0, failed: 0 };
    if (g.ok) row.ok += g._count._all;
    else row.failed += g._count._all;
    byModel.set(key, row);
  }
  return byModel;
}

/**
 * Which AI judges LinkedIn jobs: the LinkedIn extension route in order (the first provider with a key that is not
 * resting answers), and who actually answered in the last 7 days.
 */
export async function LinkedInAiCard({ userId }: { userId: number | null }) {
  const [config, byModel] = await Promise.all([getConfig(), answeredLastWeek(userId)]);
  const route = parseAiRoutes(config.aiRoutesRaw, config.aiProviders).extension;
  const effort = CLAUDE_EFFORT_INFO[route.claudeEffort].split(" — ")[0].toLowerCase();
  return (
    <SectionCard
      title="AI for LinkedIn jobs"
      description="The LinkedIn extension route: the first provider with a key that is not resting judges each job; when it fails, the next one does."
      actions={
        <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/admin/ai?tab=routes" />}>
          Change in AI → Routes
        </Button>
      }
    >
      {route.providers.length === 0 ? (
        <p className="text-sm text-destructive">No provider: LinkedIn jobs can&apos;t be judged. Add one in AI → Routes.</p>
      ) : (
        <ol className="space-y-1 text-sm" aria-label="The LinkedIn extension route">
          {route.providers.map((p, i) => {
            const line = providerLine(p, config, route.claudeModel, effort);
            return (
              <li key={p} className="flex flex-wrap items-baseline gap-x-2">
                <span className="tabular text-muted-foreground">{i + 1}.</span>
                <span className="font-medium">{PROVIDER_INFO[p].label}</span>
                <span className="text-muted-foreground">{line.model}</span>
                {line.key ? null : <Badge variant="outline">no key, skipped</Badge>}
              </li>
            );
          })}
        </ol>
      )}
      <div className="space-y-1 text-sm">
        <p className="font-medium">Answered in the last 7 days</p>
        {byModel.size === 0 ? (
          <p className="text-muted-foreground">No LinkedIn job judged yet.</p>
        ) : (
          <ul className="space-y-0.5 text-muted-foreground" aria-label="Who answered in the last 7 days">
            {[...byModel.entries()]
              .sort((a, b) => b[1].ok - a[1].ok)
              .map(([model, n]) => (
                <li key={model}>
                  {modelLabel(model)}: {formatNumber(n.ok)} job{n.ok === 1 ? "" : "s"}
                  {n.failed ? `, ${formatNumber(n.failed)} failed` : ""}
                </li>
              ))}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}
