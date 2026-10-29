'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';

import { HealthLine, type UsageResponse } from '@/components/ai/shared';
import { SectionCard } from '@/components/common/section-card';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AI_TASK_INFO, PROVIDER_INFO, type AiTask, type ProviderId } from '@/lib/aiRoutes';
import { errorMessage } from '@/lib/clientApi';
import { formatDate, formatDayKey, formatDuration, formatNumber, formatUsd, timeAgo } from '@/lib/format';
import { saveAdminConfig, type AdminConfig } from '@/lib/useAdminConfig';

const CHART_PROVIDERS: ProviderId[] = ['claude', 'gemini', 'groq', 'cerebras', 'openrouter', 'cloudflare'];
const callsConfig = Object.fromEntries(
  CHART_PROVIDERS.map((p, i) => [p, { label: PROVIDER_INFO[p].label, color: `var(--chart-${(i % 5) + 1})` }]),
) satisfies ChartConfig;
const costConfig = { cost: { label: 'Claude cost (USD)', color: 'var(--chart-2)' } } satisfies ChartConfig;

function taskLabel(task: string): string {
  return task in AI_TASK_INFO ? AI_TASK_INFO[task as AiTask].label : task.charAt(0).toUpperCase() + task.slice(1);
}

export function UsageTab({
  config,
  usage,
  loading,
  reload,
}: {
  config: AdminConfig;
  usage: UsageResponse | null;
  loading: boolean;
  reload: () => void;
}) {
  const savedBudget = config.claude_monthly_budget_usd ?? '10';
  const [budget, setBudget] = useState(savedBudget);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(savedBudget);
  if (savedBudget !== lastSaved) {
    setLastSaved(savedBudget);
    setBudget(savedBudget);
  }

  const series = useMemo(() => {
    if (!usage?.ok) return [];
    const days = Array.from(new Set(usage.byDay.map((r) => r.day))).sort();
    return days.map((day) => {
      const row: Record<string, number | string> = { day, cost: 0 };
      for (const p of CHART_PROVIDERS) row[p] = 0;
      for (const r of usage.byDay.filter((x) => x.day === day)) {
        row[r.provider] = ((row[r.provider] as number) || 0) + r.calls;
        row.cost = (row.cost as number) + r.costUsd;
      }
      return row;
    });
  }, [usage]);

  async function saveBudget() {
    const n = Number(budget);
    if (!Number.isFinite(n) || n < 0) {
      toast.error('Enter a number ≥ 0 (0 = no cap)');
      return;
    }
    setSaving(true);
    try {
      await saveAdminConfig({ claude_monthly_budget_usd: String(n) });
      toast.success(n === 0 ? 'Budget cap removed' : `Monthly budget set to ${formatUsd(n)}`);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading && !usage) {
    return (
      <div className="grid h-40 place-items-center">
        <Spinner />
      </div>
    );
  }
  if (!usage?.ok) {
    return <p className="text-sm text-destructive">{usage?.error ?? 'Usage data unavailable.'}</p>;
  }

  const { month } = usage;
  const pct = month.budgetUsd > 0 ? Math.min(100, (month.claudeSpendUsd / month.budgetUsd) * 100) : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <SectionCard
          title="Claude spend this month"
          description={`Resets ${formatDate(month.resetsAt)}. At the cap, Claude is skipped and each route falls back to its free providers.`}
        >
          <p className="tabular text-3xl font-semibold tracking-tight">
            {formatUsd(month.claudeSpendUsd)}
            <span className="ml-2 text-base font-normal text-muted-foreground">
              {month.budgetUsd > 0 ? `of ${formatUsd(month.budgetUsd)}` : 'no cap'}
            </span>
          </p>
          {pct != null ? <Progress value={pct} aria-label="Budget used" /> : null}
          <p className="text-xs text-muted-foreground">{formatNumber(month.claudeCalls)} Claude calls this month.</p>
          <div className="flex items-end gap-2">
            <div className="space-y-1.5">
              <label htmlFor="budget" className="text-sm font-medium">
                Monthly budget
              </label>
              <InputGroup className="w-40">
                <InputGroupAddon>$</InputGroupAddon>
                <InputGroupInput
                  id="budget"
                  inputMode="decimal"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  aria-describedby="budget-help"
                />
              </InputGroup>
            </div>
            <Button size="sm" onClick={() => void saveBudget()} disabled={saving || budget === (config.claude_monthly_budget_usd ?? '10')}>
              {saving ? <Spinner /> : null}
              Save
            </Button>
          </div>
          <p id="budget-help" className="text-xs text-muted-foreground">
            0 = no cap. Costs are computed from token counts and Anthropic&apos;s list prices; your Anthropic invoice is the source of truth.
          </p>
        </SectionCard>
        <SectionCard title={`Last ${usage.days} days`} description="AI calls per provider and Claude cost per day.">
          {series.length === 0 ? (
            <p className="text-sm text-muted-foreground">No AI calls recorded yet.</p>
          ) : (
            <div className="space-y-3">
              <ChartContainer config={callsConfig} className="aspect-auto h-40 w-full">
                <BarChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap={3}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} minTickGap={16} tickFormatter={(v: string) => formatDayKey(v)} />
                  <YAxis width={32} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(v) => formatDayKey(String(v))} />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  {CHART_PROVIDERS.map((p, i) => (
                    <Bar
                      key={p}
                      dataKey={p}
                      stackId="calls"
                      fill={`var(--color-${p})`}
                      maxBarSize={22}
                      radius={i === CHART_PROVIDERS.length - 1 ? [4, 4, 0, 0] : 0}
                    />
                  ))}
                </BarChart>
              </ChartContainer>
              <ChartContainer config={costConfig} className="aspect-auto h-24 w-full">
                <BarChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap={3}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" hide />
                  <YAxis width={40} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatUsd(v)} />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(v) => formatDayKey(String(v))}
                        formatter={(value) => formatUsd(Number(value))}
                      />
                    }
                  />
                  <Bar dataKey="cost" fill="var(--color-cost)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ChartContainer>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="By task and model" description="Where the calls and the money went.">
        {usage.byKey.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Provider · model</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Input</TableHead>
                  <TableHead className="text-right">Cached</TableHead>
                  <TableHead className="text-right">Output</TableHead>
                  <TableHead className="text-right">Avg time</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.byKey.map((r) => (
                  <TableRow key={`${r.task}-${r.provider}-${r.model}`}>
                    <TableCell>{taskLabel(r.task)}</TableCell>
                    <TableCell>
                      <span className="font-medium">{PROVIDER_INFO[r.provider as ProviderId]?.label ?? r.provider}</span>{' '}
                      <code className="text-xs text-muted-foreground">{r.model}</code>
                    </TableCell>
                    <TableCell className="tabular text-right">{formatNumber(r.calls)}</TableCell>
                    <TableCell className="tabular text-right">{formatNumber(r.inputTokens)}</TableCell>
                    <TableCell className="tabular text-right">{formatNumber(r.cacheReadTokens)}</TableCell>
                    <TableCell className="tabular text-right">{formatNumber(r.outputTokens)}</TableCell>
                    <TableCell className="tabular text-right">{formatDuration(r.avgMs)}</TableCell>
                    <TableCell className="tabular text-right">{r.provider === 'claude' ? formatUsd(r.costUsd) : 'free'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Provider health · 24h">
          {usage.health.length === 0 ? (
            <p className="text-sm text-muted-foreground">No calls in the last 24 hours.</p>
          ) : (
            <ul className="space-y-3">
              {usage.health.map((h) => (
                <li key={h.provider} className="space-y-0.5">
                  <p className="text-sm font-medium">{PROVIDER_INFO[h.provider as ProviderId]?.label ?? h.provider}</p>
                  <HealthLine health={h} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard title="Recent errors · 24h">
          {usage.recentErrors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No errors. 🎉</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {usage.recentErrors.map((e, i) => (
                <li key={i} className="rounded-lg border p-2">
                  <p className="text-xs text-muted-foreground">
                    {PROVIDER_INFO[e.provider as ProviderId]?.label ?? e.provider} · {e.model} · {taskLabel(e.task)} · {timeAgo(e.createdAt)}
                  </p>
                  <p className="line-clamp-3 break-words">{e.error}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
