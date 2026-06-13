import { cn } from '@/lib/ui';
import type { HTMLAttributes, ReactNode } from 'react';

type CardVariant = 'default' | 'sunk' | 'elevated' | 'flush';

const variantStyles: Record<CardVariant, string> = {
  default:  'bg-surface border border-border shadow-[var(--shadow-sm)]',
  sunk:     'bg-surface-sunk border border-border',
  elevated: 'bg-surface border border-border shadow-[var(--shadow-md)]',
  flush:    'bg-transparent border-0',
};

export function Card({ className, variant = 'default', ...rest }: HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  return <div className={cn('rounded-xl', variantStyles[variant], className)} {...rest} />;
}

export function CardHeader({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5 pb-3', className)}>
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-semibold text-fg leading-tight inline-flex items-center gap-2">
          {icon && <span className="text-accent [&>svg]:size-4 shrink-0">{icon}</span>}
          <span className="truncate">{title}</span>
        </h3>
        {description && <p className="text-[13px] text-fg-muted mt-1">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pb-5', className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-3 border-t border-hairline', className)} {...rest} />;
}

export function CardDivider() {
  return <div className="h-px bg-hairline" />;
}
