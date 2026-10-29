'use client';

import {
  BanIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  SearchXIcon,
  Trash2Icon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react';
import { Fragment, useMemo, useState, type ReactNode } from 'react';

import { ConfirmButton } from '@/components/common/confirm-button';
import { SectionCard } from '@/components/common/section-card';
import { RULE_TYPE_META, SKIP_RULE_TYPES, type SkipRule, type SkipRuleType } from '@/components/rules/lib/skip-rules';
import { RuleTypeBadge, RuleTypeDot } from '@/components/rules/rule-type-badge';
import { UserChip, useViewing } from '@/components/shell/viewing';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

type TypeFilter = 'ALL' | SkipRuleType;
type DeleteResult = { ok: boolean; error?: string; message?: string };

const TYPE_FILTERS: readonly TypeFilter[] = ['ALL', ...SKIP_RULE_TYPES];
const PAGE_SIZE_ITEMS = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));
const COLUMN_COUNT = 5;

function RuleRow({
  rule,
  onToggle,
  onDelete,
}: {
  rule: SkipRule;
  onToggle: (rule: SkipRule, active: boolean) => void;
  onDelete: (rule: SkipRule) => Promise<DeleteResult>;
}) {
  const meta = RULE_TYPE_META[rule.type];
  const { multiUser } = useViewing();
  return (
    <TableRow>
      <TableCell className="pl-3">
        <RuleTypeBadge type={rule.type} className={rule.active ? undefined : 'opacity-60'} />
      </TableCell>
      <TableCell
        className={cn('font-mono text-xs whitespace-normal wrap-anywhere', !rule.active && 'text-muted-foreground')}
      >
        {rule.pattern}
        {multiUser && rule.userId == null ? (
          <Badge variant="outline" className="ml-2 font-sans">
            Everyone
          </Badge>
        ) : (
          <UserChip userId={rule.userId} className="ml-2 font-sans" />
        )}
      </TableCell>
      <TableCell>
        <Switch
          checked={rule.active}
          onCheckedChange={(checked) => onToggle(rule, checked)}
          aria-label={`${meta.label} rule “${rule.pattern}” active`}
        />
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell" title={formatDateTime(rule.createdAt)}>
        <span className="tabular">{formatDate(rule.createdAt)}</span>
      </TableCell>
      <TableCell className="pr-3 text-right">
        <ConfirmButton
          variant="ghost"
          size="icon-sm"
          destructive
          title="Delete this rule?"
          description={
            <>
              The {meta.noun} rule <span className="font-mono text-foreground wrap-anywhere">{rule.pattern}</span>{' '}
              will be removed, and jobs that match it will no longer be skipped. To pause it instead, turn it off.
            </>
          }
          confirmLabel="Delete"
          onConfirm={() => onDelete(rule)}
        >
          <Trash2Icon />
          <span className="sr-only">
            Delete {meta.noun} rule {rule.pattern}
          </span>
        </ConfirmButton>
      </TableCell>
    </TableRow>
  );
}

