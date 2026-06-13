import { cn } from '@/lib/ui';
import type { Rank } from '@/lib/affiliate';

const rankAccent: Record<Rank['key'], string> = {
  founder:   'text-fg-muted   border-border        bg-surface',
  affiliate: 'text-info       border-info/30       bg-info-soft',
  associate: 'text-accent     border-accent/30     bg-accent-soft',
  silver:    'text-fg         border-border-strong bg-surface-2',
  gold:      'text-warning    border-warning/35    bg-warning-soft',
  platinum:  'text-info       border-info/30       bg-info-soft',
  diamond:   'text-accent     border-accent/40     bg-accent-soft',
  crown:     'text-warning    border-warning/40    bg-warning-soft',
};

export function RankBadge({
  rank,
  size = 'md',
  className,
}: {
  rank: Rank;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const dims = size === 'sm'
    ? 'h-6 px-2.5 text-[12px]'
    : size === 'lg'
      ? 'h-9 px-3.5 text-[15px] font-semibold'
      : 'h-7 px-3 text-[13px]';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide tabular',
        rankAccent[rank.key],
        dims,
        className,
      )}
    >
      <span className="opacity-70 font-mono">{rank.shortKey}</span>
      <span>{rank.title}</span>
      {rank.ornament && <span className="opacity-80">{rank.ornament}</span>}
    </span>
  );
}
