'use client';

import { FlaskConicalIcon, SquareIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { DEFAULT_PICK, RoutePicker, routeLabel, toRoute, type PickedRoute } from '@/components/ai/route-picker';
import { SectionCard } from '@/components/common/section-card';
import { ScoreChip } from '@/components/jobs/chips';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage } from '@/lib/clientApi';
import { formatDuration, formatPercent, formatUsd } from '@/lib/format';

type Labeled = { id: number; title: string; company: string; status: string; aiScore: number | null; feedback: number };
type Outcome = { job: Labeled; predicted: boolean | null; score: number | null; reason: string; ms: number; cost: number | null };

function metrics(rows: { truth: boolean; predicted: boolean }[]) {
  let tp = 0,
    fp = 0,
    fn = 0,
    tn = 0;
  for (const r of rows) {
    if (r.predicted && r.truth) tp++;
    else if (r.predicted && !r.truth) fp++;
    else if (!r.predicted && r.truth) fn++;
    else tn++;
  }
  const n = rows.length;
  const precision = tp + fp ? tp / (tp + fp) : null;
  const recall = tp + fn ? tp / (tp + fn) : null;
  const f1 = precision != null && recall != null && precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : null;
  return { n, accuracy: n ? (tp + tn) / n : null, precision, recall, f1, tp, fp, fn, tn };
}

