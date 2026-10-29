'use client';

import { PlusIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { SectionCard } from '@/components/common/section-card';
import {
  RULE_TYPE_ITEMS,
  RULE_TYPE_META,
  type SkipRule,
  type SkipRuleType,
} from '@/components/rules/lib/skip-rules';
import { RuleTypeDot } from '@/components/rules/rule-type-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useHydrated } from '@/hooks/use-hydrated';
import { useViewing } from '@/components/shell/viewing';
import { Checkbox } from '@/components/ui/checkbox';
import { errorMessage } from '@/lib/clientApi';

/**
 * Type + pattern form. `onAdd` creates the rule and refreshes the list; it throws on failure. A rule belongs to the
 * user being viewed unless "For everyone" is ticked; with all users shown, every new rule is for everyone.
 */
export function AddRuleCard({
  rules,
  onAdd,
}: {
  rules: SkipRule[] | null;
  onAdd: (type: SkipRuleType, pattern: string, everyone: boolean) => Promise<void>;
}) {
  const hydrated = useHydrated();
  const { viewing, userName, multiUser } = useViewing();
  const [type, setType] = useState<SkipRuleType>('COMPANY');
  const [everyoneTicked, setEveryone] = useState(false);
  const everyone = viewing === 'all' || everyoneTicked;
  const [pattern, setPattern] = useState('');
  const [pending, setPending] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const meta = RULE_TYPE_META[type];
  const trimmed = pattern.trim();
  const duplicate =
    trimmed !== '' &&
    (rules ?? []).some((r) => r.type === type && r.pattern.toLowerCase() === trimmed.toLowerCase());

  async function submit() {
    if (!trimmed || pending) return;
    setPending(true);
    try {
      await onAdd(type, trimmed, everyone);
      setPattern('');
      toast.success(
        `Added the ${meta.noun} rule “${trimmed}”${multiUser ? (everyone ? ' for everyone' : ` for ${userName(viewing as number)}`) : ''}`,
      );
      input.current?.focus();
    } catch (e) {
      toast.error(`Could not add the rule: ${errorMessage(e)}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <SectionCard
      title="Add a rule"
      description="Matching ignores case and looks for the pattern anywhere in the field."
      contentClassName="space-y-2"
    >
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Select
          items={RULE_TYPE_ITEMS}
          value={type}
          onValueChange={(v) => {
            if (v) setType(v);
          }}
        >
          <SelectTrigger aria-label="Rule type" className="w-full sm:w-40">
            <RuleTypeDot type={type} className="size-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RULE_TYPE_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                <RuleTypeDot type={item.value} className="size-2" />
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          ref={input}
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder={meta.placeholder}
          aria-label="Pattern"
          autoComplete="off"
          spellCheck={false}
          className="sm:flex-1"
        />
        <Button type="submit" disabled={!hydrated || pending || !trimmed}>
          {pending ? <Spinner /> : <PlusIcon />}
          Add rule
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">{meta.hint}</p>
      {multiUser ? (
        viewing === 'all' ? (
          <p className="text-xs text-muted-foreground">With all users shown, new rules apply to everyone.</p>
        ) : (
          <label className="flex w-fit items-center gap-2 text-sm">
            <Checkbox checked={everyoneTicked} onCheckedChange={(on) => setEveryone(on)} />
            For everyone, not only {userName(viewing)}
          </label>
        )
      ) : null}
      {duplicate ? (
        <p className="text-xs text-tier-maybe-ink">
          A {meta.noun} rule for “{trimmed}” already exists.
        </p>
      ) : null}
    </SectionCard>
  );
}
