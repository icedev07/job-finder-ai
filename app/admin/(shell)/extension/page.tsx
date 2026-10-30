import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { ExtensionConnectCard } from "@/components/extension/extension-connect-card";
import { ExtensionPanel } from "@/components/extension/extension-panel";
import { LinkedInAiCard } from "@/components/extension/linkedin-ai-card";
import { SharedKeyCard } from "@/components/extension/shared-key-card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber, timeAgo } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { pageScope, userWhere, viewingUserId } from "@/lib/scope";
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

async function easyApplyStats(where: { userId?: number }) {
  try {
    const rows = await prisma.scrapedJob.groupBy({
      by: ["applyMethod", "status"],
      where: { ...where, platform: "linkedin" },
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
  const scope = await pageScope();
  const [status, stats] = await Promise.all([getStatusSnapshot(scope).catch(() => null), easyApplyStats(userWhere(scope))]);
  return (
    <div className="space-y-4">
      <PageHeader
        title="Extension"
        description="The Job Finder Chrome extension scans LinkedIn searches with your AI routes and fills application forms from a user's profile. Everyone signs in with their own user ID and password."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <ExtensionConnectCard />
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
              Download <code>job-finder-extension-v….zip</code> from the newest GitHub release of this project and extract it to a
              folder you keep (or use the <code>extension/</code> folder of the project).
            </li>
            <li>
              Open <code>chrome://extensions</code>, turn on <strong>Developer mode</strong>, click <strong>Load unpacked</strong> and
              pick that folder. To update, replace the files and click the reload icon on the extension&apos;s card.
            </li>
            <li>
              Click the extension&apos;s icon, enter the server URL, a user ID and password, and click <strong>Sign in</strong>.
            </li>
            <li>
              Open a LinkedIn job search and click <strong>Start Scan</strong>. Admins pick whose jobs they are under “Scan for”.
            </li>
          </ol>
        </SectionCard>
      </div>

      <LinkedInAiCard userId={viewingUserId(scope)} />

      <ExtensionPanel />

      <SectionCard
        title="Easy Apply jobs"
        description="Set per user under Extension settings above, or in the popup. Skip and hide (the default) rejects and hides them without using AI. Analyze with AI judges them like every other job and marks them “Easy Apply” here, in the popup and in the Google Sheet; an optional minimum score keeps only strong Easy Apply matches."
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
        description="Open a company's application form, then the extension popup → Autofill panel. It fills the form from the profile of the user the extension works for (the one signed in, or the one picked under “Scan for”), attaches the right resume, drafts free-text answers with your Answers route, and colours every field: green = from the profile, amber = drafted by AI (read it), red = needs you. It never submits — you review and click Submit yourself, then “Mark as applied”."
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

      <SharedKeyCard />
    </div>
  );
}
