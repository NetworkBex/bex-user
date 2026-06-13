import { cn } from '@/lib/ui';
import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes, HTMLAttributes } from 'react';

export function DataTable({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('overflow-x-auto', className)} {...rest}>
      <table className="w-full text-[14px] leading-relaxed tabular border-separate border-spacing-0">{children}</table>
    </div>
  );
}

export function TR({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'group transition-colors',
        '[&>td]:border-b [&>td]:border-hairline',
        'hover:[&>td]:bg-surface-2/60',
        className
      )}
      {...rest}
    />
  );
}

export function TH({ className, align = 'left', ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      className={cn(
        'sticky top-0 z-10 bg-surface-sunk text-[12px] uppercase tracking-[0.06em] font-semibold text-fg-muted',
        'py-3 px-3 first:pl-5 last:pr-5 border-b border-border',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className
      )}
      {...rest}
    />
  );
}

export function TD({ className, align = 'left', ...rest }: TdHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <td
      className={cn(
        'py-3.5 px-3 first:pl-5 last:pr-5 text-fg align-middle',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
      {...rest}
    />
  );
}

export function TableEmpty({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-14 text-center text-fg-muted text-[14px]">
        {children}
      </td>
    </tr>
  );
}
