'use client';

import {
  BookmarkIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  HistoryIcon,
  LockIcon,
  PlayIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { memo, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { CopyButton } from '@/components/common/copy-button';
import { SectionCard } from '@/components/common/section-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useHydrated } from '@/hooks/use-hydrated';
import { ApiError, api, errorMessage } from '@/lib/clientApi';
import { formatNumber } from '@/lib/format';

type RowsResult = { kind: 'rows'; rows: Record<string, unknown>[]; rowCount: number; durationMs: number };
type AffectedResult = { kind: 'affected'; affected: number; durationMs: number };
type ErrorResult = { kind: 'error'; error: string; keyword?: string; durationMs?: number };
type QueryResult = RowsResult | AffectedResult | ErrorResult;

const PRESETS: { label: string; sql: string }[] = [
  {
    label: 'List ScrapedJob columns',
    sql: `SELECT column_name, data_type, character_maximum_length\nFROM information_schema.columns\nWHERE table_name = 'ScrapedJob'\nORDER BY ordinal_position;`,
  },
  {
    label: 'Add manualApplyUrl column (idempotent)',
    sql: `ALTER TABLE "ScrapedJob" ADD COLUMN IF NOT EXISTS "manualApplyUrl" VARCHAR(2048);`,
  },
  {
    label: 'Count ScrapedJob rows',
    sql: `SELECT COUNT(*)::int AS total FROM "ScrapedJob";`,
  },
  {
    label: 'List all tables',
    sql: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`,
  },
];
const PRESET_ITEMS = PRESETS.map((p) => ({ value: p.label, label: p.label }));

// Same check as app/api/admin/db/query/route.ts: anything else is a write and needs confirmWrite + password.
const READ_KEYWORDS = new Set(['SELECT', 'WITH', 'SHOW', 'EXPLAIN', 'VALUES', 'TABLE']);

function firstKeyword(sql: string): string {
  const stripped = sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .trim();
  const match = stripped.match(/^[A-Za-z]+/);
  return match ? match[0].toUpperCase() : '';
}

// Recent queries live in this tab's sessionStorage. The password never does: older builds kept a
// copy under LEGACY_PASSWORD_KEY, which the console deletes on mount.
const HISTORY_KEY = 'admin_db_history';
const LEGACY_PASSWORD_KEY = 'admin_db_password';
const HISTORY_LIMIT = 20;
const historyListeners = new Set<() => void>();

function readHistory(): string | null {
  try {
    return sessionStorage.getItem(HISTORY_KEY);
  } catch {
    return null;
  }
}

function subscribeHistory(listener: () => void) {
  historyListeners.add(listener);
  return () => {
    historyListeners.delete(listener);
  };
}

function parseHistory(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const queries = parsed.filter((q): q is string => typeof q === 'string' && q.trim() !== '');
    return Array.from(new Set(queries)).slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function rememberQuery(sql: string) {
  const next = [sql, ...parseHistory(readHistory()).filter((q) => q !== sql)].slice(0, HISTORY_LIMIT);
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    return; // Storage unavailable: history is only a convenience.
  }
  historyListeners.forEach((listener) => listener());
}

function useQueryHistory(): string[] {
  const raw = useSyncExternalStore(subscribeHistory, readHistory, () => null);
  return useMemo(() => parseHistory(raw), [raw]);
}

// Bigger results are still fully available through "Copy as JSON".
const MAX_RENDERED_ROWS = 1000;
// Picker popups fit their items (up to 32rem) instead of the trigger width.
const PICKER_POPUP = 'w-auto min-w-(--anchor-width) max-w-[min(32rem,var(--available-width))]';

function plural(n: number, word: string): string {
  return `${formatNumber(n)} ${word}${n === 1 ? '' : 's'}`;
}

function formatMs(ms: number): string {
  return `${formatNumber(ms)} ms`;
}

function cellText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/** SQL console: presets, per-tab history, read-only reads and password-gated writes. */
export function SqlConsole() {
  const [sql, setSql] = useState(PRESETS[0].sql);
  const [password, setPassword] = useState('');
  const [confirmWrite, setConfirmWrite] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const history = useQueryHistory();
  const historyItems = useMemo(
    () => history.map((q) => ({ value: q, label: q.replace(/\s+/g, ' ').trim() })),
    [history],
  );
  const hydrated = useHydrated();
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const confirmId = useId();

  useEffect(() => {
    try {
      sessionStorage.removeItem(LEGACY_PASSWORD_KEY);
    } catch {
      // Storage unavailable: nothing to clean up.
    }
  }, []);

  const keyword = useMemo(() => firstKeyword(sql), [sql]);
  const hasSql = sql.trim() !== '';
  const isRead = READ_KEYWORDS.has(keyword);
  const isWrite = hasSql && !isRead;
  const statement = keyword || 'unknown';
  const modKey = hydrated && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl';
  // Read out by screen readers; errors announce themselves through their role="alert".
  const announcement = running
    ? 'Running query…'
    : result?.kind === 'rows'
      ? `${plural(result.rowCount, 'row')} returned`
      : result?.kind === 'affected'
        ? `${plural(result.affected, 'row')} affected`
        : '';

  async function run() {
    if (running || !hasSql) return;
    if (!isRead && !password) {
      setResult({ kind: 'error', error: 'Write queries need your password. Enter it before running.' });
      return;
    }
    if (!isRead && !confirmWrite) {
      setResult({
        kind: 'error',
        error: `This is a write/DDL query (${statement}). Tick "Confirm write" before running.`,
      });
      return;
    }
    setRunning(true);
    setResult(null);
    try {
      const data = await api<RowsResult | AffectedResult>('/api/admin/db/query', {
        method: 'POST',
        json: { sql, password: isRead ? undefined : password, confirmWrite },
      });
      if (data?.kind !== 'rows' && data?.kind !== 'affected') throw new Error('Unexpected response from the server.');
      setResult(data);
      if (!isRead) setPassword('');
      rememberQuery(sql);
    } catch (e) {
      const body = e instanceof ApiError && e.data && typeof e.data === 'object' ? (e.data as Record<string, unknown>) : {};
      setResult({
        kind: 'error',
        error: errorMessage(e),
        keyword: typeof body.keyword === 'string' && body.keyword ? body.keyword : undefined,
        durationMs: typeof body.durationMs === 'number' ? body.durationMs : undefined,
      });
    } finally {
      setRunning(false);
    }
  }

  function loadPreset(label: string | null) {
    const preset = PRESETS.find((p) => p.label === label);
    if (preset) setSql(preset.sql);
  }

  function clear() {
    setSql('');
    setResult(null);
    editorRef.current?.focus();
  }

  return (
    <SectionCard
      title="SQL console"
      description="Run SQL against the app database. Reads run in a read-only transaction; writes need your password and can’t be undone."
    >
      <div className="flex flex-wrap items-center gap-2">
        <Select items={PRESET_ITEMS} value={null} onValueChange={loadPreset}>
          <SelectTrigger size="sm" aria-label="Load a preset query" className="data-placeholder:text-foreground">
            <BookmarkIcon />
            <SelectValue placeholder="Presets" />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false} className={PICKER_POPUP}>
            {PRESETS.map((p) => (
              <SelectItem key={p.label} value={p.label}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={historyItems}
          value={null}
          onValueChange={(q: string | null) => {
            if (q) setSql(q);
          }}
          disabled={history.length === 0}
        >
          <SelectTrigger size="sm" aria-label="Load a recent query" className="data-placeholder:text-foreground">
            <HistoryIcon />
            <SelectValue placeholder={history.length > 0 ? `Recent (${history.length})` : 'No recent queries'} />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false} className={PICKER_POPUP}>
            {historyItems.map((item) => (
              <SelectItem
                key={item.value}
                value={item.value}
                title={item.value}
                className="font-mono text-xs [&>div]:min-w-0"
              >
                <span className="truncate">{item.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasSql ? (
          <Badge variant={isRead ? 'secondary' : 'destructive'} className="ms-auto">
            {statement} · {isRead ? 'read-only' : 'write'}
          </Badge>
        ) : null}
      </div>

      <Textarea
        ref={editorRef}
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void run();
          }
        }}
        aria-label="SQL query"
        aria-keyshortcuts="Control+Enter Meta+Enter"
        placeholder={'SELECT * FROM "ScrapedJob" LIMIT 10;'}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        className="max-h-96 min-h-40 resize-y font-mono"
      />

      {isWrite ? (
        <div className="space-y-3">
          <Alert variant="destructive" className="border-destructive/30 bg-destructive/10">
            <TriangleAlertIcon />
            <AlertTitle>Write query ({statement})</AlertTitle>
            <AlertDescription>
              This changes the live database and can’t be undone. Tick “Confirm write” and enter your password
              to run it.
            </AlertDescription>
          </Alert>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Field orientation="horizontal" className="w-auto">
              <Checkbox id={confirmId} checked={confirmWrite} onCheckedChange={(checked) => setConfirmWrite(checked)} />
              <FieldLabel htmlFor={confirmId}>Confirm write ({statement})</FieldLabel>
            </Field>
            <InputGroup className="w-full sm:w-64">
              <InputGroupAddon>
                <LockIcon />
              </InputGroupAddon>
              <InputGroupInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void run();
                  }
                }}
                placeholder="Your password"
                aria-label="Your password"
                autoComplete="off"
              />
            </InputGroup>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={isWrite ? 'destructive' : 'default'}
          onClick={() => void run()}
          disabled={!hydrated || running || !hasSql}
        >
          {running ? <Spinner /> : <PlayIcon />}
          {running ? 'Running…' : isWrite ? 'Run write query' : 'Run query'}
        </Button>
        <Button variant="outline" onClick={clear} disabled={running}>
          Clear
        </Button>
        <span className="ms-auto hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <KbdGroup>
            <Kbd>{modKey}</Kbd>
            <Kbd>Enter</Kbd>
          </KbdGroup>
          to run
        </span>
        <p role="status" className="sr-only">
          {announcement}
        </p>
      </div>

      {result ? <QueryResultView result={result} /> : null}
    </SectionCard>
  );
}

// Memoized so typing in the editor does not re-render a large result table.
const QueryResultView = memo(function QueryResultView({ result }: { result: QueryResult }) {
  if (result.kind === 'error') {
    return (
      <Alert variant="destructive" className="border-destructive/30 bg-destructive/10">
        <CircleAlertIcon />
        <AlertTitle>
          Error{result.keyword ? ` (${result.keyword})` : ''}
          {result.durationMs !== undefined ? (
            <span className="font-normal opacity-75"> · {formatMs(result.durationMs)}</span>
          ) : null}
        </AlertTitle>
        <AlertDescription className="break-words whitespace-pre-wrap">{result.error}</AlertDescription>
      </Alert>
    );
  }
  if (result.kind === 'affected') {
    return (
      <div className="flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm">
        <CircleCheckIcon className="size-4 shrink-0 text-success" />
        <span className="font-medium">{plural(result.affected, 'row')} affected</span>
        <span className="text-muted-foreground">· {formatMs(result.durationMs)}</span>
      </div>
    );
  }
  return <RowsView result={result} />;
});

function RowsView({ result }: { result: RowsResult }) {
  const { rows } = result;
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const shown = rows.slice(0, MAX_RENDERED_ROWS);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          <span className="font-medium">{plural(result.rowCount, 'row')}</span>
          <span className="text-muted-foreground"> · {formatMs(result.durationMs)}</span>
        </p>
        {rows.length > 0 ? (
          <CopyButton value={JSON.stringify(rows, null, 2)} label="Copy as JSON" size="sm" variant="outline" />
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rows returned.</p>
      ) : (
        // One scroll box for both axes (the Table's own x-scroller is switched off) so the header can stick.
        <div
          role="region"
          aria-label="Query results"
          tabIndex={0}
          className="max-h-[30rem] overflow-auto rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50 *:data-[slot=table-container]:overflow-visible"
        >
          <Table className="font-mono text-xs">
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow>
                {columns.map((col) => (
                  <TableHead
                    key={col}
                    className="sticky top-0 z-10 h-8 bg-muted px-3 shadow-[inset_0_-1px_0_var(--border)]"
                  >
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((row, i) => (
                <TableRow key={i}>
                  {columns.map((col) => {
                    const text = cellText(row[col]);
                    return (
                      <TableCell key={col} title={text ?? 'NULL'} className="px-3 py-1.5">
                        {text === null ? (
                          <span className="text-muted-foreground italic">NULL</span>
                        ) : (
                          <span className="block max-w-xs truncate">{text}</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {rows.length > shown.length ? (
        <p className="text-xs text-muted-foreground">
          Showing the first {formatNumber(shown.length)} rows. Copy as JSON to get all {formatNumber(rows.length)}.
        </p>
      ) : null}
    </div>
  );
}
