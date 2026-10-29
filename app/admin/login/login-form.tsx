"use client";

import { LoaderCircleIcon, RadarIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

// The last user ID that signed in on this browser, to fill the field next time.
const LAST_USER_KEY = "jf_last_user";
const noSubscribe = () => () => {};

function readLastUser(): string {
  try {
    return window.localStorage.getItem(LAST_USER_KEY) ?? "";
  } catch {
    return ""; // storage blocked — the field just starts empty
  }
}

// Only same-site admin paths may be used as the post-login destination.
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/admin") || raw.startsWith("//") || raw.startsWith("/admin/login")) return "/admin";
  return raw;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Empty on the server, the remembered user ID in the browser, until typed over.
  const remembered = useSyncExternalStore(noSubscribe, readLastUser, () => "");
  const [typed, setUsername] = useState<string | null>(null);
  const username = typed ?? remembered;
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : `Sign-in failed (HTTP ${res.status}).`);
        return;
      }
      try {
        window.localStorage.setItem(LAST_USER_KEY, username.trim().toLowerCase());
      } catch {
        // storage blocked — nothing to remember
      }
      router.replace(safeNext(params.get("next")));
      router.refresh();
    } catch {
      setError("Network error — is the server running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-brand/10 text-brand">
            <RadarIcon className="size-5" />
          </span>
          <span className="font-semibold">Job Finder</span>
        </div>
        <ThemeToggle />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Sign in with your user ID and password to open the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit}>
            <FieldGroup>
              <Field data-invalid={!!error || undefined}>
                <FieldLabel htmlFor="username">User ID</FieldLabel>
                <Input
                  id="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  autoFocus={!username}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  aria-invalid={!!error || undefined}
                  required
                />
              </Field>
              <Field data-invalid={!!error || undefined}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus={!!username}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!error || undefined}
                  required
                />
                {error ? <FieldError>{error}</FieldError> : null}
              </Field>
              <Button type="submit" disabled={busy || !username.trim() || !password}>
                {busy ? <LoaderCircleIcon className="animate-spin" /> : null}
                Sign in
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <p className="text-center text-xs text-muted-foreground">
        The first admin&apos;s user ID is <code>admin</code>. On a new install the password is <code>admin</code> until you
        change it; after an upgrade it is your old admin password.
      </p>
    </div>
  );
}
