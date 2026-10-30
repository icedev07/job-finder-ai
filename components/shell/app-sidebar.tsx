'use client';

import { RadarIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { activeNavItem, NAV_GROUPS, NAV_ITEMS, navItemShown, type NavBadge } from '@/components/shell/nav';
import { NavUser } from '@/components/shell/nav-user';
import { useStatus } from '@/components/shell/status-provider';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { formatCompact } from '@/lib/format';

const BADGE_LABEL: Record<NavBadge, (n: number) => string> = {
  review: (n) => `${n} jobs to review`,
  nextActions: (n) => `${n} next actions`,
  setup: (n) => `${n} setup steps left`,
};

/** Left navigation: grouped sections with active state and live counts (review queue, next actions, setup). */
export function AppSidebar({ version, account }: { version: string; account: { name: string; username: string } }) {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();
  const { snapshot } = useStatus();
  const counts: Record<NavBadge, number> = {
    review: snapshot?.counts.review ?? 0,
    nextActions: snapshot?.counts.nextActions ?? 0,
    setup: snapshot ? snapshot.setup.steps.filter((s) => !s.done && !s.optional).length : 0,
  };
  const active = activeNavItem(pathname, NAV_ITEMS);
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/admin" onClick={closeOnMobile} />} tooltip="Job Finder">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                <RadarIcon className="size-5" />
              </span>
              <span className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate font-semibold">Job Finder</span>
                <span className="truncate text-xs text-sidebar-foreground/60">find · judge · apply</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.filter((item) => navItemShown(item, snapshot?.features)).map((item) => {
                  const isActive = item === active;
                  const count = item.badge ? counts[item.badge] : 0;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.title}
                        render={
                          <Link href={item.href} onClick={closeOnMobile} aria-current={isActive ? 'page' : undefined} />
                        }
                        className="data-active:text-sidebar-primary data-active:[&_svg]:text-sidebar-primary"
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                      {item.badge && count > 0 ? (
                        <SidebarMenuBadge
                          className={
                            item.badge === 'setup'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                              : 'bg-sidebar-primary text-sidebar-primary-foreground peer-data-active/menu-button:text-sidebar-primary-foreground peer-hover/menu-button:text-sidebar-primary-foreground'
                          }
                          aria-label={BADGE_LABEL[item.badge](count)}
                        >
                          {formatCompact(count)}
                        </SidebarMenuBadge>
                      ) : null}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-1">
        <NavUser version={version} account={account} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
