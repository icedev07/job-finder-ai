'use client';

import { ChevronsUpDownIcon, KeyRoundIcon, ListTodoIcon, LogOutIcon, PaletteIcon, ShieldCheckIcon } from 'lucide-react';
import Link from 'next/link';

import { ThemeRadioGroup } from '@/components/shell/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';

async function signOut() {
  await fetch('/api/admin/auth', { method: 'DELETE' }).catch(() => {});
  // A full reload on purpose: nothing from the signed-in session survives in memory.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = '/admin/login';
}

/** Sidebar footer: who is signed in, theme, setup and sign out. */
export function NavUser({ version, account }: { version: string; account: { name: string; username: string } }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="data-popup-open:bg-sidebar-accent" tooltip="Account" />
            }
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheckIcon className="size-4" />
            </span>
            <span className="grid min-w-0 flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium">{account.name}</span>
              <span className="truncate text-xs text-sidebar-foreground/60">
                {account.username} · v{version}
              </span>
            </span>
            <ChevronsUpDownIcon className="ml-auto size-4 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Signed in as {account.username}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <PaletteIcon />
                Theme
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-36">
                <ThemeRadioGroup />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem render={<Link href="/admin/settings#password" />}>
              <KeyRoundIcon />
              Change password
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/admin/setup" />}>
              <ListTodoIcon />
              Setup checklist
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => void signOut()}>
              <LogOutIcon />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
