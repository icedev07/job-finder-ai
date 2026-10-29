'use client';

import { EyeIcon } from 'lucide-react';

import { useViewing } from '@/components/shell/viewing';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber, formatUsd, timeAgo } from '@/lib/format';

export type UserSummaryRow = {
  userId: number;
  name: string;
  username: string;
  active: boolean;
  found7: number;
  approved7: number;
  applied: number;
  lastLinkedInAt: string | null;
  aiCalls7: number;
  aiCostMonthUsd: number;
};

/** Dashboard, all users: one row per user; View switches the whole dashboard to them. */
export function UsersTable({ rows }: { rows: UserSummaryRow[] }) {
  const { setViewing } = useViewing();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead className="text-right">Found · 7d</TableHead>
          <TableHead className="text-right">Approved · 7d</TableHead>
          <TableHead className="text-right">Applied</TableHead>
          <TableHead className="hidden md:table-cell">Last LinkedIn job</TableHead>
          <TableHead className="hidden text-right lg:table-cell">AI calls · 7d</TableHead>
          <TableHead className="hidden text-right lg:table-cell">AI cost · month</TableHead>
          <TableHead className="w-16">
            <span className="sr-only">View</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.userId} className={r.active ? undefined : 'text-muted-foreground'}>
            <TableCell>
              <span className="font-medium">{r.name}</span>{' '}
              <span className="font-mono text-xs text-muted-foreground">{r.username}</span>
              {r.active ? null : (
                <Badge variant="outline" className="ml-1.5">
                  Disabled
                </Badge>
              )}
            </TableCell>
            <TableCell className="tabular text-right">{formatNumber(r.found7)}</TableCell>
            <TableCell className="tabular text-right">{formatNumber(r.approved7)}</TableCell>
            <TableCell className="tabular text-right">{formatNumber(r.applied)}</TableCell>
            <TableCell className="hidden md:table-cell">{r.lastLinkedInAt ? timeAgo(r.lastLinkedInAt) : 'Never'}</TableCell>
            <TableCell className="tabular hidden text-right lg:table-cell">{formatNumber(r.aiCalls7)}</TableCell>
            <TableCell className="tabular hidden text-right lg:table-cell">{formatUsd(r.aiCostMonthUsd)}</TableCell>
            <TableCell>
              <Button size="sm" variant="ghost" onClick={() => setViewing(r.userId)} aria-label={`View ${r.name}'s data`}>
                <EyeIcon />
                View
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
