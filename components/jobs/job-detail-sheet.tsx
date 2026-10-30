'use client';

import {
  BanIcon,
  CheckIcon,
  ExternalLinkIcon,
  FlaskConicalIcon,
  LoaderCircleIcon,
  MessageSquareReplyIcon,
  RefreshCwIcon,
  SendIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { markFollowedUp } from '@/components/applications/application-commands';
import { Interviews, type Interview } from '@/components/applications/interviews';
import { Timeline, type TimelineEvent } from '@/components/applications/timeline';
import { Writing, type Draft, type WritingRequest, type WritingSetup } from '@/components/applications/writing';
import { ApplyMethodChip, EligibilityChip, ScoreChip, StatusChip } from '@/components/jobs/chips';
import { FeedbackButtons } from '@/components/jobs/feedback-buttons';
import { patchJobs, reanalyzeJobs } from '@/components/jobs/job-commands';
import { StageSelect } from '@/components/jobs/stage-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { api, errorMessage } from '@/lib/clientApi';
import {
  CLOSE_REASON_LABEL,
  formatDate,
  formatDateTime,
  platformLabel,
  safeHref,
  timeAgo,
  type CloseReason,
  type JobStage,
  type JobStatus,
} from '@/lib/format';
import { useLoadOnMount } from '@/hooks/use-load-on-mount';

type AnalysisLog = { id: number; model: string; approved: boolean; score: number | null; reason: string | null; createdAt: string; durationMs: number | null };

type JobDetail = {
  id: number;
  platform: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  manualApplyUrl: string | null;
  applyMethod: string | null;
  description: string | null;
  salary: string | null;
  techStack: string | null;
  status: JobStatus;
  sheetSynced: boolean;
  aiScore: number | null;
  aiReason: string | null;
  stage: JobStage | null;
  closeReason: CloseReason | null;
  appliedAt: string | null;
  followUpAt: string | null;
  notes: string | null;
  feedback: number | null;
  eligibility: string | null;
  signals: Record<string, unknown> | null;
  applicationData: { resumeName?: string; answers?: { question: string; answer: string }[] } | null;
  resumeId: number | null;
  createdAt: string;
  analysisLogs: AnalysisLog[];
};

type DetailResponse = {
  job: JobDetail;
  sameCompany90d: number;
  resume: { id: number; name: string; fileName: string } | null;
  events: TimelineEvent[];
  interviews: Interview[];
  drafts: Draft[];
  writing: WritingSetup;
  /** Its user's Google Sheet: the tab the job goes to (a problem with the last delivery), or why it goes nowhere. */
  sheet?: { configured: true; tab: string; url: string; problem: string | null } | { configured: false; reason: string };
};

// The reasons an archived application can have (Rejected is its own stage).
const ARCHIVE_REASONS = [
  { value: 'NONE', label: 'No reason' },
  ...(['WITHDREW', 'POSITION_CLOSED', 'NO_RESPONSE'] as const).map((r) => ({ value: r, label: CLOSE_REASON_LABEL[r] })),
];

function dateInput(v: string | null): string {
  return v ? new Date(v).toISOString().slice(0, 10) : '';
}

export function JobDetailSheet({
  jobId,
  onOpenChange,
  onChanged,
  writing,
}: {
  jobId: number | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
  /** Open on Writing, on this kind (written unless there is a draft already). */
  writing?: WritingRequest | null;
}) {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const load = useCallback(async () => {
    if (jobId == null) return;
    setError(null);
    try {
      const d = await api<DetailResponse>(`/api/admin/jobs/${jobId}`);
      setData(d);
      setNotes(d.job.notes ?? '');
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [jobId]);

  // A different job: drop the previous one's data while the new one loads.
  const [shownId, setShownId] = useState(jobId);
  if (jobId !== shownId) {
    setShownId(jobId);
    setData(null);
  }
  useLoadOnMount(load);

  const changed = () => {
    void load();
    onChanged();
  };

  const job = data?.job;
  const resumes = data?.writing?.resumes ?? [];
  // The resume sent with the application, among the user's (one deleted since is still named).
  const sentItems = [
    { value: 'NONE', label: 'Not recorded' },
    ...resumes.map((r) => ({ value: String(r.id), label: r.name })),
    ...(job?.resumeId != null && !resumes.some((r) => r.id === job.resumeId) ? [{ value: String(job.resumeId), label: 'A deleted resume' }] : []),
  ];
  const applyHref = safeHref(job?.manualApplyUrl) ?? safeHref(job?.url);
  const jobHref = safeHref(job?.url);
  const signals = job?.signals ?? {};

  return (
    <Sheet open={jobId != null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-2xl">
        {!job ? (
          <div className="grid h-full place-items-center p-8 text-sm text-muted-foreground">
            {error ? <p className="text-destructive">{error}</p> : <LoaderCircleIcon className="size-5 animate-spin" />}
          </div>
        ) : (
          <>
            <SheetHeader className="gap-2 border-b p-4 pr-12">
              <div className="flex flex-wrap items-center gap-1.5">
                <ScoreChip score={job.aiScore} />
                <StatusChip status={job.status} />
                <EligibilityChip value={job.eligibility} />
                <ApplyMethodChip method={job.applyMethod} />
                <Badge variant="outline">{platformLabel(job.platform)}</Badge>
              </div>
              <SheetTitle className="text-lg leading-snug">{job.title}</SheetTitle>
              <SheetDescription>
                {job.company}
                {job.location ? ` · ${job.location}` : ''}
                {job.salary ? ` · ${job.salary}` : ''} · found {timeAgo(job.createdAt)}
              </SheetDescription>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {applyHref ? (
                  <Button size="sm" nativeButton={false} render={<a href={applyHref} target="_blank" rel="noopener noreferrer" />}>
                    <SendIcon />
                    {job.applyMethod === 'EASY_APPLY' ? 'Open on LinkedIn' : 'Apply'}
                  </Button>
                ) : null}
                {jobHref && jobHref !== applyHref ? (
                  <Button size="sm" variant="outline" nativeButton={false} render={<a href={jobHref} target="_blank" rel="noopener noreferrer" />}>
                    <ExternalLinkIcon />
                    Job page
                  </Button>
                ) : null}
                <StageSelect jobId={job.id} stage={job.stage} onChanged={changed} />
                <FeedbackButtons jobId={job.id} feedback={job.feedback} onChanged={changed} />
              </div>
            </SheetHeader>

            <div className="space-y-5 p-4">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">AI verdict</h3>
                <p className="text-sm">{job.aiReason || <span className="text-muted-foreground">No reason recorded.</span>}</p>
                {job.techStack ? (
                  <div className="flex flex-wrap gap-1">
                    {job.techStack.split(',').map((t) => (
                      <Badge key={t.trim()} variant="secondary">
                        {t.trim()}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  {job.status === 'REJECTED' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void patchJobs([job.id], { status: 'APPROVED' }, { success: 'Approved by hand', onDone: changed })}
                    >
                      <CheckIcon />
                      Approve anyway
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void patchJobs([job.id], { status: 'REJECTED' }, { success: 'Rejected by hand', onDone: changed })}
                    >
                      <BanIcon />
                      Reject
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => void reanalyzeJobs([job.id], changed)}>
                    <RefreshCwIcon />
                    Re-analyze
                  </Button>
                  <Button size="sm" variant="ghost" nativeButton={false} render={<Link href={`/admin/ai?tab=playground&jobId=${job.id}`} />}>
                    <FlaskConicalIcon />
                    Try other models
                  </Button>
                </div>
              </section>

              <Separator />

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Signals</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>
                    {data.sameCompany90d > 0
                      ? `${data.sameCompany90d} other job${data.sameCompany90d === 1 ? '' : 's'} from ${job.company} in the last 90 days${
                          data.sameCompany90d >= 8 ? ' — a lot of postings; check it is not a reposted / ghost role.' : '.'
                        }`
                      : `First job from ${job.company} in the last 90 days.`}
                  </li>
                  {typeof signals.postedText === 'string' ? <li>Posted: {signals.postedText}</li> : null}
                  {signals.reposted === true ? <li className="text-tier-maybe-ink">LinkedIn marks this posting as reposted.</li> : null}
                  {typeof signals.applicants === 'string' ? <li>Applicants: {signals.applicants}</li> : null}
                  {data.sheet && (job.sheetSynced || job.status === 'APPROVED') ? (
                    <li data-testid="sheet-line">
                      <SheetLine sheet={data.sheet} inSheet={job.sheetSynced} />
                    </li>
                  ) : null}
                </ul>
              </section>

              <Separator />

              <section className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="followup">{job.stage === 'SAVED' ? 'Reminder to apply' : 'Follow-up date'}</Label>
                  {/* On a phone the button goes under the date. */}
                  <div className="flex flex-wrap gap-2">
                    <Input
                      id="followup"
                      type="date"
                      className="w-auto min-w-0 flex-1 basis-36"
                      defaultValue={dateInput(job.followUpAt)}
                      key={job.followUpAt ?? 'none'}
                      onChange={(e) =>
                        void patchJobs(
                          [job.id],
                          { followUpAt: e.target.value ? new Date(`${e.target.value}T09:00:00`).toISOString() : null },
                          {
                            success: `${job.stage === 'SAVED' ? 'Reminder' : 'Follow-up'} ${e.target.value ? `on ${formatDate(e.target.value)}` : 'cleared'}`,
                            onDone: changed,
                          },
                        )
                      }
                    />
                    {job.stage === 'APPLIED' || job.stage === 'INTERVIEW' ? (
                      <Button size="sm" variant="outline" className="h-9 shrink-0" onClick={() => void markFollowedUp([job.id], changed)}>
                        <MessageSquareReplyIcon />
                        Followed up
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  <Label>Applied</Label>
                  <p className="text-muted-foreground">{job.appliedAt ? formatDateTime(job.appliedAt) : 'Not yet'}</p>
                </div>
                {resumes.length || job.resumeId != null ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="sent-resume">Resume sent</Label>
                    <Select
                      items={sentItems}
                      value={job.resumeId != null ? String(job.resumeId) : 'NONE'}
                      onValueChange={(v) => {
                        const resumeId = v == null || v === 'NONE' ? null : Number(v);
                        void api(`/api/admin/jobs/${job.id}`, { method: 'PATCH', json: { resumeId } })
                          .then(() => {
                            toast.success(resumeId == null ? 'Resume sent: not recorded' : `Resume sent: ${sentItems.find((i) => i.value === v)?.label}`);
                            changed();
                          })
                          .catch((e) => toast.error(errorMessage(e)));
                      }}
                    >
                      <SelectTrigger id="sent-resume" size="sm" className="w-full sm:w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sentItems.map((i) => (
                          <SelectItem key={i.value} value={i.value}>
                            {i.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                {job.stage === 'REJECTED' ? (
                  <div className="space-y-1.5 text-sm sm:col-span-2">
                    <Label>Closed</Label>
                    <p className="text-muted-foreground">{CLOSE_REASON_LABEL.REJECTED}</p>
                  </div>
                ) : null}
                {job.stage === 'ARCHIVED' ? (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="close-reason">Why it closed</Label>
                    <Select
                      items={ARCHIVE_REASONS}
                      value={job.closeReason ?? 'NONE'}
                      onValueChange={(v) => {
                        const reason = v === 'NONE' || v == null ? null : (v as CloseReason);
                        void patchJobs([job.id], { closeReason: reason }, {
                          success: reason ? `Close reason: ${CLOSE_REASON_LABEL[reason]}` : 'Close reason cleared',
                          onDone: changed,
                        });
                      }}
                    >
                      <SelectTrigger id="close-reason" size="sm" className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ARCHIVE_REASONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Recruiter name, salary talks, impressions…"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={savingNotes || notes === (job.notes ?? '')}
                      onClick={async () => {
                        setSavingNotes(true);
                        await patchJobs([job.id], { notes: notes || null }, { success: 'Notes saved', onDone: changed });
                        setSavingNotes(false);
                      }}
                    >
                      Save notes
                    </Button>
                  </div>
                </div>
              </section>

              <Separator />

              <Writing
                key={job.id}
                jobId={job.id}
                stage={job.stage}
                drafts={data.drafts ?? []}
                setup={data.writing ?? { resumes: [], suggested: null }}
                request={writing}
              />

              {job.applicationData?.answers?.length ? (
                <>
                  <Separator />
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold">What you sent</h3>
                    {job.applicationData.answers.map((a, i) => (
                      <div key={i} className="rounded-lg border bg-muted/30 p-2 text-sm">
                        <p className="font-medium">{a.question}</p>
                        <p className="whitespace-pre-wrap text-muted-foreground">{a.answer}</p>
                      </div>
                    ))}
                  </section>
                </>
              ) : null}

              <Separator />

              <Interviews jobId={job.id} interviews={data.interviews ?? []} onChanged={changed} />

              <Separator />

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Timeline</h3>
                <Timeline events={data.events ?? []} />
              </section>

              <Separator />

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Description</h3>
                <div className="max-h-[28rem] overflow-y-auto rounded-lg border bg-muted/20 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {job.description || <span className="text-muted-foreground">No description stored.</span>}
                </div>
              </section>

              {job.analysisLogs.length ? (
                <>
                  <Separator />
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold">AI history</h3>
                    <ul className="space-y-1.5 text-sm">
                      {job.analysisLogs.map((l) => (
                        <li key={l.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <ScoreChip score={l.score} />
                          <span className={l.approved ? 'text-tier-match-ink' : 'text-destructive'}>{l.approved ? 'approved' : 'rejected'}</span>
                          <code className="text-xs text-muted-foreground">{l.model}</code>
                          <span className="text-xs text-muted-foreground">{formatDateTime(l.createdAt)}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                </>
              ) : null}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Where the job is (or goes) in its user's Google Sheet, or why it is not there. */
function SheetLine({ sheet, inSheet }: { sheet: NonNullable<DetailResponse['sheet']>; inSheet: boolean }) {
  if (!sheet.configured) return <>{inSheet ? 'In the Google Sheet.' : `Approved, not in a Google Sheet: ${sheet.reason}`}</>;
  const tab = (
    <a href={sheet.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
      “{sheet.tab}” tab
    </a>
  );
  if (inSheet) return <>In the Google Sheet ({tab}).</>;
  return (
    <>
      Approved, not in the Google Sheet yet: it goes to the {tab} with the next delivery.
      {sheet.problem ? <span className="text-destructive"> The last one failed: {sheet.problem}</span> : null}
    </>
  );
}
