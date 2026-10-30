import type { Metadata } from "next";
import { Suspense } from "react";

import { ApplicationsView } from "@/components/applications/applications-view";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = { title: "Applications" };

export default function ApplicationsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Applications"
        description="Every application from saved to offer. Jobs you approve by hand land in Saved; “Mark as applied” in the extension moves them to Applied with a follow-up date. Open a card for its timeline."
      />
      <Suspense>
        <ApplicationsView />
      </Suspense>
    </div>
  );
}
