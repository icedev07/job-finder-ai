import { CircleCheckIcon, CircleIcon, TriangleAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { RecheckButton, RunSetupButton, SecretGenerator } from "@/components/setup/setup-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { describeDbError } from "@/lib/dbErrors";
import { getStatusSnapshot, type StatusSnapshot } from "@/lib/status";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Setup" };
export const dynamic = "force-dynamic";

// The checklist needs the settings table. When the database cannot be read
// (down, paused, pool full, wrong DATABASE_URL) the page says why instead of
// failing: this is where people come to fix exactly that.
async function loadStatus(): Promise<{ status: StatusSnapshot | null; dbError: string | null }> {
  try {
    return { status: await getStatusSnapshot(), dbError: null };
  } catch (e) {
    console.error("[setup] status unavailable:", (e as Error)?.message);
    return { status: null, dbError: describeDbError(e) };
  }
}

function Checklist({ setup }: { setup: StatusSnapshot["setup"] }) {
  const { steps, done, total } = setup;
  const required = steps.filter((s) => !s.optional);
  const requiredDone = required.filter((s) => s.done).length;

  return (
    <SectionCard
      title={`${done} of ${total} steps done`}
      description={
        requiredDone === required.length
          ? "All required steps are done."
          : `${required.length - requiredDone} required step${required.length - requiredDone === 1 ? "" : "s"} left.`
      }
    >
      <Progress value={(done / total) * 100} aria-label="Setup progress" />
      <ol className="divide-y">
        {steps.map((s, i) => (
          <li key={s.key} className="flex items-start gap-3 py-3">
            {s.done ? (
              <CircleCheckIcon className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Done" />
            ) : (
              <CircleIcon className={cn("mt-0.5 size-5 shrink-0", s.optional ? "text-muted-foreground" : "text-amber-500")} aria-label="To do" />
            )}
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className={cn("text-sm font-medium", s.done && "text-muted-foreground line-through decoration-muted-foreground/40")}>
                {i + 1}. {s.title}
                {s.optional ? (
                  <Badge variant="outline" className="ml-2">
                    optional
                  </Badge>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">{s.hint}</p>
            </div>
            {!s.done ? (
              s.key === "tables" ? (
                <RunSetupButton />
              ) : (
                <Button size="sm" variant="outline" nativeButton={false} render={<Link href={s.href} />}>
                  Fix
                </Button>
              )
            ) : null}
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}

export default async function SetupPage() {
  const { status, dbError } = await loadStatus();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Setup"
        description="Everything the app needs, in order. Required steps first; optional ones unlock Claude, autofill and the Sheets export."
        actions={<RecheckButton />}
      />

      {status ? (
        <Checklist setup={status.setup} />
      ) : (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Can&apos;t read the database</AlertTitle>
          <AlertDescription>
            <p>{dbError}</p>
            <p>The checklist needs the database, so it shows up once the database answers. Fix the cause above, then press Check again.</p>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div id="cron" className="scroll-mt-20">
          <SectionCard
            title="CRON_SECRET — the daily scan"
            description="Vercel runs GET /api/admin/scanners/run every day at 06:00 UTC and sends “Authorization: Bearer $CRON_SECRET”. Without the variable the scan is refused (and logged in Logs), so nobody else can trigger scans that spend your AI quota."
          >
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              <li>Vercel → your project → Settings → Environment Variables.</li>
              <li>
                Add <code>CRON_SECRET</code> with a long random value (generate one below) for Production.
              </li>
              <li>Redeploy.</li>
            </ol>
            <SecretGenerator name="CRON_SECRET" />
          </SectionCard>
        </div>
        <div id="session" className="scroll-mt-20">
          <SectionCard
            title="SESSION_SECRET — sign-in cookies (optional)"
            description="Signs the admin session cookie. Without it the key is derived from DATABASE_URL, which works but changes when the database password changes. Changing it signs every browser out."
          >
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              <li>
                Add <code>SESSION_SECRET</code> in the same place, with a long random value.
              </li>
              <li>Redeploy, then sign in again.</li>
            </ol>
            <SecretGenerator name="SESSION_SECRET" />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
