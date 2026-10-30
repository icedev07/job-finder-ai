import Link from 'next/link';

import { UserChip } from '@/components/shell/viewing';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber, formatPercent, ratio } from '@/lib/format';
import { BEST_MIN_APPLIED, bestGroup, type InsightGroup, type Insights } from '@/lib/insights';
import { cn } from '@/lib/utils';

// Sources beyond these (fewest applications) are summed up under the table.
const SOURCE_ROWS = 8;

function daysText(d: number | null): string {
  if (d == null) return '—';
  if (d < 1) return 'under a day';
  const n = Math.round(d);
  return `${n} day${n === 1 ? '' : 's'}`;
}

/** "3 · 30%": how many of the group's applications, and the share. */
function share(part: number, whole: number): string {
  return `${formatNumber(part)} · ${formatPercent(ratio(part, whole))}`;
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="space-y-1 rounded-lg border bg-muted/20 p-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="tabular text-xl leading-none font-semibold tracking-tight">{value}</dd>
      <dd className="text-xs text-muted-foreground">{sub}</dd>
    </div>
  );
}

function Best({ what, group }: { what: string; group: InsightGroup | null }) {
  if (!group) {
    return (
      <p className="text-muted-foreground">
        Best {what}: not enough to tell yet (one with {BEST_MIN_APPLIED} applications or more and an interview).
      </p>
    );
  }
  return (
    <p>
      Best {what}: <strong>{group.label}</strong>, {formatNumber(group.interviews)} of {formatNumber(group.applied)} applications reached
      an interview ({formatPercent(ratio(group.interviews, group.applied))}).
    </p>
  );
}

/** The Dashboard's Insights card: every application sent so far (lib/insights.ts). */
export function InsightsPanel({ data, showUsers }: { data: Insights; showUsers: boolean }) {
  if (data.applied === 0) {
    return <p className="text-sm text-muted-foreground">No applications sent yet: insights start with the first one marked Applied.</p>;
  }
  const sources = data.sources.slice(0, SOURCE_ROWS);
  const hidden = data.sources.slice(SOURCE_ROWS);
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Got an answer"
          value={formatPercent(ratio(data.answered, data.applied))}
          sub={`${formatNumber(data.answered)} of ${formatNumber(data.applied)} applications`}
        />
        <Stat
          label="Reached an interview"
          value={formatPercent(ratio(data.interviews, data.applied))}
          sub={`${formatNumber(data.interviews)} of ${formatNumber(data.applied)} applications`}
        />
        <Stat
          label="Interviews to an offer"
          value={formatPercent(ratio(data.offers, data.interviews))}
          sub={`${formatNumber(data.offers)} offer${data.offers === 1 ? '' : 's'} from ${formatNumber(data.interviews)}`}
        />
        <Stat
          label="Time to the first answer"
          value={daysText(data.medianDaysToAnswer)}
          sub={data.answerTimes ? `the median of ${formatNumber(data.answerTimes)} answer${data.answerTimes === 1 ? '' : 's'}` : 'no answers yet'}
        />
      </dl>
      <div className="space-y-1 text-sm">
        <p className="text-muted-foreground">
          {formatNumber(data.waiting)} still waiting for an answer · {formatNumber(data.rejected)} rejected
        </p>
        <Best what="source" group={bestGroup(data.sources)} />
        <Best what="resume" group={bestGroup(data.resumes)} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">By source</h3>
          <Table aria-label="Applications by source">
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Answered</TableHead>
                <TableHead className="text-right">Interview</TableHead>
                <TableHead className="text-right">Offer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((g) => (
                <TableRow key={g.key}>
                  <TableCell>
                    <Link href={`/admin/applications?source=${encodeURIComponent(g.key)}`} className="hover:underline">
                      {g.label}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular text-right">{formatNumber(g.applied)}</TableCell>
                  <TableCell className="tabular text-right">{share(g.answered, g.applied)}</TableCell>
                  <TableCell className="tabular text-right">{share(g.interviews, g.applied)}</TableCell>
                  <TableCell className="tabular text-right">{formatNumber(g.offers)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {hidden.length ? (
            <p className="text-xs text-muted-foreground">
              And {formatNumber(hidden.length)} more source{hidden.length === 1 ? '' : 's'} with {formatNumber(hidden.reduce((s, g) => s + g.applied, 0))}{' '}
              application{hidden.reduce((s, g) => s + g.applied, 0) === 1 ? '' : 's'}.
            </p>
          ) : null}
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">By resume sent</h3>
          <Table aria-label="Applications by resume sent">
            <TableHeader>
              <TableRow>
                <TableHead>Resume</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Answered</TableHead>
                <TableHead className="text-right">Interview</TableHead>
                <TableHead className="text-right">Offer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.resumes.map((g) => (
                <TableRow key={g.key || 'none'}>
                  <TableCell className={cn(g.key === '' && 'text-muted-foreground')}>
                    <span className="inline-flex items-center gap-2">
                      {g.label}
                      {showUsers && g.userId != null ? <UserChip userId={g.userId} /> : null}
                    </span>
                  </TableCell>
                  <TableCell className="tabular text-right">{formatNumber(g.applied)}</TableCell>
                  <TableCell className="tabular text-right">{share(g.answered, g.applied)}</TableCell>
                  <TableCell className="tabular text-right">{share(g.interviews, g.applied)}</TableCell>
                  <TableCell className="tabular text-right">{formatNumber(g.offers)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground">
            The extension records the resume it sends; set it in a job&apos;s panel (Resume sent) for the others.
          </p>
        </div>
      </div>
    </div>
  );
}
