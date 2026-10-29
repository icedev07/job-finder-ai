'use client';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterXIcon,
  RefreshCwIcon,
  Trash2Icon,
  TriangleAlertIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import type { LogColumn, Noun } from '@/components/logs/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { errorMessage } from '@/lib/clientApi';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

const PAGE_SIZE_ITEMS = [25, 50, 100, 200].map((n) => ({ value: String(n), label: `${n} / page` }));

// The header scrolls over the rows, so it needs an opaque background; its divider is an inset shadow because
// collapsed table borders do not move with a sticky cell.
const HEAD =
  'sticky top-0 z-10 h-9 bg-[color-mix(in_oklch,var(--muted)_60%,var(--card))] text-xs font-medium text-muted-foreground shadow-[inset_0_-1px_0_var(--border)]';

// Buttons that turn disabled while focused stay focusable, so keyboard users keep their place.
const STAYS_FOCUSABLE = 'data-disabled:pointer-events-none data-disabled:opacity-50';

export function counted(n: number, noun: Noun): string {
  return `${formatNumber(n)} ${n === 1 ? noun.one : noun.many}`;
}

export type LogPanelProps<T> = {
  noun: Noun;
  /** Server-side row limit for this log; the count says when the view is capped to it. */
  cap: number;
  rows: T[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
  columns: LogColumn<T>[];
  /** Accessible name of a row, read by its checkbox ("Select …"). */
  rowLabel: (row: T) => string;
  /** Screen-reader caption of the table. */
  caption: string;
  /** Filter controls at the start of the toolbar. */
  filters?: ReactNode;
  empty: { icon: LucideIcon; title: string; description: ReactNode };
  /** A filter narrows this view: the empty state then offers to clear the filters. */
  filtered: boolean;
  onClearFilters: () => void;
  /** Changes with the filters; a change sends the table back to its first page. */
  resetKey: string;
  /** Extra sentence for the delete confirmation. */
  deleteNote?: ReactNode;
  /** Deletes the rows and reloads; throws when the server refuses. */
  onDelete: (ids: number[]) => Promise<void>;
  /** Minimum table width, so wide tables scroll sideways instead of squeezing. */
  tableClassName?: string;
};

/**
 * One log type: toolbar (filters, count, bulk delete, refresh), a paged table with a sticky header and row
 * selection, and honest loading / error / empty states.
 */
export function LogPanel<T extends { id: number }>({
  noun,
  cap,
  rows,
  loading,
  error,
  onReload,
  columns,
  rowLabel,
  caption,
  filters,
  empty,
  filtered,
  onClearFilters,
  resetKey,
  deleteNote,
  onDelete,
  tableClassName,
}: LogPanelProps<T>) {
  const [selected, setSelected] = useState<ReadonlySet<number>>(() => new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [seenRows, setSeenRows] = useState(rows);
  const [seenKey, setSeenKey] = useState(resetKey);
  const [confirm, setConfirm] = useState<{ open: boolean; ids: number[] }>({ open: false, ids: [] });
  const [deleting, setDeleting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const refreshRef = useRef<HTMLButtonElement>(null);

  if (rows !== seenRows) {
    // New data: keep only selections that are still loaded, so a bulk delete never hits rows the table no
    // longer shows (e.g. after a filter change).
    setSeenRows(rows);
    const loaded = new Set(rows.map((r) => r.id));
    if ([...selected].some((id) => !loaded.has(id))) {
      setSelected(new Set([...selected].filter((id) => loaded.has(id))));
    }
  }
  if (resetKey !== seenKey) {
    setSeenKey(resetKey);
    setPage(1);
  }

  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages);
  const first = (current - 1) * pageSize;
  const pageRows = rows.slice(first, first + pageSize);
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const allLoaded = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function goTo(p: number) {
    setPage(p);
    tableRef.current?.querySelector('[data-slot=table-container]')?.scrollTo({ top: 0 });
  }

  function changePageSize(size: number) {
    setPageSize(size);
    // Stay on the page that holds the first row currently shown.
    setPage(Math.floor(first / size) + 1);
  }

  function toggle(ids: number[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  async function runDelete() {
    const ids = confirm.ids;
    if (ids.length === 0) return;
    setDeleting(true);
    try {
      await onDelete(ids);
      setSelected(new Set());
      setConfirm({ open: false, ids });
      toast.success(`Deleted ${counted(ids.length, noun)}`);
    } catch (e) {
      toast.error('Delete failed', { description: errorMessage(e) });
    } finally {
      setDeleting(false);
    }
  }

  const count =
    loading && rows.length === 0
      ? 'Loading…'
      : `${counted(rows.length, noun)}${rows.length >= cap ? ` · latest ${formatNumber(cap)}` : ''}`;

  let body: ReactNode;
  if (error) {
    body = (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
            <TriangleAlertIcon />
          </EmptyMedia>
          <EmptyTitle>Couldn’t load {noun.many}</EmptyTitle>
          <EmptyDescription>{error}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={() => onReload()} disabled={loading}>
            <RefreshCwIcon />
            Retry
          </Button>
        </EmptyContent>
      </Empty>
    );
  } else if (rows.length === 0 && loading) {
    body = (
      <div role="status" className="space-y-2 p-3">
        <span className="sr-only">Loading {noun.many}…</span>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  } else if (rows.length === 0) {
    const Icon = empty.icon;
    body = (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">{filtered ? <FilterXIcon /> : <Icon />}</EmptyMedia>
          <EmptyTitle>{filtered ? `No ${noun.many} match these filters` : empty.title}</EmptyTitle>
          <EmptyDescription>
            {filtered ? 'Try a wider date range, or clear the filters.' : empty.description}
          </EmptyDescription>
        </EmptyHeader>
        {filtered ? (
          <EmptyContent>
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              <XIcon />
              Clear filters
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  } else {
    body = (
      <>
        {allOnPage && pages > 1 ? (
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b bg-muted/40 px-3 py-1.5 text-xs">
            {allLoaded ? (
              <>
                <span>All {counted(rows.length, noun)} are selected.</span>
                <Button variant="link" size="xs" className="h-auto p-0" onClick={() => setSelected(new Set())}>
                  Clear selection
                </Button>
              </>
            ) : (
              <>
                <span>All {counted(pageRows.length, noun)} on this page are selected.</span>
                <Button
                  variant="link"
                  size="xs"
                  className="h-auto p-0"
                  onClick={() => setSelected(new Set(rows.map((r) => r.id)))}
                >
                  Select all {counted(rows.length, noun)}
                </Button>
              </>
            )}
          </div>
        ) : null}
        <div
          ref={tableRef}
          aria-busy={loading || undefined}
          className="*:data-[slot=table-container]:max-h-[max(20rem,calc(100svh_-_20rem))]"
        >
          <Table className={cn('[&_tr>*:first-child]:pl-3 [&_tr>*:last-child]:pr-3', tableClassName)}>
            <TableCaption className="sr-only">{caption}</TableCaption>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn(HEAD, 'w-9')}>
                  <Checkbox
                    aria-label={`Select all ${noun.many} on this page`}
                    checked={allOnPage}
                    onCheckedChange={(on) =>
                      toggle(
                        pageRows.map((r) => r.id),
                        on,
                      )
                    }
                  />
                </TableHead>
                {columns.map((c) => (
                  <TableHead key={c.id} className={cn(HEAD, c.className)}>
                    {c.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((row) => {
                const isSelected = selected.has(row.id);
                return (
                  <TableRow key={row.id} data-state={isSelected ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox
                        aria-label={`Select ${rowLabel(row)}`}
                        checked={isSelected}
                        onCheckedChange={(on) => toggle([row.id], on)}
                      />
                    </TableCell>
                    {columns.map((c) => (
                      <TableCell key={c.id} className={c.className}>
                        {c.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
          <span className="tabular">
            {formatNumber(first + 1)}–{formatNumber(first + pageRows.length)} of {formatNumber(rows.length)}
          </span>
          <div className="flex items-center gap-1.5">
            <Select
              items={PAGE_SIZE_ITEMS}
              value={String(pageSize)}
              onValueChange={(v) => {
                if (v) changePageSize(Number(v));
              }}
            >
              <SelectTrigger size="sm" aria-label="Rows per page">
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
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Previous page"
                    disabled={current <= 1}
                    focusableWhenDisabled
                    className={STAYS_FOCUSABLE}
                    onClick={() => goTo(current - 1)}
                  >
                    <ChevronLeftIcon />
                  </Button>
                </PaginationItem>
                <PaginationItem className="tabular px-1.5">
                  <span className="sr-only">Page </span>
                  {current}
                  <span aria-hidden> / </span>
                  <span className="sr-only"> of </span>
                  {pages}
                </PaginationItem>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Next page"
                    disabled={current >= pages}
                    focusableWhenDisabled
                    className={STAYS_FOCUSABLE}
                    onClick={() => goTo(current + 1)}
                  >
                    <ChevronRightIcon />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </>
    );
  }

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        {filters}
        <span className="tabular text-xs text-muted-foreground" aria-live="polite">
          {count}
        </span>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
          {selected.size > 0 ? (
            <>
              <span className="tabular text-xs font-medium">{formatNumber(selected.size)} selected</span>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Clear selection"
                onClick={() => setSelected(new Set())}
              >
                <XIcon />
              </Button>
              <Button
                ref={deleteRef}
                variant="destructive"
                size="sm"
                aria-label={`Delete ${counted(selected.size, noun)}`}
                onClick={() => setConfirm({ open: true, ids: [...selected] })}
              >
                <Trash2Icon />
                Delete
              </Button>
            </>
          ) : null}
          <Button
            ref={refreshRef}
            variant="outline"
            size="sm"
            disabled={loading}
            focusableWhenDisabled
            className={STAYS_FOCUSABLE}
            onClick={() => onReload()}
          >
            <RefreshCwIcon className={cn(loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>
      {body}
      <AlertDialog
        open={confirm.open}
        onOpenChange={(open) => {
          if (!open && !deleting) setConfirm((c) => ({ ...c, open: false }));
        }}
      >
        <AlertDialogContent finalFocus={() => deleteRef.current ?? refreshRef.current}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {counted(confirm.ids.length, noun)}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the selected {confirm.ids.length === 1 ? noun.one : noun.many} and
              can’t be undone.{deleteNote ? <> {deleteNote}</> : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={deleting} onClick={() => void runDelete()}>
              {deleting ? <Spinner /> : <Trash2Icon />}
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
