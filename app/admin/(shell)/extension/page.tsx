import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { ExtensionKeyCard } from "@/components/extension/extension-key-card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber, timeAgo } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getStatusSnapshot } from "@/lib/status";

export const metadata: Metadata = { title: "Extension" };
export const dynamic = "force-dynamic";

const ATS = [
  ["Greenhouse", "boards / job-boards.greenhouse.io and embedded Greenhouse forms"],
  ["Lever", "jobs.lever.co"],
  ["Ashby", "jobs.ashbyhq.com"],
  ["Workable", "apply.workable.com"],
  ["SmartRecruiters", "jobs.smartrecruiters.com"],
  ["Personio", "*.jobs.personio.de / .com"],
  ["Recruitee", "*.recruitee.com"],
  ["Teamtailor", "*.teamtailor.com"],
  ["Any other form", "generic label matching — check the result more carefully"],
];

async function easyApplyStats() {
  try {
    const rows = await prisma.scrapedJob.groupBy({
      by: ["applyMethod", "status"],
      where: { platform: "linkedin" },
      _count: { _all: true },
    });
    const get = (m: string | null, s: string) =>
      rows.find((r) => r.applyMethod === m && r.status === s)?._count._all ?? 0;
    return {
      easyApproved: get("EASY_APPLY", "APPROVED"),
      easyRejected: get("EASY_APPLY", "REJECTED"),
      externalApproved: get("EXTERNAL", "APPROVED"),
      externalRejected: get("EXTERNAL", "REJECTED"),
    };
  } catch {
    return null;
  }
}

export default async function ExtensionPage() {
  const [status, stats] = await Promise.all([getStatusSnapshot().catch(() => null), easyApplyStats()]);
  return (
    <div className="space-y-4">
      <PageHeader
        title="Extension"
        description="The Chrome extension scans LinkedIn searches with your AI routes and fills application forms from your profile."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <ExtensionKeyCard />
        <SectionCard
          title="Install"
          description={
            status?.extension.lastSeen
              ? `Last LinkedIn job received ${timeAgo(status.extension.lastSeen)}.`
              : "No LinkedIn job received yet."
          }
        >
          <ol className="list-decimal space-y-1.5 pl-5 text-sm">
            <li>
              Open <code>chrome://extensions</code> and turn on <strong>Developer mode</strong>.
            </li>
            <li>
              Click <strong>Load unpacked</strong> and pick the <code>extension/</code> folder of this project (after an update, click
              the reload icon on the extension card).
            </li>
            <li>Open the extension popup, paste the server URL and API key from the left, click Save.</li>
            <li>
              Open a LinkedIn job search and click <strong>Start Scan</strong>. Turn on “Analyze AI search page (beta)” on LinkedIn&apos;s
              chat-style search.
            </li>
          </ol>
        </SectionCard>
      </div>

      <SectionCard
        title="Easy Apply jobs"
        description="Set in the extension popup → “Easy Apply jobs”. Skip and hide (default) rejects and hides them without using AI. Analyze with AI judges them like every other job and marks them “Easy Apply” here, in the popup and in the Google Sheet; an optional minimum score keeps only strong Easy Apply matches."
      >
        {stats ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>LinkedIn jobs</TableHead>
                <TableHead className="text-right">Approved</TableHead>
                <TableHead className="text-right">Rejected</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Easy Apply</TableCell>
                <TableCell className="tabular text-right">{formatNumber(stats.easyApproved)}</TableCell>
                <TableCell className="tabular text-right">{formatNumber(stats.easyRejected)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" nativeButton={false} render={<Link href="/admin/jobs?apply=EASY_APPLY" />}>
                    View
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Company site</TableCell>
                <TableCell className="tabular text-right">{formatNumber(stats.externalApproved)}</TableCell>
                <TableCell className="tabular text-right">{formatNumber(stats.externalRejected)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" nativeButton={false} render={<Link href="/admin/jobs?apply=EXTERNAL" />}>
                    View
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">Run /api/setup to add the apply-method column.</p>
        )}
      </SectionCard>

      <SectionCard
        title="Autofill application forms"
        description="Open a company's application form, then the extension popup → Autofill panel. It fills the form from your profile, attaches the right resume, drafts free-text answers with your Answers route, and colours every field: green = from your profile, amber = drafted by AI (read it), red = needs you. It never submits — you review and click Submit yourself, then “Mark as applied”."
        actions={
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/admin/profile" />}>
            Profile & resumes
          </Button>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Form</TableHead>
              <TableHead>Where</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ATS.map(([name, where]) => (
              <TableRow key={name}>
                <TableCell className="font-medium">{name}</TableCell>
                <TableCell className="text-muted-foreground">{where}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-xs text-muted-foreground">
          Workday and LinkedIn&apos;s own Easy Apply modal are not filled yet — they use multi-step custom widgets.
        </p>
      </SectionCard>
    </div>
  );
}
