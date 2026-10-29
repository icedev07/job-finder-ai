'use client';

import { CheckIcon, CopyIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

/** Copies `value` to the clipboard and shows a check mark for 1.5 s. */
export function CopyButton({
  value,
  label,
  size = 'icon-sm',
  variant = 'ghost',
}: {
  value: string;
  label?: string;
  size?: 'icon-sm' | 'icon-xs' | 'sm' | 'xs';
  variant?: 'ghost' | 'outline' | 'secondary';
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy to the clipboard');
    }
  }

  const Icon = copied ? CheckIcon : CopyIcon;
  return (
    <Button type="button" variant={variant} size={size} onClick={copy} aria-label={label ?? 'Copy'}>
      <Icon />
      {label && !size.startsWith('icon') ? label : null}
    </Button>
  );
}
