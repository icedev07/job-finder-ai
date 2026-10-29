import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/common/page-header";
import { PipelineBoard } from "@/components/jobs/pipeline-board";

export const metadata: Metadata = { title: "Applications" };

export default function ApplicationsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Applications"
        description="Your pipeline from saved to offer. Jobs you approve in Review land in Saved; “Mark as applied” in the extension moves them to Applied with a follow-up date."
      />
      <Suspense>
        <PipelineBoard />
      </Suspense>
    </div>
  );
}
