import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { ReviewDeck } from "@/components/jobs/review-deck";

export const metadata: Metadata = { title: "Review" };

export default function ReviewPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Review"
        description="Close calls from the last 30 days — scores near the approval line. A few seconds each: your yes / no fixes the verdict and teaches the evaluations what you want."
      />
      <ReviewDeck />
    </div>
  );
}
