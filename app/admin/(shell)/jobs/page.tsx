import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/common/page-header";
import { JobsView } from "@/components/jobs/jobs-view";

export const metadata: Metadata = { title: "Jobs" };

export default function JobsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Jobs"
        description="Every job the scanners and the LinkedIn extension judged. Filter, change the pipeline stage, rate the AI verdict and act on many jobs at once."
      />
      <Suspense>
        <JobsView />
      </Suspense>
    </div>
  );
}
