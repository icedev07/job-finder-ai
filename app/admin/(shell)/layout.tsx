import { cookies } from "next/headers";

import { AppSidebar } from "@/components/shell/app-sidebar";
import { StatusProvider } from "@/components/shell/status-provider";
import { TopBar } from "@/components/shell/top-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { pageAdmin } from "@/lib/scope";
import { getStatusSnapshot, type StatusSnapshot } from "@/lib/status";
import pkg from "@/package.json";

export const dynamic = "force-dynamic";

async function initialStatus(adminId: number): Promise<StatusSnapshot | null> {
  try {
    return await getStatusSnapshot(adminId);
  } catch {
    return null;
  }
}

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  // proxy.ts already redirects signed-out visitors; this also checks the user
  // (disabled, signed out everywhere) and redirects to the login page.
  const admin = await pageAdmin();
  const status = await initialStatus(admin.id);
  const sidebarOpen = jar.get("sidebar_state")?.value !== "false";

  return (
    <StatusProvider initial={status}>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <a
          href="#content"
          className="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:ring-3 focus:ring-ring/50"
        >
          Skip to content
        </a>
        <AppSidebar version={pkg.version} account={{ name: admin.name, username: admin.username }} />
        <SidebarInset className="min-w-0">
          <TopBar />
          <div id="content" className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6 sm:py-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </StatusProvider>
  );
}
