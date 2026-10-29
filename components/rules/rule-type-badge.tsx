import { RULE_TYPE_META, type SkipRuleType } from '@/components/rules/lib/skip-rules';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** Colour dot of a rule type (decorative: the label next to it carries the meaning). */
export function RuleTypeDot({ type, className }: { type: SkipRuleType; className?: string }) {
  return <span className={cn('size-1.5 shrink-0 rounded-full', RULE_TYPE_META[type].dot, className)} aria-hidden />;
}

export function RuleTypeBadge({ type, className }: { type: SkipRuleType; className?: string }) {
  return (
    <Badge variant="outline" className={cn('gap-1.5', className)}>
      <RuleTypeDot type={type} />
      {RULE_TYPE_META[type].label}
    </Badge>
  );
}
