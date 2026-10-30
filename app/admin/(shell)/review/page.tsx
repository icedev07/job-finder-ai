import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { ReviewView } from "@/components/review/review-view";

export const metadata: Metadata = { title: "Review" };

export default function ReviewPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Review"
        description="Close calls from the last 30 days: verdicts near the approval line. Approve or reject them (your answers teach AI → Evaluations), keep the AI verdict, or mark them all reviewed."
      />
      <ReviewView />
    </div>
  );
}
