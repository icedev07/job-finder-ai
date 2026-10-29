import { cn } from '@/lib/utils';

/**
 * Tiny area sparkline (server-rendered SVG). The last point is emphasised; every point carries a native
 * tooltip (`<title>`) so values stay inspectable without JavaScript.
 */
export function Sparkline({
  values,
  labels,
  className,
  width = 120,
  height = 32,
  ariaLabel,
}: {
  values: number[];
  labels?: string[];
  className?: string;
  width?: number;
  height?: number;
  ariaLabel: string;
}) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const pad = 3;
  const stepX = (width - pad * 2) / (values.length - 1);
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2);
  const points = values.map((v, i) => [pad + i * stepX, y(v)] as const);
  const line = points
    .map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${(pad + (values.length - 1) * stepX).toFixed(1)},${height - pad} L${pad},${height - pad} Z`;
  const last = points[points.length - 1];
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={ariaLabel}
      className={cn('overflow-visible text-chart-1', className)}
      preserveAspectRatio="none"
    >
      <path d={area} fill="currentColor" fillOpacity={0.1} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map(([px], i) => (
        <rect key={i} x={px - stepX / 2} y={0} width={stepX} height={height} fill="transparent">
          <title>{`${labels?.[i] ?? `#${i + 1}`}: ${values[i]}`}</title>
        </rect>
      ))}
      {last ? (
        <circle cx={last[0]} cy={last[1]} r={3} fill="currentColor" stroke="var(--card)" strokeWidth={2} />
      ) : null}
    </svg>
  );
}
