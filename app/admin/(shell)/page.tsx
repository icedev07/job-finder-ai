import {
  ActivityIcon,
  BriefcaseIcon,
  CheckCircle2Icon,
  CircleDollarSignIcon,
  KanbanIcon,
  ListChecksIcon,
  TriangleAlertIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { Funnel } from "@/components/dashboard/funnel";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ScoreChip } from "@/components/jobs/chips";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDashboardData } from "@/lib/dashboard";
import { formatDayKey, formatNumber, formatPercent, formatUsd, platformLabel, ratio, timeAgo } from "@/lib/format";
import { pageAdmin } from "@/lib/scope";
import { getStatusSnapshot } from "@/lib/status";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const admin = await pageAdmin();
  const [data, status] = await Promise.all([getDashboardData(30), getStatusSnapshot(admin.id).catch(() => null)]);
  const last14 = data.perDay.slice(-14);
  const labels14 = last14.map((d) => formatDayKey(d.day));
  const aiToday = data.perDay[data.perDay.length - 1]?.aiCalls ?? 0;
  const requiredLeft = status?.setup.steps.filter((s) => !s.done && !s.optional) ?? [];
  const claudePct =
    status?.claude.keySet && status.claude.budgetUsd > 0 ? (status.claude.spendUsd / status.claude.budgetUsd) * 100 : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description="What the scanners and the extension found, what the AI approved, and where your applications stand."
        actions={<QuickActions />}
      />

      {requiredLeft.length > 0 ? (
        <Alert>
          <TriangleAlertIcon />
          <AlertTitle>
            {requiredLeft.length} setup step{requiredLeft.length === 1 ? "" : "s"} left
          </AlertTitle>
          <AlertDescription>
            <span>{requiredLeft.map((s) => s.title).join(" · ")}</span>
            <Button size="sm" variant="outline" className="mt-2 w-fit" nativeButton={false} render={<Link href="/admin/setup" />}>
              Open the setup checklist
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        <KpiTile
          label="Jobs found · 7d"
          value={formatNumber(data.totals7.found)}
          sub={`${formatNumber(data.perDay.reduce((s, d) => s + d.found, 0))} in 30 days`}
          series={last14.map((d) => d.found)}
          seriesLabels={labels14}
          icon={<BriefcaseIcon />}
          href="/admin/jobs?days=7"
        />
        <KpiTile
          label="Approved · 7d"
          value={formatNumber(data.totals7.approved)}
          sub={`${formatPercent(ratio(data.totals7.approved, data.totals7.found))} approval rate`}
          series={last14.map((d) => d.approved)}
          seriesLabels={labels14}
          icon={<CheckCircle2Icon />}
          href="/admin/jobs?status=APPROVED&days=7"
        />
        <KpiTile
          label="To review"
          value={formatNumber(status?.counts.review ?? 0)}
          sub="close calls for a quick yes / no"
          icon={<ListChecksIcon />}
          href="/admin/review"
        />
        <KpiTile
          label="Applications"
          value={formatNumber(data.applied)}
          sub={`${formatNumber(data.interviews)} interviewing · ${formatNumber(status?.counts.followUpsDue ?? 0)} follow-ups due`}
          icon={<KanbanIcon />}
          href="/admin/applications"
        />
        <KpiTile
          label="AI calls today"
          value={formatNumber(aiToday)}
          sub={status ? `${formatNumber(status.ai.failures24h)} failed in 24h` : undefined}
          series={last14.map((d) => d.aiCalls)}
          seriesLabels={labels14}
          icon={<ActivityIcon />}
          href="/admin/ai?tab=usage"
        />
        <KpiTile
          label="Claude this month"
          value={status?.claude.keySet ? formatUsd(status.claude.spendUsd) : "—"}
          sub={
            status?.claude.keySet
              ? status.claude.budgetUsd > 0
                ? `of ${formatUsd(status.claude.budgetUsd)} budget`
                : "no budget cap"
              : "no Claude key"
          }
          meter={
            claudePct != null
              ? { percent: Math.min(100, claudePct), tone: claudePct >= 100 ? "error" : claudePct >= 80 ? "warn" : "ok" }
              : undefined
          }
          icon={<CircleDollarSignIcon />}
          href="/admin/ai?tab=usage"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <SectionCard title="Activity · 30 days" description="Jobs judged per day (approved vs rejected) and AI calls.">
          <ActivityChart data={data.perDay.map((d) => ({ day: d.day, approved: d.approved, rejected: d.rejected, aiCalls: d.aiCalls }))} />
        </SectionCard>
        <SectionCard title="Funnel · 30 days" description="From found to offer, with the step-to-step conversion.">
          <Funnel steps={data.funnel} />
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Latest approved"
          actions={
            <Button size="sm" variant="ghost" nativeButton={false} render={<Link href="/admin/jobs?status=APPROVED" />}>
              All jobs
            </Button>
          }
        >
          {data.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approved jobs yet.</p>
          ) : (
            <ul className="divide-y">
              {data.recent.map((j) => (
                <li key={j.id}>
                  <Link
                    href={`/admin/jobs?job=${j.id}`}
                    className="flex items-center gap-3 rounded-md px-1 py-2 hover:bg-muted/50"
                  >
                    <ScoreChip score={j.aiScore} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{j.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {j.company} · {platformLabel(j.platform)}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(j.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard
          title="Source yield · 30 days"
          description="Approved jobs per source — keep the boards that pay off."
          actions={
            <Button size="sm" variant="ghost" nativeButton={false} render={<Link href="/admin/sources" />}>
              Sources
            </Button>
          }
        >
          {data.sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs in the last 30 days.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Found</TableHead>
                  <TableHead className="text-right">Approved</TableHead>
                  <TableHead className="text-right">Yield</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sources.map((s) => (
                  <TableRow key={s.platform}>
                    <TableCell>
                      <Link href={`/admin/jobs?platform=${encodeURIComponent(s.platform)}&days=30`} className="hover:underline">
                        {platformLabel(s.platform)}
                      </Link>
                    </TableCell>
                    <TableCell className="tabular text-right">{formatNumber(s.found)}</TableCell>
                    <TableCell className="tabular text-right">{formatNumber(s.approved)}</TableCell>
                    <TableCell className="tabular text-right">{formatPercent(ratio(s.approved, s.found))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
