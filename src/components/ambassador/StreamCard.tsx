import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { cn, formatMoney } from '@/lib/ui';

export function StreamCard({
  label,
  amountUsd,
  icon,
  description,
  trailing,
  highlight,
}: {
  label: string;
  amountUsd: number | null | undefined;
  icon?: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={cn('overflow-hidden', highlight && 'border-accent/40')}>
      <div className="p-5">
        <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wider text-fg-muted">
          {icon && <span className="text-fg-subtle [&>svg]:size-3.5">{icon}</span>}
          {label}
        </div>
        <div className="mt-3 text-[26px] font-semibold tracking-tight tabular leading-tight text-fg">
          {amountUsd == null ? <span className="text-fg-subtle">—</span> : formatMoney(amountUsd)}
        </div>
        {description && <div className="mt-1 text-[13px] text-fg-muted">{description}</div>}
        {trailing && <div className="mt-3 pt-3 border-t border-hairline">{trailing}</div>}
      </div>
    </Card>
  );
}
