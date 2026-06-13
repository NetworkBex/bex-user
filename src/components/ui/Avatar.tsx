import { cn, initials } from '@/lib/ui';

export function Avatar({ name, size = 36, className }: { name?: string | null; size?: number; className?: string }) {
  const text = initials(name);
  // Deterministic hue from name
  let h = 0;
  for (const ch of name ?? '?') h = (h * 31 + ch.charCodeAt(0)) % 360;
  return (
    <span
      className={cn(
        'inline-grid place-items-center font-semibold text-[11px] uppercase tracking-wide rounded-full text-white shrink-0',
        className
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, oklch(60% 0.16 ${h}), oklch(40% 0.18 ${(h + 60) % 360}))`,
      }}
      aria-label={name ?? ''}
    >
      {text}
    </span>
  );
}
