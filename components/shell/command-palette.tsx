'use client';

import {
  BriefcaseIcon,
  LaptopIcon,
  LogOutIcon,
  MoonIcon,
  PlayIcon,
  RefreshCwIcon,
  SearchIcon,
  SheetIcon,
  SparklesIcon,
  SunIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { NAV_ITEMS, navItemShown } from '@/components/shell/nav';
import { useStatus } from '@/components/shell/status-provider';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { Kbd } from '@/components/ui/kbd';
import { api, errorMessage } from '@/lib/clientApi';

type ActionResult = Record<string, unknown> & { error?: string };

/** ⌘K / Ctrl+K: jump to any page, search jobs, run the common actions, switch theme, sign out. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { setTheme } = useTheme();
  const { refresh, snapshot } = useStatus();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const go = (href: string) => {
    close();
    router.push(href);
  };
  const run = (label: string, fn: () => Promise<ActionResult>, describe: (r: ActionResult) => string) => {
    close();
    toast.promise(
      fn().finally(() => refresh()),
      {
        loading: `${label}…`,
        success: (r) => describe(r),
        error: (e) => `${label} failed: ${errorMessage(e)}`,
      },
    );
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 text-muted-foreground"
        aria-label="Open the command palette"
      >
        <SearchIcon />
        <span className="hidden lg:inline">Search…</span>
        <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())} title="Command palette">
        <Command>
          <CommandInput value={query} onValueChange={setQuery} placeholder="Go to a page, run an action, search jobs…" />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            {query.trim() ? (
              <CommandGroup heading="Jobs">
                <CommandItem
                  value={`search jobs ${query}`}
                  onSelect={() => go(`/admin/jobs?q=${encodeURIComponent(query.trim())}`)}
                >
                  <BriefcaseIcon />
                  Search jobs for “{query.trim()}”
                </CommandItem>
              </CommandGroup>
            ) : null}
            <CommandGroup heading="Pages">
              {NAV_ITEMS.filter((item) => navItemShown(item, snapshot?.features)).map((item) => (
                <CommandItem key={item.href} value={`${item.title} ${item.keywords ?? ''}`} onSelect={() => go(item.href)}>
                  <item.icon />
                  {item.title}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Actions">
              <CommandItem
                value="run scan pass scrape all sources boards"
                onSelect={() =>
                  run(
                    'Scan pass',
                    () => api<ActionResult>('/api/admin/scanners/run', { method: 'POST', json: { board: 'all' } }),
                    (r) => `Scan pass done: ${Number(r.jobsSaved ?? 0)} new, ${Number(r.approved ?? 0)} approved`,
                  )
                }
              >
                <PlayIcon />
                Run a scan pass
                <CommandShortcut>~1 min</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="analyze pending jobs"
                onSelect={() =>
                  run(
                    'Analyzing pending jobs',
                    () => api<ActionResult>('/api/admin/analyze', { method: 'POST', json: {} }),
                    (r) => `Analyzed ${Number(r.analyzed ?? 0)} · ${Number(r.remaining ?? 0)} left`,
                  )
                }
              >
                <SparklesIcon />
                Analyze pending jobs
              </CommandItem>
              <CommandItem
                value="sync google sheets export"
                onSelect={() =>
                  run(
                    'Syncing to Google Sheets',
                    () => api<ActionResult>('/api/admin/sheets-sync', { method: 'POST' }),
                    (r) => `Synced ${Number(r.synced ?? 0)} jobs`,
                  )
                }
              >
                <SheetIcon />
                Sync approved jobs to Google Sheets
              </CommandItem>
              <CommandItem value="refresh status" onSelect={() => { close(); refresh(); }}>
                <RefreshCwIcon />
                Refresh status
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Theme">
              <CommandItem value="theme light" onSelect={() => { setTheme('light'); close(); }}>
                <SunIcon />
                Light
              </CommandItem>
              <CommandItem value="theme dark" onSelect={() => { setTheme('dark'); close(); }}>
                <MoonIcon />
                Dark
              </CommandItem>
              <CommandItem value="theme system" onSelect={() => { setTheme('system'); close(); }}>
                <LaptopIcon />
                System
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Account">
              <CommandItem
                value="sign out logout"
                onSelect={() => {
                  close();
                  void fetch('/api/admin/auth', { method: 'DELETE' }).finally(() => {
                    // A full reload on purpose, as in the sidebar's sign-out.
                    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                    window.location.href = '/admin/login';
                  });
                }}
              >
                <LogOutIcon />
                Sign out
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
