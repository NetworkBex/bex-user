import { cn } from '@/lib/ui';

/** BEX wordmark + monogram. The monogram is a stylized "B" formed from two
 *  stacked verification chevrons, evoking the "verification-first" brand
 *  position without leaning on generic crypto iconography. */
export function Logo({ className, withWordmark = true, accent = false }: {
  className?: string;
  withWordmark?: boolean;
  accent?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <Mark accent={accent} />
      {withWordmark && (
        <span className="text-[15px] leading-none">
          BEX<span className="text-fg-muted">·Network</span>
        </span>
      )}
    </span>
  );
}

export function Mark({ size = 22, accent = false }: { size?: number; accent?: boolean }) {
  return (
    <span
      className={cn(
        'grid place-items-center rounded-md shrink-0',
        accent ? 'bg-accent text-accent-fg' : 'bg-fg text-fg-inverse'
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width={Math.round(size * 0.62)} height={Math.round(size * 0.62)} fill="none">
        <path d="M6 5h7a4 4 0 0 1 0 8H6V5z"  stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M6 11h8a4 4 0 0 1 0 8H6v-8z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
