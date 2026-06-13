'use client';

import { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { BarChart3, CalendarRange, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Progress';
import { cn, formatMoney } from '@/lib/ui';

export type EarningsRange = 'today' | 'week' | 'month' | 'year' | 'custom';
export type Bucket = 'hour' | 'day' | 'week' | 'month';

export type BarPoint = { label: string; value: number; sub?: string };

type Props = {
  data: BarPoint[];
  range: EarningsRange;
  onRangeChange: (r: EarningsRange, custom?: { from: string; to: string }) => void;
  customRange?: { from: string; to: string };
  loading?: boolean;
  height?: number;
  className?: string;
};

const RANGES: { value: EarningsRange; label: string }[] = [
  { value: 'today', label: 'Today'  },
  { value: 'week',  label: 'Week'   },
  { value: 'month', label: 'Month'  },
  { value: 'year',  label: 'Year'   },
  { value: 'custom',label: 'Custom' },
];

export function EarningsBarChart({
  data,
  range,
  onRangeChange,
  customRange,
  loading = false,
  height = 220,
  className,
}: Props) {
  const [pending, setPending] = useState({ from: customRange?.from ?? '', to: customRange?.to ?? '' });

  const total = useMemo(() => data.reduce((s, p) => s + p.value, 0), [data]);

  if (loading && data.length === 0) {
    return (
      <div className={cn('w-full', className)}>
        <Skeleton mode="pulse" className={cn('w-full rounded-md', `h-[${height}px]`)} />
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Filter pill row + total */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="inline-flex flex-wrap items-center gap-1 rounded-md border border-border bg-surface-sunk/40 p-1">
          {RANGES.map((r) => {
            const active = range === r.value;
            return (
              <Button
                key={r.value}
                size="sm"
                variant={active ? 'primary' : 'ghost'}
                onClick={() => {
                  if (r.value === 'custom') {
                    // Don't fire the onRangeChange yet — wait for Apply
                    onRangeChange('custom', { from: pending.from, to: pending.to });
                  } else {
                    onRangeChange(r.value);
                  }
                }}
                className="h-7 px-2.5 text-[12px] font-semibold"
                aria-pressed={active}
              >
                {r.label}
              </Button>
            );
          })}
        </div>
        <div className="ml-auto text-[12px] text-fg-muted inline-flex items-center gap-1">
          <BarChart3 className="size-3.5" />
          <span>Total</span>
          <span className="text-fg font-semibold tabular">{formatMoney(total, { decimals: 0 })}</span>
        </div>
      </div>

      {/* Custom range date pickers */}
      {range === 'custom' && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface-sunk/30 px-3 py-2">
          <CalendarRange className="size-3.5 text-fg-muted" />
          <span className="text-[12px] text-fg-muted">From</span>
          <input
            type="date"
            value={pending.from}
            onChange={(e) => setPending((p) => ({ ...p, from: e.target.value }))}
            className="bg-surface-2 border border-border rounded-md px-2 py-1 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <span className="text-[12px] text-fg-muted">to</span>
          <input
            type="date"
            value={pending.to}
            onChange={(e) => setPending((p) => ({ ...p, to: e.target.value }))}
            className="bg-surface-2 border border-border rounded-md px-2 py-1 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <Button
            size="sm"
            variant="primary"
            disabled={!pending.from || !pending.to}
            onClick={() => onRangeChange('custom', { from: pending.from, to: pending.to })}
            leadingIcon={<Check className="size-3.5" />}
            className="ml-auto"
          >
            Apply
          </Button>
        </div>
      )}

      {/* Chart */}
      <div style={{ height }} className="w-full">
        {data.length === 0 ? (
          <div className="h-full w-full grid place-items-center">
            <div className="text-center text-fg-muted">
              <p className="text-sm">No earnings in this range</p>
              <p className="text-xs mt-1">Try widening the window or check back tomorrow.</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="22%">
              <defs>
                <linearGradient id="bar-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="var(--success)" stopOpacity="1"   />
                  <stop offset="100%" stopColor="var(--success)" stopOpacity="0.65" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--hairline)" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--fg-subtle)', fontSize: 11 }}
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <YAxis
                orientation="right"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--fg-subtle)', fontSize: 11 }}
                width={64}
                domain={[0, 'auto']}
                tickFormatter={(v) => '$' + (v as number).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              />
              <Tooltip
                cursor={{ fill: 'var(--surface-2)', opacity: 0.6 }}
                content={BarTooltip}
              />
              <Bar
                dataKey="value"
                fill="url(#bar-fill)"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
                maxBarSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value as number;
  const sub = payload[0]?.payload?.sub as string | undefined;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 shadow-[var(--shadow-md)] text-[12px] font-mono tabular">
      <div className="text-fg-subtle mb-0.5">{label}{sub ? ` · ${sub}` : ''}</div>
      <div className="text-fg font-semibold">{formatMoney(v, { decimals: 2 })}</div>
    </div>
  );
}

/* ─── Pure bucketers (callers can reuse these without a roundtrip) ──── */

export function bucketByDay(rows: Array<{ period_date: string; amount: string | number }>): BarPoint[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = String(r.period_date).slice(0, 10);
    map.set(d, (map.get(d) ?? 0) + parseFloat(String(r.amount)) || 0);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([d, v]) => ({ label: d.slice(5), sub: d.slice(0, 4), value: v }));
}

export function bucketByMonth(rows: Array<{ period_date: string; amount: string | number }>): BarPoint[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = String(r.period_date).slice(0, 7);
    map.set(d, (map.get(d) ?? 0) + parseFloat(String(r.amount)) || 0);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([d, v]) => {
      const [y, m] = d.split('-');
      const date = new Date(Number(y), Number(m) - 1, 1);
      return {
        label: date.toLocaleDateString(undefined, { month: 'short' }),
        sub: y,
        value: v,
      };
    });
}

export function pickBucket(from: Date, to: Date): Bucket {
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));
  if (days <= 2)  return 'hour';
  if (days <= 31) return 'day';
  if (days <= 365) return 'week';
  return 'month';
}
