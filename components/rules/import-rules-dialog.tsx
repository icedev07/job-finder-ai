'use client';

import { CircleCheckIcon, FileUpIcon, TriangleAlertIcon, UploadIcon } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';

import {
  downloadRulesCsv,
  plural,
  rulesToCsv,
  type ImportResult,
  type SkipRule,
} from '@/components/rules/lib/skip-rules';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useHydrated } from '@/hooks/use-hydrated';
import { api, errorMessage } from '@/lib/clientApi';
import { formatNumber } from '@/lib/format';

const EXAMPLE = ['type,pattern,active', 'COMPANY,Acme Corp,true', 'TITLE,vice president,true', 'URL,usajobs.gov,false'].join(
  '\n',
);

type Outcome = { ok: true; result: ImportResult } | { ok: false; error: string };

function ImportSummary({ result }: { result: ImportResult }) {
  return (
    <Alert className="text-tier-match-ink">
      <CircleCheckIcon />
      <AlertTitle>Import complete</AlertTitle>
      <AlertDescription>
        Imported {plural(result.imported, 'rule')}
        {result.dropped ? `, replacing the previous ${formatNumber(result.dropped)}` : ''}.
        {result.skipped ? ` Skipped ${plural(result.skipped, 'invalid or duplicate row')}.` : ''}
      </AlertDescription>
    </Alert>
  );
}

/** Bulk import: paste CSV or load a file, then replace every rule in one step (POST /api/admin/skip-rules/import). */
export function ImportRulesDialog({
  rules,
  onImported,
}: {
  rules: SkipRule[] | null;
  onImported: () => Promise<void>;
}) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState('');
  const [source, setSource] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  async function loadFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so picking the same file again fires onChange.
    e.target.value = '';
    if (!file) return;
    try {
      setCsv(await file.text());
      setSource(`Loaded ${file.name}`);
      setOutcome(null);
    } catch (err) {
      toast.error(`Could not read ${file.name}: ${errorMessage(err)}`);
    }
  }

  function startFromCurrentRules() {
    if (!rules) return;
    setCsv(rulesToCsv(rules));
    setSource(`Loaded the current ${plural(rules.length, 'rule')}`);
    setOutcome(null);
  }

  async function runImport() {
    if (!csv.trim() || pending) return;
    setPending(true);
    setOutcome(null);
    try {
      const result = await api<ImportResult>('/api/admin/skip-rules/import', { method: 'POST', json: { csv } });
      if (!result?.ok) throw new Error('The server did not confirm the import');
      setOutcome({ ok: true, result });
      setCsv('');
      setSource(null);
      toast.success(`Imported ${plural(result.imported, 'rule')}`);
      await onImported();
    } catch (err) {
      setOutcome({ ok: false, error: errorMessage(err) });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Stay open while the import runs so its outcome is seen.
        if (pending) return;
        setOpen(next);
        if (next) setOutcome(null);
      }}
    >
      <DialogTrigger disabled={!hydrated} render={<Button variant="outline" />}>
        <UploadIcon />
        Import CSV
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl" initialFocus={textarea} showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>Import rules from CSV</DialogTitle>
          <DialogDescription>Paste CSV or load a file. Importing replaces every current rule.</DialogDescription>
        </DialogHeader>
        {outcome?.ok ? (
          <ImportSummary result={outcome.result} />
        ) : (
          <div className="grid min-w-0 gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" disabled={pending} onClick={() => fileInput.current?.click()}>
                <FileUpIcon />
                Load file…
              </Button>
              <Button variant="ghost" size="sm" disabled={pending || !rules?.length} onClick={startFromCurrentRules}>
                Start from current rules
              </Button>
              {source ? <span className="min-w-0 truncate text-xs text-muted-foreground">{source}</span> : null}
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={(e) => void loadFile(e)}
              />
            </div>
            <Textarea
              ref={textarea}
              value={csv}
              onChange={(e) => {
                setCsv(e.target.value);
                if (outcome) setOutcome(null);
              }}
              placeholder={EXAMPLE}
              rows={8}
              spellCheck={false}
              disabled={pending}
              aria-label="CSV to import"
              className="max-h-[45vh] min-h-40 font-mono text-xs md:text-xs"
            />
            <p className="text-xs text-muted-foreground">
              One rule per line as <code className="font-mono text-foreground">type,pattern,active</code>. The header
              row is optional, type is TITLE, COMPANY or URL, and active defaults to true. Invalid and duplicate rows
              are skipped.
            </p>
            {rules === null || rules.length > 0 ? (
              <Alert variant="destructive">
                <TriangleAlertIcon />
                <AlertTitle>
                  {rules ? `Replaces all ${plural(rules.length, 'current rule')}` : 'Replaces all current rules'}
                </AlertTitle>
                <AlertDescription>
                  This can’t be undone.
                  {rules ? (
                    <>
                      {' '}
                      <button
                        type="button"
                        className="rounded-sm font-medium underline underline-offset-3 outline-none hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/50"
                        onClick={() => downloadRulesCsv(rules)}
                      >
                        Download a backup first
                      </button>
                    </>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}
            {outcome && !outcome.ok ? (
              <p role="alert" className="text-sm text-destructive">
                Import failed: {outcome.error}
              </p>
            ) : null}
          </div>
        )}
        <DialogFooter>
          {outcome?.ok ? (
            <DialogClose render={<Button />}>Done</DialogClose>
          ) : (
            <>
              <DialogClose disabled={pending} render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button variant="destructive" disabled={pending || !csv.trim()} onClick={() => void runImport()}>
                {pending ? <Spinner /> : <UploadIcon />}
                Replace all rules
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
