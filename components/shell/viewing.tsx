'use client';

import { EyeIcon, UsersIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createContext, Fragment, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { setApiViewing } from '@/lib/clientApi';
import { cn } from '@/lib/utils';

// Whose data the dashboard shows: one user, or all of them. The choice is
// remembered in the jf_view cookie (server-rendered pages read it) and sent
// with every API request from this tab (lib/clientApi), so two tabs viewing
// different users never mix them up.

export type Viewing = number | 'all';
export type ViewingUser = { id: number; username: string; name: string; role: 'ADMIN' | 'USER'; active: boolean };

type ViewingContextValue = {
  viewing: Viewing;
  users: ViewingUser[];
  /** The signed-in admin. */
  me: number;
  setViewing: (v: Viewing) => void;
  /** The Users page's fresh list, so a user added a moment ago is in the menu at once. */
  setUsers: (users: ViewingUser[]) => void;
  userName: (id: number | null | undefined) => string;
  /** More than one user exists, so whose data it is matters. */
  multiUser: boolean;
};

const ViewingContext = createContext<ViewingContextValue>({
  viewing: 'all',
  users: [],
  me: 0,
  setViewing: () => {},
  setUsers: () => {},
  userName: () => '',
  multiUser: false,
});

export function useViewing(): ViewingContextValue {
  return useContext(ViewingContext);
}

const YEAR_S = 365 * 24 * 60 * 60;

export function ViewingProvider({
  initial,
  users: rendered,
  me,
  children,
}: {
  initial: Viewing;
  users: ViewingUser[];
  me: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const [viewing, setState] = useState<Viewing>(initial);
  // The users the server rendered, until the Users page hands over a fresher list (the server's list is cached for a
  // few seconds per instance); a new server render replaces it again.
  const [users, setUsers] = useState(rendered);
  const [renderedBefore, setRenderedBefore] = useState(rendered);
  if (rendered !== renderedBefore) {
    setRenderedBefore(rendered);
    setUsers(rendered);
  }
  // Set while rendering, not in an effect: the pages' first requests (their
  // mount effects run before this component's) must already carry it.
  setApiViewing(viewing);

  const setViewing = useCallback(
    (v: Viewing) => {
      document.cookie = `jf_view=${v}; path=/; max-age=${YEAR_S}; samesite=lax`;
      setApiViewing(v);
      setState(v);
      // Server-rendered parts (Dashboard, status) read the cookie again.
      router.refresh();
    },
    [router],
  );

  const value = useMemo<ViewingContextValue>(() => {
    const byId = new Map(users.map((u) => [u.id, u]));
    return {
      viewing,
      users,
      me,
      setViewing,
      setUsers,
      userName: (id) => (id == null ? 'Everyone' : (byId.get(id)?.name ?? `User #${id}`)),
      multiUser: users.length > 1,
    };
  }, [viewing, users, me, setViewing]);

  return <ViewingContext.Provider value={value}>{children}</ViewingContext.Provider>;
}

/** The page content, mounted again whenever the viewed user changes so every page loads that user's data. */
export function ViewingContent({ children }: { children: ReactNode }) {
  const { viewing } = useViewing();
  return <Fragment key={String(viewing)}>{children}</Fragment>;
}

/** The "Viewing" menu in the top bar (only when there is more than one user). */
export function ViewingPicker({ className }: { className?: string }) {
  const { viewing, users, me, setViewing, multiUser } = useViewing();
  if (!multiUser) return null;
  const items = [
    { value: 'all', label: 'All users' },
    ...users.map((u) => ({ value: String(u.id), label: u.id === me ? `${u.name} (you)` : u.name })),
  ];
  return (
    <Select
      items={items}
      value={String(viewing)}
      onValueChange={(v) => setViewing(v === 'all' ? 'all' : Number(v))}
    >
      <SelectTrigger size="sm" className={cn('max-w-52 gap-1.5', className)} aria-label="Whose data to view">
        {viewing === 'all' ? <UsersIcon className="size-4 opacity-70" /> : <EyeIcon className="size-4 opacity-70" />}
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {items.map((it) => {
          const u = users.find((x) => String(x.id) === it.value);
          return (
            <SelectItem key={it.value} value={it.value}>
              <span className={cn(u && !u.active && 'text-muted-foreground line-through')}>{it.label}</span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

/** A reminder under the top bar while you look at (and change) someone else's data. */
export function ViewingBanner() {
  const { viewing, me, userName, setViewing, multiUser } = useViewing();
  if (!multiUser || viewing === 'all' || viewing === me) return null;
  const name = userName(viewing);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-brand/10 px-4 py-1.5 text-sm sm:px-6">
      <EyeIcon className="size-4 text-brand" aria-hidden />
      <span>
        You are viewing <strong>{name}</strong>&apos;s data. Changes are saved to {name}&apos;s account.
      </span>
      <Button size="xs" variant="ghost" className="ml-auto" onClick={() => setViewing('all')}>
        All users
      </Button>
    </div>
  );
}

/** For pages that work on one user's data, while all users are shown: pick whose. */
export function ChooseUser({ what }: { what: string }) {
  const { users, me, setViewing } = useViewing();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a user</CardTitle>
        <CardDescription>
          {what} belong to one user. Pick whose to open; the Viewing menu at the top switches back to all users.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {users.map((u) => (
          <Button key={u.id} variant="outline" onClick={() => setViewing(u.id)} className={cn(!u.active && 'text-muted-foreground')}>
            {u.name}
            <span className="font-mono text-xs text-muted-foreground">{u.id === me ? 'you' : u.username}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

const CHIP_TONES = [
  'bg-chart-1/15 text-chart-1',
  'bg-chart-2/15 text-chart-2',
  'bg-chart-3/15 text-chart-3',
  'bg-chart-4/15 text-chart-4',
  'bg-chart-5/15 text-chart-5',
];

/** Whose a row is, when all users are shown (renders nothing while one user is viewed). */
export function UserChip({ userId, className }: { userId: number | null | undefined; className?: string }) {
  const { viewing, userName, multiUser } = useViewing();
  if (!multiUser || viewing !== 'all' || userId == null) return null;
  return (
    <Badge variant="secondary" className={cn('max-w-36 truncate border-0', CHIP_TONES[userId % CHIP_TONES.length], className)}>
      {userName(userId)}
    </Badge>
  );
}
