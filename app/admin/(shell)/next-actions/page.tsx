import type { Metadata } from "next";

import { NextActionsView } from "@/components/applications/next-actions-view";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = { title: "Next actions" };

export default function NextActionsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Next actions"
        description="What to do next on each application: interviews in the next two days, follow-ups that are due, applications with no answer for weeks and saved jobs not applied to yet. Mark one followed up or applied, snooze it or close it; every change can be undone from its message."
      />
      <NextActionsView />
    </div>
  );
}