function MetricsRow({ m }: { m: ReturnType<typeof metrics> }) {
  const cells: [string, string][] = [
    ['Jobs', String(m.n)],
    ['Accuracy', formatPercent(m.accuracy)],
    ['Precision', formatPercent(m.precision)],
    ['Recall', formatPercent(m.recall)],
    ['F1', formatPercent(m.f1)],
  ];
  return (
    <dl className="grid grid-cols-5 gap-2">
      {cells.map(([k, v]) => (
        <div key={k} className="rounded-lg border p-2">
          <dt className="text-xs text-muted-foreground">{k}</dt>
          <dd className="tabular text-lg font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Evaluations use your own 👍 / 👎 as the truth: 👍 means "should be approved". The baseline scores the live
 * verdicts for free; a run re-judges a balanced sample with the chosen model and level (that costs AI calls).
 */
export function EvaluationsTab() {
  const [labeled, setLabeled] = useState<Labeled[] | null>(null);
  const [pick, setPick] = useState<PickedRoute>(DEFAULT_PICK);
  const [size, setSize] = useState('20');
  const [running, setRunning] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [progress, setProgress] = useState(0);
  const stopRef = useRef(false);

  useEffect(() => {
    Promise.all([
      api<{ jobs: Labeled[] }>('/api/admin/jobs?feedback=up&limit=100'),
      api<{ jobs: Labeled[] }>('/api/admin/jobs?feedback=down&limit=100'),
    ])
      .then(([up, down]) => setLabeled([...up.jobs, ...down.jobs]))
      .catch((e) => toast.error(errorMessage(e)));
  }, []);

  const baseline = useMemo(
    () => (labeled ? metrics(labeled.map((j) => ({ truth: j.feedback === 1, predicted: j.status === 'APPROVED' }))) : null),
    [labeled],
  );

  async function runEval() {
    if (!labeled?.length) return;
    const n = Number(size);
    const ups = labeled.filter((j) => j.feedback === 1);
    const downs = labeled.filter((j) => j.feedback === -1);
    // Balanced sample: half 👍, half 👎 where possible.
    const half = Math.ceil(n / 2);
    const sample = [...ups.slice(0, half), ...downs.slice(0, n - Math.min(half, ups.length))].slice(0, n);
    stopRef.current = false;
    setRunning(true);
    setOutcomes([]);
    setProgress(0);
    const out: Outcome[] = [];
    for (let i = 0; i < sample.length; i++) {
      if (stopRef.current) break;
      const job = sample[i];
      try {
        const r = await api<{ ok: boolean; error?: string; verdict?: { approved: boolean; score: number; reason: string }; durationMs?: number; costUsd?: number | null }>(
          '/api/admin/ai/playground',
          { method: 'POST', json: { jobId: job.id, route: toRoute(pick) } },
        );
        out.push({
          job,
          predicted: r.ok && r.verdict ? r.verdict.approved : null,
          score: r.verdict?.score ?? null,
          reason: r.ok ? (r.verdict?.reason ?? '') : (r.error ?? 'failed'),
          ms: r.durationMs ?? 0,
          cost: r.costUsd ?? null,
        });
      } catch (e) {
        out.push({ job, predicted: null, score: null, reason: errorMessage(e), ms: 0, cost: null });
      }
      setOutcomes([...out]);
      setProgress(Math.round(((i + 1) / sample.length) * 100));
    }
    setRunning(false);
  }

  const scored = outcomes.filter((o) => o.predicted !== null);
  const runMetrics = scored.length ? metrics(scored.map((o) => ({ truth: o.job.feedback === 1, predicted: o.predicted! }))) : null;
  const misses = outcomes.filter((o) => o.predicted !== null && o.predicted !== (o.job.feedback === 1));
  const failed = outcomes.filter((o) => o.predicted === null).length;
  const totalCost = outcomes.reduce((s, o) => s + (o.cost ?? 0), 0);
  const avgMs = scored.length ? scored.reduce((s, o) => s + o.ms, 0) / scored.length : null;

  if (!labeled) {
    return (
      <div className="grid h-40 place-items-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Your labels"
        description={
          <>
            {labeled.filter((j) => j.feedback === 1).length} 👍 and {labeled.filter((j) => j.feedback === -1).length} 👎. Rate more jobs in{' '}
            <Link className="underline" href="/admin/review">
              Review
            </Link>{' '}
            or the Jobs table to make evaluations more reliable (aim for 20+ of each).
          </>
        }
      >
        {baseline && baseline.n > 0 ? (
          <>
            <p className="text-sm font-medium">Live verdicts (free baseline)</p>
            <MetricsRow m={baseline} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No rated jobs yet — 👍 / 👎 a few jobs first.</p>
        )}
      </SectionCard>

      <SectionCard
        title="Run an evaluation"
        description="Re-judges a balanced sample with the model and level below. Each job is one AI call (Claude calls cost money)."
      >
        <RoutePicker value={pick} onChange={setPick} />
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Sample</p>
            <Select
              items={['10', '20', '30', '50'].map((v) => ({ value: v, label: `${v} jobs` }))}
              value={size}
              onValueChange={(v) => setSize(String(v))}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['10', '20', '30', '50'].map((v) => (
                  <SelectItem key={v} value={v}>
                    {v} jobs
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {running ? (
            <Button variant="outline" onClick={() => (stopRef.current = true)}>
              <SquareIcon />
              Stop
            </Button>
          ) : (
            <Button onClick={() => void runEval()} disabled={!labeled.length}>
              <FlaskConicalIcon />
              Evaluate {routeLabel(pick)}
            </Button>
          )}
        </div>
        {running || outcomes.length ? <Progress value={progress} aria-label="Evaluation progress" /> : null}
        {runMetrics ? (
          <div className="space-y-2">
            <MetricsRow m={runMetrics} />
            <p className="tabular text-xs text-muted-foreground">
              {failed ? `${failed} call(s) failed · ` : ''}avg {formatDuration(avgMs)} per job · {formatUsd(totalCost)} total
            </p>
          </div>
        ) : null}
        {misses.length ? (
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Misses ({misses.length})</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>You</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {misses.map((o) => (
                  <TableRow key={o.job.id}>
                    <TableCell className="max-w-56">
                      <Link className="block truncate hover:underline" href={`/admin/jobs?job=${o.job.id}`}>
                        {o.job.title}
                      </Link>
                      <span className="text-xs text-muted-foreground">{o.job.company}</span>
                    </TableCell>
                    <TableCell>{o.job.feedback === 1 ? '👍' : '👎'}</TableCell>
                    <TableCell>
                      <ScoreChip score={o.score} />
                    </TableCell>
                    <TableCell className="max-w-md text-xs whitespace-normal">{o.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
