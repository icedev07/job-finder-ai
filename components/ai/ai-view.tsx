'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { EvaluationsTab } from '@/components/ai/evaluations-tab';
import { PlaygroundTab } from '@/components/ai/playground-tab';
import { ProvidersTab } from '@/components/ai/providers-tab';
import { RoutesTab } from '@/components/ai/routes-tab';
import type { ProviderHealth, UsageResponse } from '@/components/ai/shared';
import { UsageTab } from '@/components/ai/usage-tab';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/clientApi';
import { useAdminConfig } from '@/lib/useAdminConfig';
import { useLoadOnMount } from '@/hooks/use-load-on-mount';

const TABS = [
  { value: 'providers', label: 'Providers & keys' },
  { value: 'routes', label: 'Routes' },
  { value: 'usage', label: 'Usage & cost' },
  { value: 'playground', label: 'Playground' },
  { value: 'evaluations', label: 'Evaluations' },
] as const;

export function AiView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = TABS.some((t) => t.value === params.get('tab')) ? params.get('tab')! : 'providers';
  const { config, error, reload } = useAdminConfig();
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  const loadUsage = useCallback(async () => {
    setUsageLoading(true);
    try {
      setUsage(await api<UsageResponse>('/api/admin/ai/usage?days=30'));
    } catch (e) {
      setUsage({ ok: false, error: e instanceof Error ? e.message : String(e) } as UsageResponse);
    } finally {
      setUsageLoading(false);
    }
  }, []);

  useLoadOnMount(loadUsage);

  const health = useMemo(
    () => Object.fromEntries((usage?.ok ? usage.health : []).map((h) => [h.provider, h])) as Record<string, ProviderHealth>,
    [usage],
  );

  const reloadAll = useCallback(() => {
    void reload();
    void loadUsage();
  }, [reload, loadUsage]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!config) {
    return (
      <div className="grid h-40 place-items-center">
        <Spinner />
      </div>
    );
  }

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => {
        const next = new URLSearchParams(params.toString());
        next.set('tab', String(v));
        if (v !== 'playground') next.delete('jobId');
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      }}
      className="gap-4"
    >
      <TabsList className="no-scrollbar max-w-full overflow-x-auto">
        {TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="providers">
        <ProvidersTab config={config} health={health} reload={reloadAll} />
      </TabsContent>
      <TabsContent value="routes">
        <RoutesTab config={config} reload={reloadAll} />
      </TabsContent>
      <TabsContent value="usage">
        <UsageTab config={config} usage={usage} loading={usageLoading} reload={reloadAll} />
      </TabsContent>
      <TabsContent value="playground">
        <PlaygroundTab initialJobId={params.get('jobId')} />
      </TabsContent>
      <TabsContent value="evaluations">
        <EvaluationsTab />
      </TabsContent>
    </Tabs>
  );
}
