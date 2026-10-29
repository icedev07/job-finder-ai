import type { Metadata } from 'next';

import { DEFAULT_SOURCE_TAB, isSourceTab } from '@/components/sources/catalog';
import { SourcesView } from '@/components/sources/sources-view';

export const metadata: Metadata = { title: 'Sources' };

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tab } = await searchParams;
  return <SourcesView initialTab={typeof tab === 'string' && isSourceTab(tab) ? tab : DEFAULT_SOURCE_TAB} />;
}
