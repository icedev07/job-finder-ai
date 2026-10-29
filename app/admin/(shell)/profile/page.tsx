import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/common/page-header";
import { ProfileView } from "@/components/profile/profile-view";

export const metadata: Metadata = { title: "Profile & resumes" };

export default function ProfilePage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Profile & resumes"
        description="The facts autofill and the AI use: your contact details, work terms, skills and experience, resume variants and saved answers. Stored only in your database."
      />
      <Suspense>
        <ProfileView />
      </Suspense>
    </div>
  );
}
