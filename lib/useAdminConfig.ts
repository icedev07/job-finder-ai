'use client';

import { useCallback, useState } from 'react';

import type { SecretState } from '@/components/common/secret-field';
import { useLoadOnMount } from '@/hooks/use-load-on-mount';
import { api, errorMessage } from '@/lib/clientApi';

// The admin config as GET /api/admin/config returns it: plain settings as
// strings plus `secrets` (set + hint only — never the values).
export type AdminConfig = Record<string, string> & {
  secrets?: Record<string, SecretState>;
};

export function useAdminConfig() {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await api<AdminConfig>('/api/admin/config');
      setConfig(data);
      setError(null);
      return data;
    } catch (e) {
      setError(errorMessage(e));
      return null;
    }
  }, []);

  useLoadOnMount(reload);

  return { config, error, reload };
}

export async function saveAdminConfig(values: Record<string, string>): Promise<void> {
  await api('/api/admin/config', { method: 'PUT', json: values });
}
