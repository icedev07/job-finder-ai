import type { Metadata } from 'next';

import { SkipRulesView } from '@/components/rules/skip-rules-view';

export const metadata: Metadata = { title: 'Skip rules' };

export default function SkipRulesPage() {
  return <SkipRulesView />;
}
