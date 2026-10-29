'use client';

import { PlayIcon, Trash2Icon } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { DEFAULT_PICK, RoutePicker, routeLabel, toRoute, type PickedRoute } from '@/components/ai/route-picker';
import { SectionCard } from '@/components/common/section-card';
import { EligibilityChip, ScoreChip } from '@/components/jobs/chips';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { api, errorMessage } from '@/lib/clientApi';
import { formatDuration, formatNumber, formatUsd } from '@/lib/format';
import { useLoadOnMount } from '@/hooks/use-load-on-mount';

type Verdict = { approved: boolean; score: number; reason: string; techStack: string[]; eligibility?: string | null };
type PlaygroundResponse = {
  ok: boolean;
  error?: string;
  verdict?: Verdict;
  raw?: string;
  provider?: string;
  model?: string;
  tokensUsed?: number;
  costUsd?: number | null;
  durationMs?: number;
};
type Run = { id: number; label: string; result: PlaygroundResponse };
type JobFields = { title: string; company: string; location: string; description: string };

const EMPTY: JobFields = { title: '', company: '', location: '', description: '' };

/** Judge one job with any provider / model / level without saving a verdict; compare the runs side by side. */
export function PlaygroundTab({ initialJobId }: { initialJobId: string | null }) {
  const [jobId, setJobId] = useState(initialJobId ?? '');
  const [loadedId, setLoadedId] = useState<number | null>(null);
  const [job, setJob] = useState<JobFields>(EMPTY);
  const [pick, setPick] = useState<PickedRoute>(DEFAULT_PICK);
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);

  const loadJob = useCallback(async (id: string) => {
    if (!id.trim()) return;
    try {
      const d = await api<{ job: { id: number; title: string; company: string; location: string | null; description: string | null } }>(
        `/api/admin/jobs/${encodeURIComponent(id.trim())}`,
      );
      setJob({ title: d.job.title, company: d.job.company, location: d.job.location ?? '', description: d.job.description ?? '' });
      setLoadedId(d.job.id);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);

  // Preload the job named in the URL (?jobId=…, from a job's "Try in playground" link).
  const preload = useCallback(() => (initialJobId ? loadJob(initialJobId) : undefined), [initialJobId, loadJob]);
  useLoadOnMount(preload);

  async function run() {
    if (!job.title.trim() || !job.company.trim()) {
      toast.error('Load a job or enter at least a title and a company');
      return;
    }
    setRunning(true);
    try {
      const r = await api<PlaygroundResponse>('/api/admin/ai/playground', {
        method: 'POST',
        json: { job: { ...job, location: job.location || null }, route: toRoute(pick) },
      });
      setRuns((list) => [{ id: Date.now(), label: routeLabel(pick), result: r }, ...list].slice(0, 12));
      if (!r.ok) toast.error(r.error ?? 'Run failed');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setRunning(false);
    }
  }

  const set = (k: keyof JobFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setJob((j) => ({ ...j, [k]: e.target.value }));

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <SectionCard
        title="Job"
        description="Load a stored job by id (or open “Try other models” on a job) — or paste one. Nothing is saved; only the AI call is logged."
      >
        <div className="flex gap-2">
          <Input
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            placeholder="Job id, e.g. 1234"
            inputMode="numeric"
            className="w-40"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void loadJob(jobId);
            }}
          />
          <Button variant="outline" onClick={() => void loadJob(jobId)}>
            Load job
          </Button>
          {loadedId ? <Badge variant="secondary">#{loadedId} loaded</Badge> : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pg-title">Title</Label>
            <Input id="pg-title" value={job.title} onChange={set('title')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pg-company">Company</Label>
            <Input id="pg-company" value={job.company} onChange={set('company')} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pg-location">Location</Label>
            <Input id="pg-location" value={job.location} onChange={set('location')} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pg-desc">Description</Label>
            <Textarea id="pg-desc" value={job.description} onChange={set('description')} rows={10} className="max-h-80" />
          </div>
        </div>
        <RoutePicker value={pick} onChange={setPick} />
        <Button onClick={() => void run()} disabled={running}>
          {running ? <Spinner /> : <PlayIcon />}
          Run with {routeLabel(pick)}
        </Button>
      </SectionCard>

      <SectionCard
        title="Results"
        description="Newest first. Run the same job with several models or levels to compare verdict, speed and cost."
        actions={
          runs.length ? (
            <Button size="sm" variant="ghost" onClick={() => setRuns([])}>
              <Trash2Icon />
              Clear
            </Button>
          ) : null
        }
      >
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No runs yet.</p>
        ) : (
          <ul className="space-y-3">
            {runs.map(({ id, label, result: r }) => (
              <li key={id} className="space-y-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{label}</span>
                  {r.ok && r.verdict ? (
                    <>
                      <ScoreChip score={r.verdict.score} />
                      <Badge variant={r.verdict.approved ? 'secondary' : 'destructive'}>
                        {r.verdict.approved ? 'approved' : 'rejected'}
                      </Badge>
                      <EligibilityChip value={r.verdict.eligibility ?? null} />
                    </>
                  ) : (
                    <Badge variant="destructive">failed</Badge>
                  )}
                </div>
                {r.ok && r.verdict ? (
                  <>
                    <p className="text-sm">{r.verdict.reason}</p>
                    {r.verdict.techStack.length ? (
                      <div className="flex flex-wrap gap-1">
                        {r.verdict.techStack.map((t) => (
                          <Badge key={t} variant="outline">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    <p className="tabular text-xs text-muted-foreground">
                      <code>{r.model}</code> · {formatDuration(r.durationMs)} · {formatNumber(r.tokensUsed)} tokens ·{' '}
                      {r.costUsd != null ? formatUsd(r.costUsd) : 'free'}
                    </p>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">Raw response</summary>
                      <pre className="mt-1 max-h-60 overflow-auto rounded bg-muted p-2 whitespace-pre-wrap">{r.raw}</pre>
                    </details>
                  </>
                ) : (
                  <p className="text-sm break-words text-destructive">{r.error}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
