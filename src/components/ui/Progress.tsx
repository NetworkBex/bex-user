import { cn } from '@/lib/ui';

export function Progress({ value, max = 100, tone = 'accent', className }: {
  value: number;
  max?: number;
  tone?: 'accent' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const toneClass: Record<string, string> = {
    accent: 'bg-accent',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
  };
  return (
    <div className={cn('h-1.5 w-full rounded-full bg-surface-2 overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out', toneClass[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

type SkeletonMode = 'shimmer' | 'pulse' | 'spinner';

export function Skeleton({
  className,
  mode = 'shimmer',
}: {
  /** Set `mode="spinner"` to render a centered spinner inside the slot
   *  instead of a shimmer block — useful for cells that are loading a
   *  single piece of data (e.g. a price, a stat). */
  className?: string;
  mode?: SkeletonMode;
}) {
  if (mode === 'spinner') {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <Spinner />
      </div>
    );
  }
  const modeClass = mode === 'pulse' ? 'skeleton-pulse' : 'skeleton';
  return <div className={cn(modeClass, className)} />;
}

export function Spinner({ className, tone = 'accent' }: { className?: string; tone?: 'accent' | 'fg' | 'muted' }) {
  const toneClass = tone === 'fg' ? 'text-fg' : tone === 'muted' ? 'text-fg-muted' : 'text-accent';
  return (
    <svg className={cn('size-4 animate-spin', toneClass, className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Full-card / full-page loading state. Renders a tinted panel with a
 * pulsing accent spinner and a "Loading…" caption. Use as the entire body
 * of a Card, or as a page-level fallback.
 */
export function PageSpinner({
  label = 'Loading…',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-10 text-fg-muted',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-accent/15 blur-md animate-glow" aria-hidden />
        <Spinner className="size-6 relative" />
      </div>
      <span className="text-xs uppercase tracking-wider font-semibold">{label}</span>
    </div>
  );
}
