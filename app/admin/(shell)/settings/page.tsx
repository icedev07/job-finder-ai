import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        description="Matching targets, the analysis prompt, Google Sheets export and your password. AI keys and models live on the AI page; the extension key on the Extension page."
      />
      <SettingsView />
    </div>
  );
}
