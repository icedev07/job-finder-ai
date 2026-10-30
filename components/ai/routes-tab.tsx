'use client';

import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TriangleAlertIcon, XIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { SaveBar } from '@/components/common/save-bar';
import { SectionCard } from '@/components/common/section-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AI_TASK_INFO,
  AI_TASKS,
  CLAUDE_EFFORT_INFO,
  CLAUDE_EFFORTS,
  CLAUDE_MODELS,
  claudeCostUsd,
  FREE_PROVIDER_IDS,
  parseAiRoutes,
  PROVIDER_IDS,
  PROVIDER_INFO,
  type AiRoutes,
  type AiTask,
  type ClaudeEffort,
  type ProviderId,
} from '@/lib/aiRoutes';
import { errorMessage } from '@/lib/clientApi';
import { formatUsd } from '@/lib/format';
import { saveAdminConfig, type AdminConfig } from '@/lib/useAdminConfig';
import { cn } from '@/lib/utils';

// Rough tokens per unit of work (one job / resume / answer / draft), with the shared
// rules prompt served from cache. Only for the estimate shown under each route.
const UNIT: Record<AiTask, { unit: string; input: number; cached: number; output: number }> = {
  scan: { unit: 'jobs', input: 900, cached: 220, output: 250 },
  extension: { unit: 'jobs', input: 2000, cached: 1100, output: 400 },
  resume: { unit: 'resumes', input: 6000, cached: 0, output: 2500 },
  answers: { unit: 'answers', input: 2500, cached: 900, output: 350 },
  writing: { unit: 'drafts', input: 3500, cached: 0, output: 900 },
};
// Higher effort → more thinking → more output tokens (approximate).
const EFFORT_OUTPUT: Record<ClaudeEffort, number> = { low: 1, medium: 1.6, high: 2.5, xhigh: 4, max: 6 };

function estimatePer1000(task: AiTask, model: string, effort: ClaudeEffort): number | null {
  const u = UNIT[task];
  const per = claudeCostUsd(model, {
    inputTokens: u.input,
    outputTokens: Math.round(u.output * EFFORT_OUTPUT[effort]),
    cacheReadTokens: u.cached,
    cacheWriteTokens: 0,
  });
  return per == null ? null : per * 1000;
}

function hasKey(id: ProviderId, config: AdminConfig): boolean {
  const s = config.secrets ?? {};
  switch (id) {
    case 'claude':
      return !!s.anthropic_api_key?.set;
    case 'cloudflare':
      return !!s.cloudflare_api_key?.set && !!config.cloudflare_account_id;
    default:
      return !!s[`${id}_api_key`]?.set;
  }
}

