import {
  BanIcon,
  BriefcaseIcon,
  DatabaseIcon,
  FileUserIcon,
  KanbanIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  ListTodoIcon,
  PuzzleIcon,
  RadarIcon,
  ScrollTextIcon,
  SettingsIcon,
  SparklesIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react';

export type NavBadge = 'review' | 'followUps' | 'setup';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: NavBadge;
  /** Extra words the command palette matches on. */
  keywords?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ title: 'Dashboard', href: '/admin', icon: LayoutDashboardIcon, keywords: 'home stats overview' }],
  },
  {
    label: 'Work',
    items: [
      { title: 'Jobs', href: '/admin/jobs', icon: BriefcaseIcon, keywords: 'list table search approved' },
      { title: 'Review', href: '/admin/review', icon: ListChecksIcon, badge: 'review', keywords: 'queue feedback unsure' },
      {
        title: 'Applications',
        href: '/admin/applications',
        icon: KanbanIcon,
        badge: 'followUps',
        keywords: 'pipeline board applied interview offer follow-up',
      },
    ],
  },
  {
    label: 'Configure',
    items: [
      { title: 'Sources', href: '/admin/sources', icon: RadarIcon, keywords: 'scanners boards feeds scrape' },
      { title: 'Skip rules', href: '/admin/skip-rules', icon: BanIcon, keywords: 'block filter company title' },
      { title: 'AI', href: '/admin/ai', icon: SparklesIcon, keywords: 'claude models routes keys usage cost playground' },
      { title: 'Profile & resumes', href: '/admin/profile', icon: FileUserIcon, keywords: 'cv resume answers autofill' },
      { title: 'Extension', href: '/admin/extension', icon: PuzzleIcon, keywords: 'chrome linkedin api key autofill' },
    ],
  },
  {
    label: 'System',
    items: [
      { title: 'Users', href: '/admin/users', icon: UsersIcon, keywords: 'people accounts sign-in team password' },
      { title: 'Logs', href: '/admin/logs', icon: ScrollTextIcon, keywords: 'scan analysis extension errors' },
      { title: 'Data', href: '/admin/data', icon: DatabaseIcon, keywords: 'sql database storage cleanup export' },
      { title: 'Settings', href: '/admin/settings', icon: SettingsIcon, keywords: 'password sheets prompt location' },
      { title: 'Setup', href: '/admin/setup', icon: ListTodoIcon, badge: 'setup', keywords: 'checklist onboarding' },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** The item whose href is the longest prefix of the path ("/admin" only matches exactly). */
export function activeNavItem(pathname: string, items: NavItem[] = NAV_ITEMS): NavItem | undefined {
  let best: NavItem | undefined;
  for (const item of items) {
    const match =
      item.href === '/admin' ? pathname === '/admin' : pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (match && (!best || item.href.length > best.href.length)) best = item;
  }
  return best;
}

export function breadcrumbFor(pathname: string): { group?: string; item?: NavItem } {
  const item = activeNavItem(pathname);
  if (!item) return {};
  const group = NAV_GROUPS.find((g) => g.items.includes(item))?.label;
  return { group, item };
}
