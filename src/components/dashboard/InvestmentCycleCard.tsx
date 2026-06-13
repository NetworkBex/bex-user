'use client';

import { TrendingUp, Clock, Target, Percent, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { cn, formatMoney, shortDate } from '@/lib/ui';

export type InvestmentCycle = {
  /** Primary id (whatever the API returns: `investments_id`, `id`, etc.) */
  id: number | string;
  plan_name?: string;
  name?: string;
  amount: number | string;
  /** Earned so far, in USD. */
  profit_gained: number | string;
  /** Target profit in USD. */
  profit?: number | string;
  /** Optional total expected profit (alias of profit in some endpoints). */
  profit_target?: number | string;
  /** Cycle start timestamp. */
  date_created: string;
  /** Plan duration in days — drives the new time-elapsed progression bar. */
  duration?: number;
  /** Plan daily rate in percent (e.g. 0.25 = 0.25%). */
  daily_rate?: number;
  /** Maturity date — cashout stays locked until this passes. */
  due_date?: string | null;
  status?: number;
  currency?: string;
};

type Props = {
  cycle: InvestmentCycle;
  onCashout?: (id: number | string) => void;
  cashoutVariant?: 'primary' | 'secondary';
  className?: string;
};

/**
 * Active-cycle card with a clean **time-elapsed progression bar** as the
 * centerpiece, plus a secondary ROI progress strip below.
 *
 * Used in both `/dashboard` and `/dashboard/investments`. If the backend
 * hasn't provided a `duration`, we fall back to the legacy ROI bar so
 * the page never breaks.
 */
export function InvestmentCycleCard({ cycle, onCashout, cashoutVariant = 'secondary', className }: Props) {
  const amount   = parseFloat(String(cycle.amount))      || 0;
  const earned   = parseFloat(String(cycle.profit_gained))|| 0;
  const target   = parseFloat(String(cycle.profit ?? cycle.profit_target)) || 0;
  const roiPct   = target > 0 ? Math.min(100, (earned / target) * 100) : 0;
  const started  = new Date(cycle.date_created);
  const now      = new Date();
  const elapsedMs = Math.max(0, now.getTime() - started.getTime());
  const elapsedDays = Math.min(999, Math.floor(elapsedMs / 86_400_000));

  const hasDuration = typeof cycle.duration === 'number' && cycle.duration >= 1;
  const timePct = hasDuration
    ? Math.min(100, (elapsedDays / cycle.duration!) * 100)
    : null;
  const remainingDays = hasDuration
    ? Math.max(0, cycle.duration! - elapsedDays)
    : null;

  const projected = hasDuration && cycle.daily_rate != null
    ? amount * (cycle.daily_rate / 100) * cycle.duration!
    : target;

  // Maturity lock — mirrors the backend rule: cashout is rejected until
  // due_date passes (falls back to duration when due_date is absent;
  // legacy rows with neither stay cashable).
  const dueMs = cycle.due_date ? new Date(cycle.due_date).getTime() : null;
  const matured = dueMs != null && !Number.isNaN(dueMs)
    ? now.getTime() >= dueMs
    : hasDuration
      ? elapsedDays >= cycle.duration!
      : true;
  const lockMsLeft = dueMs != null && !Number.isNaN(dueMs)
    ? Math.max(0, dueMs - now.getTime())
    : remainingDays != null
      ? remainingDays * 86_400_000
      : 0;
  const lockLabel = (() => {
    const hours = Math.ceil(lockMsLeft / 3_600_000);
    if (hours >= 24) {
      const d = Math.floor(hours / 24);
      const h = hours % 24;
      return h > 0 ? `${d}d ${h}h` : `${d}d`;
    }
    const mins = Math.ceil(lockMsLeft / 60_000);
    return hours >= 1 ? `${hours}h ${mins % 60}m` : `${mins}m`;
  })();

  return (
    <div
      className={cn(
        'p-4 rounded-xl border border-border bg-surface-sunk/40 flex flex-col gap-3',
        className,
      )}
    >
      {/* Header: plan name + Live badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-fg truncate">
            {cycle.plan_name || cycle.name || 'Cycle'}
          </div>
          <div className="text-[11px] text-fg-muted font-mono">
            Started {shortDate(cycle.date_created)}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {!matured && (
            <Badge tone="warning">
              <Lock className="size-3" /> Locked
            </Badge>
          )}
          <Badge tone="success">
            <span className="size-1.5 rounded-full bg-success animate-pulse-dot" /> Live
          </Badge>
        </div>
      </div>

      {/* Two-column stats: Stake / Earned */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <Stat
          icon={<TrendingUp className="size-3" />}
          label="Stake"
          value={formatMoney(amount)}
        />
        <Stat
          icon={<TrendingUp className="size-3" />}
          label="Earned"
          value={formatMoney(earned, { sign: true })}
          tone="success"
          align="right"
        />
      </div>

      {/* TIME-ELAPSED progression bar (new centerpiece) */}
      {hasDuration ? (
        <div>
          <div className="flex items-baseline justify-between text-[11px] mb-1.5">
            <span className="text-fg-muted inline-flex items-center gap-1">
              <Clock className="size-3" />
              Day {elapsedDays} of {cycle.duration}
            </span>
            <span className="text-fg tabular font-semibold">{Math.round(timePct!)}%</span>
          </div>
          <div
            className="relative h-2 rounded-full bg-surface-2 overflow-hidden"
            title={`Day ${elapsedDays} of ${cycle.duration} · ${Math.round(timePct!)}% time elapsed · ${Math.round(roiPct)}% of profit target`}
          >
            <div
              className="absolute inset-y-0 left-0 bg-accent rounded-full transition-[width] duration-500"
              style={{ width: `${timePct}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-fg-subtle">
            <span>{remainingDays} day{remainingDays === 1 ? '' : 's'} remaining</span>
            <span className="tabular">
              {target > 0 ? `target ${formatMoney(target, { decimals: 0 })}` : null}
            </span>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-baseline justify-between text-[11px] mb-1.5">
            <span className="text-fg-muted">ROI progress</span>
            <span className="text-fg tabular font-semibold">{Math.round(roiPct)}%</span>
          </div>
          <Progress value={roiPct} tone="accent" />
        </div>
      )}

      {/* Secondary ROI progress (thin stripe) — only when we have the new time bar */}
      {hasDuration && target > 0 && (
        <div>
          <div className="flex items-baseline justify-between text-[10px] mb-1">
            <span className="text-fg-subtle inline-flex items-center gap-1">
              <Target className="size-3" />ROI vs target
            </span>
            <span className="text-fg-muted tabular">{Math.round(roiPct)}%</span>
          </div>
          <div className="relative h-1 rounded-full bg-surface-2 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-success rounded-full transition-[width] duration-500"
              style={{ width: `${roiPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Projected total — only when we have a daily rate + duration */}
      {hasDuration && cycle.daily_rate != null && (
        <div className="flex items-center justify-between text-[11px] text-fg-muted">
          <span className="inline-flex items-center gap-1">
            <Percent className="size-3" />{cycle.daily_rate.toFixed(3)}% daily
          </span>
          <span>
            Projected <span className="text-fg font-semibold tabular">{formatMoney(projected, { decimals: 0 })}</span>
          </span>
        </div>
      )}

      {/* Cash-out action — disabled with a countdown until maturity. */}
      {onCashout && (
        matured ? (
          <Button
            variant={cashoutVariant}
            size="sm"
            className="w-full"
            onClick={() => onCashout(cycle.id)}
          >
            Cash out
          </Button>
        ) : (
          <Button
            variant={cashoutVariant}
            size="sm"
            className="w-full"
            disabled
            leadingIcon={<Lock className="size-3.5" />}
            title={cycle.due_date ? `Cash out unlocks ${shortDate(cycle.due_date)}` : 'Locked until the cycle matures'}
          >
            Locked · {lockLabel}
          </Button>
        )
      )}
    </div>
  );
}

function Stat({
  icon, label, value, tone, align = 'left',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: 'success' | 'fg';
  align?: 'left' | 'right';
}) {
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <div className="text-fg-muted inline-flex items-center gap-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className={cn(
        'tabular font-semibold',
        tone === 'success' ? 'text-success' : 'text-fg',
      )}>{value}</div>
    </div>
  );
}
