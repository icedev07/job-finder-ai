'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ActionResult = void | { ok: boolean; error?: string; message?: string };

/**
 * A button that asks for confirmation before running `onConfirm`. With `typeToConfirm`, the confirm button stays
 * disabled until that exact word is typed (the danger zone). `{ ok: false, error }` shows an error toast,
 * `{ ok: true, message }` a success toast.
 */
export function ConfirmButton({
  children,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  typeToConfirm,
  variant,
  size = 'default',
  disabled,
  onConfirm,
}: {
  children: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  typeToConfirm?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'xs' | 'lg' | 'icon' | 'icon-sm';
  disabled?: boolean;
  onConfirm: () => Promise<ActionResult> | ActionResult;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [pending, startTransition] = useTransition();
  const blocked = !!typeToConfirm && typed.trim() !== typeToConfirm;

  function run() {
    startTransition(async () => {
      try {
        const res = await onConfirm();
        if (res && res.ok === false) {
          toast.error(res.error ?? 'Action failed');
          return;
        }
        if (res && res.message) toast.success(res.message);
        setOpen(false);
        setTyped('');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Action failed');
      }
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setTyped('');
      }}
    >
      <AlertDialogTrigger
        disabled={disabled}
        render={<Button variant={variant ?? (destructive ? 'destructive' : 'outline')} size={size} />}
      >
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        {typeToConfirm ? (
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">
              Type <code className="rounded bg-muted px-1 font-mono text-foreground">{typeToConfirm}</code> to confirm.
            </p>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              aria-label={`Type ${typeToConfirm} to confirm`}
            />
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button variant={destructive ? 'destructive' : 'default'} onClick={run} disabled={pending || blocked}>
            {pending ? 'Working…' : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
