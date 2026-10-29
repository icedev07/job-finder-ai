'use client';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from '@tanstack/react-table';
import {
  BookmarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  SearchIcon,
  Trash2Icon,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { BulkBar } from '@/components/jobs/bulk-bar';
import { ApplyMethodChip, EligibilityChip, ScoreChip, StatusChip } from '@/components/jobs/chips';
import { UserChip, useViewing } from '@/components/shell/viewing';
import { FacetFilter } from '@/components/jobs/facet-filter';
import { FeedbackButtons } from '@/components/jobs/feedback-buttons';
import { JobDetailSheet } from '@/components/jobs/job-detail-sheet';
import { StageSelect } from '@/components/jobs/stage-select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Kbd } from '@/components/ui/kbd';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { api, errorMessage } from '@/lib/clientApi';
import {
  APPLY_METHOD_LABEL,
  ELIGIBILITY_LABEL,
  formatNumber,
  JOB_STAGES,
  platformLabel,
  safeHref,
  STAGE_META,
  timeAgo,
  type JobStage,
  type JobStatus,
} from '@/lib/format';
import { cn } from '@/lib/utils';

type JobRow = {
  id: number;
  userId: number;
  platform: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  manualApplyUrl: string | null;
  applyMethod: string | null;
  salary: string | null;
  status: JobStatus;
  aiScore: number | null;
  aiReason: string | null;
  stage: JobStage | null;
  feedback: number | null;
  eligibility: string | null;
  followUpAt: string | null;
  createdAt: string;
};

type Facet = { value: string | null; count: number };
type JobsResponse = {
  jobs: JobRow[];
  total: number;
  page: number;
  limit: number;
  facets?: { platforms: Facet[]; statuses: Facet[]; stages: Facet[]; applyMethods: Facet[]; eligibility: Facet[] };
};

const BUILT_IN_VIEWS: { name: string; query: string }[] = [
  { name: 'Approved · last 7 days', query: 'status=APPROVED&days=7' },
  { name: 'Strong matches (80+)', query: 'status=APPROVED&minScore=80' },
  { name: 'To apply', query: 'status=APPROVED&stage=NONE,SAVED' },
  { name: 'Applied & interviews', query: 'stage=APPLIED,INTERVIEW,OFFER' },
  { name: 'Easy Apply', query: 'status=APPROVED&apply=EASY_APPLY' },
  { name: 'Hires worldwide', query: 'status=APPROVED&eligibility=worldwide' },
  { name: 'Not rated yet', query: 'status=APPROVED&feedback=none' },
];
const VIEWS_KEY = 'jf.jobViews';
const FILTER_KEYS = ['q', 'status', 'platform', 'stage', 'apply', 'minScore', 'feedback', 'eligibility', 'days'];

function loadViews(): { name: string; query: string }[] {
  try {
    const raw = JSON.parse(localStorage.getItem(VIEWS_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((v) => v && typeof v.name === 'string' && typeof v.query === 'string') : [];
  } catch {
    return [];
  }
}

function filterQuery(params: URLSearchParams): string {
  const out = new URLSearchParams();
  for (const k of FILTER_KEYS) {
    const v = params.get(k);
    if (v) out.set(k, v);
  }
  return out.toString();
}

const ANY = '__any';

export function JobsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const paramsKey = params.toString();
  const [data, setData] = useState<JobsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [activeRow, setActiveRow] = useState(0);
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [views, setViews] = useState<{ name: string; query: string }[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const openId = params.get('job') ? Number(params.get('job')) : null;

  useEffect(() => setViews(loadViews()), []);

  const setParams = useCallback(
    (patch: Record<string, string | null>, resetPage = true) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === '') next.delete(k);
        else next.set(k, v);
      }
      if (resetPage && !('page' in patch)) next.delete('page');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  // Debounced search box → URL.
  useEffect(() => {
    const current = params.get('q') ?? '';
    if (search === current) return;
    const t = setTimeout(() => setParams({ q: search.trim() || null }), 350);
    return () => clearTimeout(t);
  }, [search, params, setParams]);

  // Fetch whenever the filters (not the open job) change.
  const fetchKey = useMemo(() => {
    const p = new URLSearchParams(paramsKey);
    p.delete('job');
    return p.toString();
  }, [paramsKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams(fetchKey);
    qs.set('facets', '1');
    api<JobsResponse>(`/api/admin/jobs?${qs.toString()}`)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
        setRowSelection({});
        setActiveRow(0);
      })
      .catch((e) => !cancelled && setError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [fetchKey, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const openJob = useCallback((id: number | null) => setParams({ job: id == null ? null : String(id) }, false), [setParams]);

  // With all users shown, a User column says whose each job is.
  const { viewing, multiUser } = useViewing();
  const showUser = multiUser && viewing === 'all';
  const columns = useMemo<ColumnDef<JobRow>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all on this page"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${row.original.title}`}
          />
        ),
      },
      { id: 'score', header: 'Score', cell: ({ row }) => <ScoreChip score={row.original.aiScore} /> },
      {
        id: 'job',
        header: 'Job',
        cell: ({ row }) => {
          const j = row.original;
          return (
            <div className="min-w-0 max-w-[28rem]">
              <p className="truncate font-medium" title={j.title}>
                {j.title}
              </p>
              <p className="truncate text-xs text-muted-foreground" title={j.aiReason ?? undefined}>
                {j.company}
                {j.location ? ` · ${j.location}` : ''}
                {j.salary ? ` · ${j.salary}` : ''}
              </p>
            </div>
          );
        },
      },
      ...(showUser
        ? [{ id: 'user', header: 'User', cell: ({ row }) => <UserChip userId={row.original.userId} /> } satisfies ColumnDef<JobRow>]
        : []),
      { id: 'source', header: 'Source', cell: ({ row }) => <span className="text-xs">{platformLabel(row.original.platform)}</span> },
      { id: 'status', header: 'Status', cell: ({ row }) => <StatusChip status={row.original.status} /> },
      {
        id: 'where',
        header: 'Hires',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            <EligibilityChip value={row.original.eligibility} />
            <ApplyMethodChip method={row.original.applyMethod} />
          </div>
        ),
      },
      {
        id: 'stage',
        header: 'Stage',
        cell: ({ row }) => <StageSelect jobId={row.original.id} stage={row.original.stage} onChanged={reload} />,
      },
      {
        id: 'feedback',
        header: () => <span className="sr-only">Feedback</span>,
        cell: ({ row }) => <FeedbackButtons jobId={row.original.id} feedback={row.original.feedback} onChanged={reload} />,
      },
      {
        id: 'found',
        header: 'Found',
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap text-muted-foreground" title={new Date(row.original.createdAt).toLocaleString()}>
            {timeAgo(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'open',
        header: () => <span className="sr-only">Open</span>,
        cell: ({ row }) => {
          const href = safeHref(row.original.manualApplyUrl) ?? safeHref(row.original.url);
          return href ? (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Open the apply page"
              nativeButton={false}
              render={<a href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} />}
            >
              <ExternalLinkIcon />
            </Button>
          ) : null;
        },
      },
    ],
    [reload, showUser],
  );

  // TanStack Table hands back fresh functions each render; this app does not use the React Compiler.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data?.jobs ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (r) => String(r.id),
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    manualPagination: true,
  });

  const selectedIds = Object.keys(rowSelection)
    .filter((k) => rowSelection[k])
    .map(Number);

  // Keyboard: / search · j/k move · Enter open · x select · Esc clear.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey || openId != null) return;
      const rows = table.getRowModel().rows;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'j') {
        setActiveRow((i) => Math.min(rows.length - 1, i + 1));
      } else if (e.key === 'k') {
        setActiveRow((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter' && rows[activeRow]) {
        openJob(rows[activeRow].original.id);
      } else if (e.key === 'x' && rows[activeRow]) {
        rows[activeRow].toggleSelected();
      } else if (e.key === 'Escape') {
        setRowSelection({});
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [table, activeRow, openId, openJob]);

  const facets = data?.facets;
  const total = data?.total ?? 0;
  const page = data?.page ?? 1;
  const limit = data?.limit ?? 25;
  const pages = Math.max(1, Math.ceil(total / limit));
  const csv = (() => {
    const p = new URLSearchParams(fetchKey);
    p.delete('page');
    p.delete('limit');
    // A download link can't send the Viewing header: whose jobs goes in the URL.
    p.set('user', String(viewing));
    return `/api/admin/jobs/export?${p.toString()}`;
  })();
  const hasFilters = FILTER_KEYS.some((k) => params.get(k));
  const list = (k: string) => (params.get(k) || '').split(',').filter(Boolean);
  const days = params.get('days') ?? '';

  function saveView() {
    const query = filterQuery(params);
    if (!query) {
      toast.error('Set some filters first');
      return;
    }
    const name = window.prompt('Name this view', '');
    if (!name?.trim()) return;
    const next = [...views.filter((v) => v.name !== name.trim()), { name: name.trim(), query }];
    setViews(next);
    try {
      localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable — the view lives for this visit only
    }
    toast.success(`Saved view “${name.trim()}”`);
  }

  function deleteView(name: string) {
    const next = views.filter((v) => v.name !== name);
    setViews(next);
    try {
      localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function applyView(query: string) {
    router.replace(`${pathname}?${query}`, { scroll: false });
    setSearch(new URLSearchParams(query).get('q') ?? '');
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:w-72">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search… "exact phrase" -exclude'
            aria-label="Search jobs"
          />
          <InputGroupAddon align="inline-end">
            <Kbd>/</Kbd>
          </InputGroupAddon>
        </InputGroup>
        <ToggleGroup
          value={[days || 'all']}
          onValueChange={(v) => {
            const next = (v as string[])[0];
            if (next) setParams({ days: next === 'all' ? null : next });
          }}
          variant="outline"
          size="sm"
          aria-label="Period"
        >
          <ToggleGroupItem value="1">24h</ToggleGroupItem>
          <ToggleGroupItem value="7">7d</ToggleGroupItem>
          <ToggleGroupItem value="30">30d</ToggleGroupItem>
          <ToggleGroupItem value="all">All</ToggleGroupItem>
        </ToggleGroup>
        <Select
          items={[
            { value: ANY, label: 'Any status' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'REJECTED', label: 'Rejected' },
            { value: 'PENDING', label: 'Pending' },
          ]}
          value={params.get('status') ?? ANY}
          onValueChange={(v) => setParams({ status: v === ANY ? null : String(v) })}
        >
          <SelectTrigger size="sm" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any status</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
          </SelectContent>
        </Select>
        <FacetFilter
          title="Source"
          searchable
          options={(facets?.platforms ?? []).map((f) => ({
            value: f.value ?? '',
            label: platformLabel(f.value),
            hint: formatNumber(f.count),
          }))}
          selected={list('platform')}
          onChange={(next) => setParams({ platform: next.join(',') || null })}
        />
        <FacetFilter
          title="Stage"
          options={(['NONE', ...JOB_STAGES] as const).map((s) => ({
            value: s,
            label: STAGE_META[s].label,
            hint: formatNumber(facets?.stages.find((f) => (f.value ?? 'NONE') === s)?.count ?? 0),
          }))}
          selected={list('stage')}
          onChange={(next) => setParams({ stage: next.join(',') || null })}
        />
        <Select
          items={[
            { value: ANY, label: 'Any apply way' },
            { value: 'EASY_APPLY', label: 'Easy Apply' },
            { value: 'EXTERNAL', label: 'Company site' },
            { value: 'UNKNOWN', label: 'Unknown' },
          ]}
          value={params.get('apply') ?? ANY}
          onValueChange={(v) => setParams({ apply: v === ANY ? null : String(v) })}
        >
          <SelectTrigger size="sm" aria-label="Apply way">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any apply way</SelectItem>
            <SelectItem value="EASY_APPLY">{APPLY_METHOD_LABEL.EASY_APPLY}</SelectItem>
            <SelectItem value="EXTERNAL">{APPLY_METHOD_LABEL.EXTERNAL}</SelectItem>
            <SelectItem value="UNKNOWN">Unknown</SelectItem>
          </SelectContent>
        </Select>
        <Select
          items={[{ value: ANY, label: 'Hires anywhere' }, ...Object.entries(ELIGIBILITY_LABEL).map(([value, label]) => ({ value, label }))]}
          value={params.get('eligibility') ?? ANY}
          onValueChange={(v) => setParams({ eligibility: v === ANY ? null : String(v) })}
        >
          <SelectTrigger size="sm" aria-label="Eligibility">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Hires anywhere</SelectItem>
            {Object.entries(ELIGIBILITY_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={[
            { value: ANY, label: 'Any score' },
            { value: '40', label: '40+' },
            { value: '60', label: '60+' },
            { value: '80', label: '80+' },
          ]}
          value={params.get('minScore') ?? ANY}
          onValueChange={(v) => setParams({ minScore: v === ANY ? null : String(v) })}
        >
          <SelectTrigger size="sm" aria-label="Minimum score">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any score</SelectItem>
            <SelectItem value="40">40+</SelectItem>
            <SelectItem value="60">60+</SelectItem>
            <SelectItem value="80">80+</SelectItem>
          </SelectContent>
        </Select>
        <Select
          items={[
            { value: ANY, label: 'Any feedback' },
            { value: 'up', label: '👍 Good' },
            { value: 'down', label: '👎 Bad' },
            { value: 'none', label: 'Not rated' },
          ]}
          value={params.get('feedback') ?? ANY}
          onValueChange={(v) => setParams({ feedback: v === ANY ? null : String(v) })}
        >
          <SelectTrigger size="sm" aria-label="Feedback">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any feedback</SelectItem>
            <SelectItem value="up">👍 Good</SelectItem>
            <SelectItem value="down">👎 Bad</SelectItem>
            <SelectItem value="none">Not rated</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              router.replace(pathname, { scroll: false });
            }}
          >
            <RotateCcwIcon />
            Reset
          </Button>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              <BookmarkIcon />
              Views
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Saved views</DropdownMenuLabel>
                {BUILT_IN_VIEWS.map((v) => (
                  <DropdownMenuItem key={v.name} onClick={() => applyView(v.query)}>
                    {v.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              {views.length ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Yours</DropdownMenuLabel>
                    {views.map((v) => (
                      <DropdownMenuItem key={v.name} onClick={() => applyView(v.query)} className="justify-between">
                        <span className="truncate">{v.name}</span>
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={`Delete view ${v.name}`}
                          className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteView(v.name);
                          }}
                        >
                          <Trash2Icon className="size-3.5" />
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={saveView}>Save current filters…</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Select
            items={[
              { value: 'date_desc', label: 'Newest' },
              { value: 'score_desc', label: 'Best score' },
              { value: 'date_asc', label: 'Oldest' },
              { value: 'score_asc', label: 'Lowest score' },
              { value: 'company_asc', label: 'Company A–Z' },
              { value: 'title_asc', label: 'Title A–Z' },
            ]}
            value={params.get('sort') ?? 'date_desc'}
            onValueChange={(v) => setParams({ sort: v === 'date_desc' ? null : String(v) })}
          >
            <SelectTrigger size="sm" aria-label="Sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Newest</SelectItem>
              <SelectItem value="score_desc">Best score</SelectItem>
              <SelectItem value="date_asc">Oldest</SelectItem>
              <SelectItem value="score_asc">Lowest score</SelectItem>
              <SelectItem value="company_asc">Company A–Z</SelectItem>
              <SelectItem value="title_asc">Title A–Z</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" nativeButton={false} render={<a href={csv} />}>
            <DownloadIcon />
            CSV
          </Button>
        </div>
      </div>

      <div className={cn('overflow-hidden rounded-xl border bg-card', loading && data && 'opacity-60')}>
        {error ? (
          <p className="p-6 text-sm text-destructive">{error}</p>
        ) : !data ? (
          <div className="grid h-48 place-items-center">
            <LoaderCircleIcon className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : data.jobs.length === 0 ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyTitle>No jobs match</EmptyTitle>
              <EmptyDescription>
                {hasFilters ? 'Loosen the filters or reset them.' : 'Run a scan from Sources or scan LinkedIn with the extension.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader className="bg-muted/40">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead key={h.id} className="h-9 text-xs">
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row, i) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  className={cn('cursor-pointer', i === activeRow && 'ring-1 ring-ring/40 ring-inset')}
                  onClick={() => {
                    setActiveRow(i);
                    openJob(row.original.id);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span className="tabular">
          {total ? `${formatNumber((page - 1) * limit + 1)}–${formatNumber(Math.min(page * limit, total))} of ${formatNumber(total)}` : '0 jobs'}
          <span className="ml-3 hidden md:inline">
            <Kbd>j</Kbd>/<Kbd>k</Kbd> move · <Kbd>Enter</Kbd> open · <Kbd>x</Kbd> select
          </span>
        </span>
        <div className="flex items-center gap-2">
          <Select
            items={[25, 50, 100].map((n) => ({ value: String(n), label: `${n} / page` }))}
            value={String(limit)}
            onValueChange={(v) => setParams({ limit: String(v) })}
          >
            <SelectTrigger size="sm" aria-label="Page size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[25, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page <= 1}
            onClick={() => setParams({ page: String(page - 1) }, false)}
            aria-label="Previous page"
          >
            <ChevronLeftIcon />
          </Button>
          <span className="tabular">
            {page} / {pages}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page >= pages}
            onClick={() => setParams({ page: String(page + 1) }, false)}
            aria-label="Next page"
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      <BulkBar ids={selectedIds} onClear={() => setRowSelection({})} onChanged={reload} />
      <JobDetailSheet jobId={openId} onOpenChange={(o) => !o && openJob(null)} onChanged={reload} />
    </div>
  );
}
