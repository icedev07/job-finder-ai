import type { Metadata } from "next";
import { Suspense } from "react";

import { AiView } from "@/components/ai/ai-view";
import { PageHeader } from "@/components/common/page-header";

export const metadata: Metadata = { title: "AI" };

export default function AiPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="AI"
        description="Keys, which provider and Claude model handles each task, what it costs, and tools to compare models on your own jobs."
      />
      <Suspense>
        <AiView />
      </Suspense>
    </div>
  );
}
