'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/ui';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<Variant, string> = {
  primary:
    'bg-fg text-fg-inverse border border-fg hover:opacity-90 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]',
  secondary:
    'bg-surface text-fg border border-border hover:bg-surface-2 hover:border-border-strong',
  ghost:
    'bg-transparent text-fg-muted border border-transparent hover:bg-surface-2 hover:text-fg',
  danger:
    'bg-danger text-white border border-danger hover:opacity-90',
  accent:
    'bg-accent text-accent-fg border border-accent hover:bg-accent-strong',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-md',
  lg: 'h-11 px-5 text-sm gap-2 rounded-lg',
  icon: 'h-9 w-9 rounded-md',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, leadingIcon, trailingIcon, disabled, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold whitespace-nowrap transition-[transform,background,opacity,border-color,box-shadow] duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none',
        'active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : leadingIcon}
      {/* For `size="icon"` the children ARE the icon, so they must render
          visibly. Wrapping them in a sr-only span (as the previous code
          did) made the X close button on every Dialog invisible — the
          dialog would open but the only visible close affordance was the
          footer Cancel button. For other sizes the children are usually
          a short label, so a normal inline wrapper is fine. */}
      {children && (size === 'icon' ? <>{children}</> : <span>{children}</span>)}
      {!loading && trailingIcon}
    </button>
  );
});