function legacySelected(config: AdminConfig): string[] {
  try {
    const v = JSON.parse(config.ai_providers || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function RoutesTab({ config, reload }: { config: AdminConfig; reload: () => void }) {
  const saved = useMemo(() => parseAiRoutes(config.ai_routes, legacySelected(config)), [config]);
  const [routes, setRoutes] = useState<AiRoutes>(saved);
  const [saving, setSaving] = useState(false);
  // Fresh config from the server replaces the draft.
  const [lastSaved, setLastSaved] = useState(saved);
  if (saved !== lastSaved) {
    setLastSaved(saved);
    setRoutes(saved);
  }

  const dirty = AI_TASKS.filter((t) => JSON.stringify(routes[t]) !== JSON.stringify(saved[t]));

  function update(task: AiTask, patch: Partial<AiRoutes[AiTask]>) {
    setRoutes((r) => ({ ...r, [task]: { ...r[task], ...patch } }));
  }

  function move(task: AiTask, index: number, delta: -1 | 1) {
    const list = [...routes[task].providers];
    const j = index + delta;
    if (j < 0 || j >= list.length) return;
    [list[index], list[j]] = [list[j], list[index]];
    update(task, { providers: list });
  }

  async function save() {
    setSaving(true);
    try {
      // Keep the legacy provider list in step (older code paths read it).
      const free = Array.from(
        new Set([...routes.scan.providers, ...routes.extension.providers].filter((p) => (FREE_PROVIDER_IDS as readonly string[]).includes(p))),
      );
      await saveAdminConfig({ ai_routes: JSON.stringify(routes), ai_providers: JSON.stringify(free) });
      toast.success('Routes saved');
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Each task tries its providers from top to bottom. When one is rate-limited, out of budget or failing, the next one
        answers — a job is never rejected because a provider was down. Claude&apos;s <strong>level</strong> is its effort:
        higher levels think longer and cost more.
      </p>
      <div className="grid gap-4 xl:grid-cols-2">
        {AI_TASKS.map((task) => {
          const route = routes[task];
          const info = AI_TASK_INFO[task];
          const missing = PROVIDER_IDS.filter((p) => !route.providers.includes(p));
          const usesClaude = route.providers.includes('claude');
          const anyKey = route.providers.some((p) => hasKey(p, config));
          const estimate = usesClaude ? estimatePer1000(task, route.claudeModel, route.claudeEffort) : null;
          const privateTask = task === 'answers' || task === 'resume' || task === 'writing';
          const freeOnPrivate = privateTask && route.providers.some((p) => p !== 'claude');
          return (
            <SectionCard key={task} title={info.label} description={info.description}>
              <ol className="space-y-1.5">
                {route.providers.length === 0 ? (
                  <li className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">No provider — this task cannot run.</li>
                ) : (
                  route.providers.map((p, i) => (
                    <li key={p} className="flex items-center gap-2 rounded-lg border bg-card px-2 py-1.5">
                      <span className="tabular w-5 text-center text-xs text-muted-foreground">{i + 1}</span>
                      <span className="flex-1 text-sm font-medium">
                        {PROVIDER_INFO[p].label}
                        {PROVIDER_INFO[p].paid ? (
                          <Badge variant="secondary" className="ml-2">
                            paid
                          </Badge>
                        ) : null}
                      </span>
                      {hasKey(p, config) ? (
                        <span className="text-xs text-emerald-700 dark:text-emerald-400">key set</span>
                      ) : (
                        <span className="text-xs text-amber-700 dark:text-amber-400">no key — skipped</span>
                      )}
                      <Button variant="ghost" size="icon-xs" aria-label="Move up" disabled={i === 0} onClick={() => move(task, i, -1)}>
                        <ArrowUpIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Move down"
                        disabled={i === route.providers.length - 1}
                        onClick={() => move(task, i, 1)}
                      >
                        <ArrowDownIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Remove ${PROVIDER_INFO[p].label}`}
                        onClick={() => update(task, { providers: route.providers.filter((x) => x !== p) })}
                      >
                        <XIcon />
                      </Button>
                    </li>
                  ))
                )}
              </ol>
              {missing.length ? (
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                    <PlusIcon />
                    Add provider
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {missing.map((p) => (
                      <DropdownMenuItem key={p} onClick={() => update(task, { providers: [...route.providers, p] })}>
                        {PROVIDER_INFO[p].label}
                        <span className="ml-auto text-xs text-muted-foreground">{PROVIDER_INFO[p].paid ? 'paid' : 'free'}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}

              {usesClaude ? (
                <div className="grid gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Claude model</Label>
                    <Select
                      items={CLAUDE_MODELS.map((m) => ({ value: m.id, label: m.label }))}
                      value={route.claudeModel}
                      onValueChange={(v) => update(task, { claudeModel: String(v) })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CLAUDE_MODELS.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Level (effort)</Label>
                    <Select
                      items={CLAUDE_EFFORTS.map((e) => ({ value: e, label: e.charAt(0).toUpperCase() + e.slice(1) }))}
                      value={route.claudeEffort}
                      onValueChange={(v) => update(task, { claudeEffort: v as ClaudeEffort })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CLAUDE_EFFORTS.map((e) => (
                          <SelectItem key={e} value={e}>
                            {CLAUDE_EFFORT_INFO[e]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    {estimate != null ? (
                      <>
                        Estimate: <strong className="tabular text-foreground">≈ {formatUsd(estimate)}</strong> per 1,000 {UNIT[task].unit} with
                        Claude answering (shared rules prompt cached). Real numbers appear under Usage &amp; cost.
                      </>
                    ) : (
                      'Price unknown for this model.'
                    )}
                  </p>
                </div>
              ) : null}

              {!anyKey && route.providers.length > 0 ? (
                <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                  <TriangleAlertIcon className="size-3.5" />
                  No provider on this route has a key yet — add one in Providers &amp; keys.
                </p>
              ) : null}
              {task === 'resume' && !usesClaude ? (
                <p className={cn('flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400')}>
                  <TriangleAlertIcon className="size-3.5" />
                  Reading resume PDFs needs Claude on this route.
                </p>
              ) : null}
              {freeOnPrivate ? (
                <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                  <TriangleAlertIcon className="size-3.5" />
                  This task sends your personal data. Free tiers (Gemini free, OpenRouter :free…) may train on prompts.
                </p>
              ) : null}
            </SectionCard>
          );
        })}
      </div>
      <SaveBar
        dirtyLabels={dirty.map((t) => AI_TASK_INFO[t].label)}
        saving={saving}
        onSave={() => void save()}
        onDiscard={() => setRoutes(saved)}
      />
    </div>
  );
}
