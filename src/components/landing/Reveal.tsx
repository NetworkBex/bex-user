'use client';

import { useInView } from '@/lib/useInView';
import { cn } from '@/lib/ui';
import type { HTMLAttributes, ReactNode } from 'react';

/**
 * Wrap any block to fade + rise into view on scroll. Pair with the
 * `.reveal` CSS class baked into globals.css.
 */
export function Reveal({
  delay = 0,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { delay?: 1 | 2 | 3 | 4 | 5 | 0; children: ReactNode }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const delayClass = delay ? `reveal-delay-${delay}` : undefined;
  return (
    <div
      ref={ref}
      className={cn('reveal', inView && 'is-visible', delayClass, className)}
      {...rest}
    >
      {children}
    </div>
  );
}
