import { cn } from '@/lib/ui';
import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-6 py-12', className)}>
      {icon && (
        <div className="text-fg-subtle mb-4 [&>svg]:size-7">
          {icon}
        </div>
      )}
      <h4 className="text-[15px] font-semibold text-fg">{title}</h4>
      {description && <p className="text-[13px] text-fg-muted mt-1.5 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
