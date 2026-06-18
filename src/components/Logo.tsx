import { cn } from '@/lib/ui';

/** BEX brand lockup. The mark renders the brand image from /logo.png. */
export function Logo({ className, withWordmark = true }: {
  className?: string;
  withWordmark?: boolean;
  accent?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <Mark />
      {withWordmark && (
        <span className="text-[15px] leading-none hidden sm:inline">
          BEX<span className="text-fg-muted">·Network</span>
        </span>
      )}
    </span>
  );
}

export function Mark({ size = 24 }: { size?: number; accent?: boolean }) {
  return (
    <span
      className="rounded-lg shrink-0 bg-center bg-cover"
      style={{
        width: size,
        height: size,
        backgroundImage: 'url(/logo.png)',
      }}
      role="img"
      aria-label="BEX Network"
    />
  );
}
