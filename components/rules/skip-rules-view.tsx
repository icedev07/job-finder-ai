'use client';

import { DownloadIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/common/page-header';
import { AddRuleCard } from '@/components/rules/add-rule-card';
import { ImportRulesDialog } from '@/components/rules/import-rules-dialog';
import { downloadRulesCsv, type SkipRule, type SkipRuleType } from '@/components/rules/lib/skip-rules';
import { RulesTableCard } from '@/components/rules/rules-table-card';
import { RuleTester } from '@/components/rules/rule-tester';
import { Button } from '@/components/ui/button';
import { api, errorMessage } from '@/lib/clientApi';

const RULES_URL = '/api/admin/skip-rules';

/** The Skip rules page: loads the rules once, then reloads after every change (the server stays the source of truth). */
export function SkipRulesView() {
  const [rules, setRules] = useState<SkipRule[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadSeq = useRef(0);
  // Switch states still being saved: a reload that raced the save must not flip them back.
  const pendingToggles = useRef(new Map<number, boolean>());

  const load = useCallback(async () => {
    // Only the newest request may update the list.
    const seq = ++loadSeq.current;
    try {
      const data = await api<SkipRule[]>(RULES_URL, { cache: 'no-store' });
      if (seq !== loadSeq.current) return;
      if (!Array.isArray(data)) throw new Error('Unexpected response from the server');
      const pending = pendingToggles.current;
      setRules(
        data.map((r) => {
          const active = pending.get(r.id);
          return active === undefined ? r : { ...r, active };
        }),
      );
      setLoadError(null);
    } catch (e) {
      if (seq === loadSeq.current) setLoadError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addRule(type: SkipRuleType, pattern: string) {
    await api(RULES_URL, { method: 'POST', json: { type, pattern } });
    await load();
  }

  function toggleRule(rule: SkipRule, active: boolean) {
    const pending = pendingToggles.current;
    // One save per rule at a time, so two quick clicks cannot land out of order.
    if (pending.has(rule.id)) return;
    pending.set(rule.id, active);
    setRules((list) => list && list.map((r) => (r.id === rule.id ? { ...r, active } : r)));
    void (async () => {
      try {
        await api(`${RULES_URL}/${rule.id}`, { method: 'PATCH', json: { active } });
      } catch (e) {
        setRules((list) => list && list.map((r) => (r.id === rule.id ? { ...r, active: rule.active } : r)));
        toast.error(`Could not update the rule: ${errorMessage(e)}`);
      } finally {
        pending.delete(rule.id);
        void load();
      }
    })();
  }

  async function deleteRule(rule: SkipRule) {
    try {
      await api(`${RULES_URL}/${rule.id}`, { method: 'DELETE' });
    } catch (e) {
      return { ok: false, error: `Could not delete the rule: ${errorMessage(e)}` };
    }
    setRules((list) => list && list.filter((r) => r.id !== rule.id));
    void load();
    return { ok: true, message: 'Rule deleted' };
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Skip rules"
        description="Jobs that match an active rule are skipped before they are stored or analyzed, which saves AI quota."
        actions={
          <>
            <Button variant="outline" disabled={!rules?.length} onClick={() => rules && downloadRulesCsv(rules)}>
              <DownloadIcon />
              Export CSV
            </Button>
            <ImportRulesDialog rules={rules} onImported={load} />
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <AddRuleCard rules={rules} onAdd={addRule} />
          <RulesTableCard
            rules={rules}
            loadError={loadError}
            onRetry={() => void load()}
            onToggle={toggleRule}
            onDelete={deleteRule}
          />
        </div>
        {/* Sticky beside the table on wide screens (top bar is h-12), stacked below it otherwise. */}
        <div className="min-w-0 xl:sticky xl:top-16 xl:self-start">
          <RuleTester rules={rules} />
        </div>
      </div>
    </div>
  );
}
