'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { formatCompact, formatDayKey } from '@/lib/format';

export interface ActivityPoint {
  day: string;
  approved: number;
  rejected: number;
  aiCalls: number;
}

const aiConfig = {
  aiCalls: { label: 'AI calls', color: 'var(--chart-1)' },
} satisfies ChartConfig;
const jobsConfig = {
  approved: { label: 'Approved', color: 'var(--chart-3)' },
  rejected: { label: 'Rejected', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const axisTick = { fontSize: 11 };

/**
 * Two small multiples sharing the day axis — AI calls vs jobs judged (approved + rejected) per day.
 * Separate panels instead of a dual axis: the two measures differ in scale.
 */
export function ActivityChart({ data }: { data: ActivityPoint[] }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Jobs judged / day</p>
        <ChartContainer config={jobsConfig} className="aspect-auto h-40 w-full">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap={3}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              interval="preserveStartEnd"
              minTickGap={16}
              tickFormatter={(v: string) => formatDayKey(v)}
            />
            <YAxis width={36} tickLine={false} axisLine={false} tick={axisTick} allowDecimals={false} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent labelFormatter={(v) => formatDayKey(String(v))} />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="approved"
              stackId="jobs"
              fill="var(--color-approved)"
              maxBarSize={24}
              stroke="var(--card)"
              strokeWidth={1}
            />
            <Bar
              dataKey="rejected"
              stackId="jobs"
              fill="var(--color-rejected)"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
              stroke="var(--card)"
              strokeWidth={1}
            />
          </BarChart>
        </ChartContainer>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">AI calls / day</p>
        <ChartContainer config={aiConfig} className="aspect-auto h-24 w-full">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap={3}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" hide />
            <YAxis
              width={36}
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              tickFormatter={(v: number) => formatCompact(v)}
              allowDecimals={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent labelFormatter={(v) => formatDayKey(String(v))} />}
            />
            <Bar dataKey="aiCalls" fill="var(--color-aiCalls)" radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
