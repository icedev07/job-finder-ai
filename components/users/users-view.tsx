'use client';

import { KeyRoundIcon, LogOutIcon, MoreHorizontalIcon, PencilIcon, PowerIcon, Trash2Icon, UserPlusIcon } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/common/page-header';
import { StatusDot } from '@/components/common/status-dot';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLoadOnMount } from '@/hooks/use-load-on-mount';
import { api, errorMessage } from '@/lib/clientApi';
import { formatDate, timeAgo } from '@/lib/format';

type Role = 'ADMIN' | 'USER';

type UserItem = {
  id: number;
  username: string;
  name: string;
  role: Role;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  isOwner: boolean;
  isYou: boolean;
  passwordFromEnv: boolean;
  currentLocation: string;
  targetMarket: string;
  jobs: number;
  approved: number;
};

const ROLE_INFO: Record<Role, { label: string; hint: string }> = {
  ADMIN: { label: 'Admin', hint: 'Signs in to this dashboard and manages everyone.' },
  USER: { label: 'User', hint: 'Signs in to the Chrome extension only (sign-in arrives with the next extension update).' },
};
const ROLE_ITEMS = (Object.keys(ROLE_INFO) as Role[]).map((value) => ({ value, label: ROLE_INFO[value].label }));
const MIN_PASSWORD = 8;
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;

type DialogState =
  | { kind: 'add' }
  | { kind: 'edit'; user: UserItem }
  | { kind: 'password'; user: UserItem }
  | { kind: 'delete'; user: UserItem }
  | null;

