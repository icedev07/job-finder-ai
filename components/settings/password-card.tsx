'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { SectionCard } from '@/components/common/section-card';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useLoadOnMount } from '@/hooks/use-load-on-mount';
import { api, errorMessage } from '@/lib/clientApi';

type Account = {
  user: { id: number; username: string; name: string };
  passwordFromEnv: boolean;
  usingDefaultPassword: boolean;
};

const MIN_LENGTH = 8;

/** Settings → Your password: the signed-in admin changes their own password (the current one is asked again). */
export function PasswordCard() {
  const [account, setAccount] = useState<Account | null>(null);
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setAccount(await api<Account>('/api/admin/account'));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);
  useLoadOnMount(load);

  async function save() {
    if (password.trim().length < MIN_LENGTH) {
      toast.error(`Use at least ${MIN_LENGTH} characters`);
      return;
    }
    if (password !== password2) {
      toast.error('The two new passwords differ');
      return;
    }
    setSaving(true);
    try {
      await api('/api/admin/account', { method: 'PUT', json: { current, password } });
      setCurrent('');
      setPassword('');
      setPassword2('');
      toast.success('Password changed. Your other browsers are signed out.');
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const fromEnv = !!account?.passwordFromEnv;
  return (
    <SectionCard
      title="Your password"
      description={
        !account
          ? 'Loading…'
          : fromEnv
            ? 'Set by the ADMIN_PASSWORD environment variable — change it in your hosting settings.'
            : `Signed in as ${account.user.username}. Changing it signs out your other browsers; this one stays signed in.`
      }
    >
      {account?.usingDefaultPassword && !fromEnv ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">You still use the default password “admin”. Change it now.</p>
      ) : null}
      <FieldGroup className="grid gap-4 sm:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="pw-current">Current password</FieldLabel>
          <Input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            disabled={fromEnv}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="pw-new">New password</FieldLabel>
          <Input
            id="pw-new"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={fromEnv}
            placeholder={`At least ${MIN_LENGTH} characters`}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="pw-repeat">Repeat it</FieldLabel>
          <Input
            id="pw-repeat"
            type="password"
            autoComplete="new-password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            disabled={fromEnv}
          />
        </Field>
      </FieldGroup>
      <Button size="sm" onClick={() => void save()} disabled={saving || fromEnv || !current || !password}>
        {saving ? <Spinner /> : null}
        Change password
      </Button>
    </SectionCard>
  );
}
