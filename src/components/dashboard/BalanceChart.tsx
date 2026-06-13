'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useMemo } from 'react';
import { Skeleton, Spinner } from '@/components/ui/Progress';

interface Point { label: string; value: number }

export function BalanceChart({ data, tone = 'accent' }: { data?: Point[]; tone?: 'accent' | 'success' }) {
  // Generate a plausible series if none provided (the dashboard often has no historical data on day 1)
  const series = useMemo(() => {
    if (data && data.length) return data;
    const days = 14;
    const out: Point[] = [];
    let v = 5_200;
    for (let i = 0; i < days; i++) {
      v += (Math.sin(i / 2) * 80) + (i * 35) + (Math.random() * 60 - 20);
      out.push({ label: `D${i + 1}`, value: Math.max(0, Math.round(v)) });
    }
    return out;
  }, [data]);

  const color = tone === 'accent' ? 'var(--accent)' : 'var(--success)';

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="bx-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--hairline)" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--fg-subtle)', fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--fg-subtle)', fontSize: 11 }} width={48} tickFormatter={(v) => `$${v >= 1000 ? `${Math.round(v / 100) / 10}k` : v}`} />
          <Tooltip
            cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '2 4' }}
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
              padding: '8px 10px',
              boxShadow: 'var(--shadow-md)',
            }}
            labelStyle={{ color: 'var(--fg-subtle)' }}
            itemStyle={{ color: 'var(--fg)', fontWeight: 600 }}
            formatter={(v: number) => [`$${v.toLocaleString()}`, 'Balance']}
          />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#bx-area)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Loading placeholder for a `BalanceChart` slot. Mirrors the chart's
 * 200px height and paints:
 *  - a soft grid background (reuses `grid-bg` from globals.css)
 *  - a wandering faint "trend" polyline (the dashed path the real chart
 *    will eventually trace)
 *  - 5 horizontal y-axis tick placeholders on the right
 *  - a centered accent spinner with a soft glow
 */
export function BalanceChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={
        'relative h-[200px] w-full overflow-hidden rounded-md bg-surface-sunk/30 ' +
        (className ?? '')
      }
      role="status"
      aria-label="Loading chart"
    >
      <div className="absolute inset-0 grid-bg pointer-events-none" aria-hidden />
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 200 80"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M 0 50 C 30 40, 50 30, 80 35 S 130 50, 160 30 S 190 25, 200 28"
          fill="none"
          stroke="var(--accent)"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          strokeDasharray="3 4"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute right-3 top-3 bottom-3 flex flex-col justify-between items-end pointer-events-none" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} mode="pulse" className="h-2 w-10 rounded" />
        ))}
      </div>
      <div className="absolute inset-0 grid place-items-center pointer-events-none" aria-hidden>
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-accent/15 blur-md animate-glow" />
          <Spinner className="size-5 relative" />
        </div>
      </div>
    </div>
  );
}