/** Rule list with type chips, pattern search, optional grouping by type and client-side paging. */
export function RulesTableCard({
  rules,
  loadError,
  onRetry,
  onToggle,
  onDelete,
}: {
  rules: SkipRule[] | null;
  loadError: string | null;
  onRetry: () => void;
  onToggle: (rule: SkipRule, active: boolean) => void;
  onDelete: (rule: SkipRule) => Promise<DeleteResult>;
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [groupByType, setGroupByType] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);

  const counts = useMemo(() => {
    const byType: Record<TypeFilter, number> = { ALL: 0, COMPANY: 0, TITLE: 0, URL: 0 };
    let active = 0;
    for (const r of rules ?? []) {
      byType.ALL++;
      byType[r.type]++;
      if (r.active) active++;
    }
    return { byType, active };
  }, [rules]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (rules ?? []).filter(
      (r) => (typeFilter === 'ALL' || r.type === typeFilter) && (!q || r.pattern.toLowerCase().includes(q)),
    );
    if (groupByType) list.sort((a, b) => a.type.localeCompare(b.type) || a.pattern.localeCompare(b.pattern));
    return list;
  }, [rules, search, typeFilter, groupByType]);

  const groupSizes = useMemo(() => {
    const sizes = new Map<SkipRuleType, number>();
    for (const r of filtered) sizes.set(r.type, (sizes.get(r.type) ?? 0) + 1);
    return sizes;
  }, [filtered]);

  // Every filter change goes back to the first page; the clamp covers deletions on the last page.
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  function changeSearch(value: string) {
    setSearch(value);
    setPage(0);
  }
  function changeType(value: TypeFilter) {
    setTypeFilter(value);
    setPage(0);
  }
  function changeGrouping(value: boolean) {
    setGroupByType(value);
    setPage(0);
  }
  function changePageSize(value: number) {
    setPageSize(value);
    setPage(0);
  }
  function clearFilters() {
    setSearch('');
    setTypeFilter('ALL');
    setPage(0);
  }

  let body: ReactNode = null;
  if (rules === null) {
    body = loadError ? null : (
      <div className="space-y-2" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  } else if (rules.length === 0) {
    body = (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BanIcon />
          </EmptyMedia>
          <EmptyTitle>No skip rules yet</EmptyTitle>
          <EmptyDescription>
            Add a rule above or import a CSV. Until then, scans use a built-in default list.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  } else if (filtered.length === 0) {
    body = (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchXIcon />
          </EmptyMedia>
          <EmptyTitle>No rules match your filters</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </EmptyContent>
      </Empty>
    );
  } else {
    body = (
      <>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              {/* w-px keeps the other columns at content width so the pattern gets the remaining space. */}
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-px pl-3">Type</TableHead>
                <TableHead>Pattern</TableHead>
                <TableHead className="w-px">Active</TableHead>
                <TableHead className="hidden w-px md:table-cell">Created</TableHead>
                <TableHead className="w-px pr-3">
                  <span className="sr-only">Delete</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((rule, i) => (
                <Fragment key={rule.id}>
                  {groupByType && (i === 0 || pageRows[i - 1].type !== rule.type) ? (
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={COLUMN_COUNT} className="py-1.5 pl-3 text-xs font-medium text-muted-foreground">
                        {RULE_TYPE_META[rule.type].label} · {formatNumber(groupSizes.get(rule.type) ?? 0)}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  <RuleRow rule={rule} onToggle={onToggle} onDelete={onDelete} />
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="tabular">
            Showing {formatNumber(start + 1)}–{formatNumber(start + pageRows.length)} of{' '}
            {formatNumber(filtered.length)}
            {filtered.length !== rules.length ? ` (filtered from ${formatNumber(rules.length)})` : ''}
          </span>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Rows per page</span>
            <Select
              items={PAGE_SIZE_ITEMS}
              value={pageSize}
              onValueChange={(v) => {
                if (v) changePageSize(v);
              }}
            >
              <SelectTrigger size="sm" aria-label="Rows per page" className="w-18">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_ITEMS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous page"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeftIcon />
            </Button>
            <span className="tabular">
              Page {safePage + 1} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next page"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <SectionCard
      title="Rules"
      description={
        rules ? `${formatNumber(counts.byType.ALL)} total · ${formatNumber(counts.active)} active` : 'Loading…'
      }
    >
      {loadError ? (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertDescription>
            {rules ? 'Could not refresh the rules' : 'Could not load the rules'}: {loadError}
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" size="xs" onClick={onRetry}>
              Retry
            </Button>
          </AlertAction>
        </Alert>
      ) : null}
      {rules && rules.length > 0 && counts.active === 0 ? (
        <Alert>
          <TriangleAlertIcon />
          <AlertDescription>
            Every rule is turned off, so scans fall back to the built-in default list.
          </AlertDescription>
        </Alert>
      ) : null}
      {rules && rules.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={1}
            className="flex-wrap"
            aria-label="Filter by type"
            value={[typeFilter]}
            onValueChange={(v) => {
              const next = TYPE_FILTERS.find((t) => t === v[0]);
              if (next) changeType(next);
            }}
          >
            {TYPE_FILTERS.map((t) => (
              <ToggleGroupItem key={t} value={t} className="gap-1.5 text-muted-foreground aria-pressed:text-foreground">
                {t === 'ALL' ? null : <RuleTypeDot type={t} />}
                {t === 'ALL' ? 'All' : RULE_TYPE_META[t].label}
                <span className="tabular text-xs text-muted-foreground">{formatNumber(counts.byType[t])}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <InputGroup className="sm:w-64">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              value={search}
              onChange={(e) => changeSearch(e.target.value)}
              placeholder="Search patterns…"
              aria-label="Search patterns"
            />
            {search ? (
              <InputGroupAddon align="inline-end">
                <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={() => changeSearch('')}>
                  <XIcon />
                </InputGroupButton>
              </InputGroupAddon>
            ) : null}
          </InputGroup>
          <Label className="font-normal sm:ml-auto">
            <Checkbox checked={groupByType} onCheckedChange={changeGrouping} />
            Group by type
          </Label>
        </div>
      ) : null}
      {body}
    </SectionCard>
  );
}