/** The Users page: everyone who can sign in, with add, edit, password, disable, sign-out-everywhere and delete. */
export function UsersView() {
  const [users, setUsers] = useState<UserItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ users: UserItem[] }>('/api/admin/users');
      setUsers(r.users);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);
  useLoadOnMount(load);

  async function patch(user: UserItem, body: Record<string, unknown>, success: string) {
    try {
      await api(`/api/admin/users/${user.id}`, { method: 'PATCH', json: body });
      toast.success(success);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const header = (
    <PageHeader
      title="Users"
      description="Everyone who can sign in, with a user ID and password (no email). Each user is one job search: their own location, target market, profile, results and Google Sheet. Admins use this dashboard; users sign in to the Chrome extension."
      actions={
        <Button onClick={() => setDialog({ kind: 'add' })} disabled={!users}>
          <UserPlusIcon />
          Add user
        </Button>
      }
    />
  );

  if (error || !users) {
    return (
      <div className="space-y-4">
        {header}
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <div className="grid h-40 place-items-center">
            <Spinner />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden lg:table-cell">Search</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Jobs</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Last sign-in</TableHead>
              <TableHead className="hidden md:table-cell">Added</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className={u.active ? undefined : 'text-muted-foreground'}>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{u.name}</span>
                    {u.isYou ? <Badge variant="secondary">You</Badge> : null}
                    {u.isOwner ? <Badge variant="outline">First admin</Badge> : null}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{u.username}</TableCell>
                <TableCell>{ROLE_INFO[u.role].label}</TableCell>
                <TableCell className="hidden max-w-64 lg:table-cell">
                  {u.currentLocation || u.targetMarket ? (
                    <span className="block truncate" title={`Based in ${u.currentLocation || '?'}, targeting ${u.targetMarket || '?'}`}>
                      {u.currentLocation || '?'} → {u.targetMarket || '?'}
                    </span>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-400">Not set</span>
                  )}
                </TableCell>
                <TableCell className="tabular hidden text-right sm:table-cell" title={`${u.approved} approved`}>
                  {u.jobs.toLocaleString()}
                </TableCell>
                <TableCell>
                  <StatusDot tone={u.active ? 'ok' : 'idle'} label={u.active ? 'Active' : 'Disabled'} />
                </TableCell>
                <TableCell className="hidden md:table-cell" title={u.lastLoginAt ? formatDate(u.lastLoginAt) : undefined}>
                  {u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'Never'}
                </TableCell>
                <TableCell className="hidden md:table-cell">{formatDate(u.createdAt)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${u.name}`} />}>
                      <MoreHorizontalIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onClick={() => setDialog({ kind: 'edit', user: u })}>
                        <PencilIcon />
                        Edit name or role…
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={u.isYou || u.passwordFromEnv}
                        onClick={() => setDialog({ kind: 'password', user: u })}
                      >
                        <KeyRoundIcon />
                        Set new password…
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          void patch(
                            u,
                            { signOut: true },
                            u.isYou ? 'Your other browsers are signed out' : `${u.name} is signed out everywhere`,
                          )
                        }
                      >
                        <LogOutIcon />
                        Sign out everywhere
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={u.isYou}
                        onClick={() =>
                          void patch(
                            u,
                            { active: !u.active },
                            u.active ? `${u.name} is disabled and signed out` : `${u.name} can sign in again`,
                          )
                        }
                      >
                        <PowerIcon />
                        {u.active ? 'Disable' : 'Enable'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={u.isYou}
                        onClick={() => setDialog({ kind: 'delete', user: u })}
                      >
                        <Trash2Icon />
                        Delete…
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <p className="text-xs text-muted-foreground">
        Change your own password in Settings → Your password. Disabling someone, setting their password or signing them out
        everywhere ends their sessions within seconds.
      </p>

      <AddUserDialog
        users={users}
        open={dialog?.kind === 'add'}
        onClose={() => setDialog(null)}
        onDone={async (name) => {
          setDialog(null);
          toast.success(`${name} can sign in now`);
          await load();
        }}
      />
      {dialog?.kind === 'edit' ? (
        <EditUserDialog
          user={dialog.user}
          onClose={() => setDialog(null)}
          onSave={async (body) => {
            await patch(dialog.user, body, 'Saved');
            setDialog(null);
          }}
        />
      ) : null}
      {dialog?.kind === 'password' ? (
        <PasswordDialog
          user={dialog.user}
          onClose={() => setDialog(null)}
          onSave={async (password) => {
            await patch(dialog.user, { password }, `New password set — ${dialog.user.name} is signed out everywhere`);
            setDialog(null);
          }}
        />
      ) : null}
      {dialog?.kind === 'delete' ? (
        <DeleteUserDialog
          user={dialog.user}
          onClose={() => setDialog(null)}
          onDeleted={async () => {
            setDialog(null);
            toast.success(`${dialog.user.name} is deleted`);
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function RoleSelect({ value, onChange, disabled }: { value: Role; onChange: (r: Role) => void; disabled?: boolean }) {
  return (
    <Select items={ROLE_ITEMS} value={value} onValueChange={(v) => onChange(v as Role)} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLE_ITEMS.map((r) => (
          <SelectItem key={r.value} value={r.value}>
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function passwordProblem(password: string, repeat: string): string | null {
  if (password.trim().length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (password !== repeat) return 'The two passwords differ.';
  return null;
}

const NO_COPY = 'none';

function AddUserDialog({
  users,
  open,
  onClose,
  onDone,
}: {
  users: UserItem[];
  open: boolean;
  onClose: () => void;
  onDone: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<Role>('USER');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [location, setLocation] = useState('');
  const [market, setMarket] = useState('');
  const [copyFrom, setCopyFrom] = useState<string>(NO_COPY);
  const [copy, setCopy] = useState({ search: true, rules: true, profile: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const source = users.find((u) => String(u.id) === copyFrom);
  const copiesSearch = !!source && copy.search;
  const copyItems = [
    { value: NO_COPY, label: 'Nobody — start empty' },
    ...users.map((u) => ({ value: String(u.id), label: `${u.name} (${u.username})` })),
  ];

  const id = username.trim().toLowerCase();
  const idProblem = id && !USERNAME_RE.test(id) ? '3–32 characters: letters, digits, dot, dash or underscore.' : null;

  function reset() {
    setName('');
    setUsername('');
    setRole('USER');
    setPassword('');
    setRepeat('');
    setLocation('');
    setMarket('');
    setCopyFrom(NO_COPY);
    setCopy({ search: true, rules: true, profile: false });
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem =
      idProblem ??
      passwordProblem(password, repeat) ??
      (!copiesSearch && (!location.trim() || !market.trim())
        ? 'Say where they are based and which market they target (or copy the search options of another user).'
        : null);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api('/api/admin/users', {
        method: 'POST',
        json: {
          name: name.trim() || id,
          username: id,
          role,
          password,
          currentLocation: location,
          targetMarket: market,
          ...(source ? { copyFrom: source.id, copy } : {}),
        },
      });
      const shown = name.trim() || id;
      reset();
      await onDone(shown);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>
              They sign in with this user ID and password; no email is needed. The AI judges their jobs against where they are
              based and the market they target.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="u-name">Name</FieldLabel>
              <Input id="u-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Anna Petrosyan" maxLength={80} />
            </Field>
            <Field data-invalid={!!idProblem || undefined}>
              <FieldLabel htmlFor="u-id">User ID</FieldLabel>
              <Input
                id="u-id"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="anna"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={!!idProblem || undefined}
                required
              />
              <FieldDescription>{idProblem ?? 'Lower-case letters, digits, dot, dash or underscore.'}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Role</FieldLabel>
              <RoleSelect value={role} onChange={setRole} />
              <FieldDescription>{ROLE_INFO[role].hint}</FieldDescription>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="u-location">Based in</FieldLabel>
                <Input
                  id="u-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={copiesSearch ? `As ${source!.name}: ${source!.currentLocation || '?'}` : 'e.g. Poland'}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="u-market">Target market</FieldLabel>
                <Input
                  id="u-market"
                  value={market}
                  onChange={(e) => setMarket(e.target.value)}
                  placeholder={copiesSearch ? `As ${source!.name}: ${source!.targetMarket || '?'}` : 'e.g. Europe, remote worldwide'}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel>Copy the set-up of</FieldLabel>
              <Select items={copyItems} value={copyFrom} onValueChange={(v) => setCopyFrom(String(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {copyItems.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {source ? (
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 text-sm">
                  {(
                    [
                      ['search', 'Search options & job boards'],
                      ['rules', 'Skip rules'],
                      ['profile', 'Profile, resumes & answers'],
                    ] as const
                  ).map(([k, label]) => (
                    <label key={k} className="flex items-center gap-2">
                      <Checkbox checked={copy[k]} onCheckedChange={(on) => setCopy((c) => ({ ...c, [k]: on }))} />
                      {label}
                    </label>
                  ))}
                </div>
              ) : null}
              <FieldDescription>
                {source
                  ? 'Never their jobs. Fill in Based in / Target market above to change the copied ones.'
                  : 'Optional: start from another user’s search options, skip rules or profile.'}
              </FieldDescription>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="u-pw">Password</FieldLabel>
                <Input
                  id="u-pw"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={`At least ${MIN_PASSWORD} characters`}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="u-pw2">Repeat it</FieldLabel>
                <Input
                  id="u-pw2"
                  type="password"
                  autoComplete="new-password"
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value)}
                  required
                />
              </Field>
            </div>
          </FieldGroup>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !id || !password}>
              {busy ? <Spinner /> : null}
              Add user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  user,
  onClose,
  onSave,
}: {
  user: UserItem;
  onClose: () => void;
  onSave: (body: { name: string; role?: Role }) => Promise<void>;
}) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<Role>(user.role);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave(user.isYou ? { name: name.trim() } : { name: name.trim(), role });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Edit {user.name}</DialogTitle>
            <DialogDescription>
              User ID <span className="font-mono">{user.username}</span> stays the same.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="e-name">Name</FieldLabel>
              <Input id="e-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
            </Field>
            <Field>
              <FieldLabel>Role</FieldLabel>
              <RoleSelect value={role} onChange={setRole} disabled={user.isYou} />
              <FieldDescription>
                {user.isYou ? 'You can’t change your own role.' : `${ROLE_INFO[role].hint} A new role signs them out.`}
              </FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? <Spinner /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({
  user,
  onClose,
  onSave,
}: {
  user: UserItem;
  onClose: () => void;
  onSave: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(password, repeat);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      await onSave(password);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Set a new password for {user.name}</DialogTitle>
            <DialogDescription>They are signed out everywhere and sign in again with the new password.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="p-new">New password</FieldLabel>
              <Input
                id="p-new"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`At least ${MIN_PASSWORD} characters`}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="p-repeat">Repeat it</FieldLabel>
              <Input
                id="p-repeat"
                type="password"
                autoComplete="new-password"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
                required
              />
            </Field>
          </FieldGroup>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !password}>
              {busy ? <Spinner /> : null}
              Set password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserDialog({ user, onClose, onDeleted }: { user: UserItem; onClose: () => void; onDeleted: () => Promise<void> }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      await api(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      await onDeleted();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {user.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Their account is removed with everything that is theirs: jobs, settings, profile, resumes, saved answers and skip
            rules. To keep it all but stop them signing in, disable the account instead. Type{' '}
            <span className="font-mono font-medium text-foreground">{user.username}</span> to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={user.username}
          autoCapitalize="none"
          spellCheck={false}
          aria-label="Type the user ID to confirm"
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={busy || typed.trim().toLowerCase() !== user.username} onClick={() => void remove()}>
            {busy ? <Spinner /> : <Trash2Icon />}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
