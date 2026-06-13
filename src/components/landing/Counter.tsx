'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from '@/lib/useInView';
import { cn } from '@/lib/ui';

/**
 * Counts from 0 → `to` over `duration` ms when scrolled into view.
 * Uses an ease-out so it lands gently. Plays at most once.
 */
export function Counter({
  to,
  duration = 1400,
  prefix = '',
  suffix = '',
  format,
  decimals = 0,
  className,
}: {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  format?: (n: number) => string;
  decimals?: number;
  className?: string;
}) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef   = useRef<number | null>(null);

  useEffect(() => {
    if (!inView) return;
    const step = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(to * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else setValue(to);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, [inView, to, duration]);

  const formatted = format
    ? format(value)
    : value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <span ref={ref} className={cn('tabular', className)}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
