import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { DataPanels } from "@/components/data/data-panels";
import { SqlConsole } from "@/components/data/sql-console";

export const metadata: Metadata = { title: "Data" };

export default function DataPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Data"
        description="Database size, clean-ups, exports, the danger zone and an SQL console (reads run read-only; writes need your password)."
      />
      <DataPanels />
      <SqlConsole />
    </div>
  );
}
