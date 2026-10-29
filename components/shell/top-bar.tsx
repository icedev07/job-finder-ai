'use client';

import { usePathname } from 'next/navigation';

import { CommandPalette } from '@/components/shell/command-palette';
import { breadcrumbFor } from '@/components/shell/nav';
import { StatusStrip } from '@/components/shell/status-strip';
import { ViewingPicker } from '@/components/shell/viewing';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

function Crumbs() {
  const pathname = usePathname();
  const { group, item } = breadcrumbFor(pathname);
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      {group ? <span className="hidden text-muted-foreground 2xl:inline">{group}</span> : null}
      {group ? (
        <span className="hidden text-muted-foreground/60 2xl:inline" aria-hidden>
          /
        </span>
      ) : null}
      <span className="truncate font-medium" aria-current="page">
        {item?.title ?? 'Job Finder'}
      </span>
    </nav>
  );
}

/** Sticky header: sidebar toggle, breadcrumb, live status strip (own row on phones), whose data to view and command palette. */
export function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="flex h-12 items-center gap-2 px-3 sm:px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4 data-vertical:self-center" />
        <Crumbs />
        <div className="flex min-w-0 flex-1 justify-end">
          <StatusStrip className="hidden md:flex" />
        </div>
        <ViewingPicker />
        <CommandPalette />
      </div>
      <div className="border-t px-2 py-1 md:hidden">
        <StatusStrip />
      </div>
    </header>
  );
}
