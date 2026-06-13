import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn, formatMoney } from '@/lib/ui';
import type { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  delta,
  icon,
  tone = 'fg',
  hint,
}: {
  label: string;
  value: ReactNode;
  delta?: number;          // percent
  icon?: ReactNode;
  tone?: 'fg' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
  hint?: ReactNode;
}) {
  const toneClass: Record<string, string> = {
    fg: 'text-fg',
    success: 'text-success',
    warning: 'text-warning',
    danger:  'text-danger',
    info:    'text-info',
    accent:  'text-accent-fg',
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wider text-fg-muted">
          {icon && <span className="text-fg-subtle [&>svg]:size-3.5">{icon}</span>}
          {label}
        </div>
        <div className={cn('mt-3 text-2xl md:text-[28px] font-semibold tracking-tight tabular leading-tight', toneClass[tone])}>
          {value}
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[12px]">
          {delta != null && (
            <span className={cn(
              'inline-flex items-center gap-0.5 font-medium tabular',
              delta > 0 ? 'text-success' : delta < 0 ? 'text-danger' : 'text-fg-muted'
            )}>
              {delta > 0 ? <ArrowUpRight className="size-3.5" /> : delta < 0 ? <ArrowDownRight className="size-3.5" /> : null}
              {Math.abs(delta).toFixed(2)}%
            </span>
          )}
          {hint && <span className="text-fg-muted ml-auto">{hint}</span>}
        </div>
      </div>
    </Card>
  );
}

export function MoneyStatCard(props: Omit<Parameters<typeof StatCard>[0], 'value'> & { value: number | string }) {
  return <StatCard {...props} value={formatMoney(props.value)} />;
}
