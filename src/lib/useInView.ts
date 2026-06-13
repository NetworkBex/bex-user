'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Reveal-on-scroll hook. Returns a ref + an `inView` boolean.
 * The element gets observed once and unobserves on first reveal so
 * scrolling back up doesn't replay the animation.
 */
export function useInView<T extends HTMLElement>(opts: {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
} = {}): [RefObject<T | null>, boolean] {
  const { threshold = 0.15, rootMargin = '0px 0px -60px 0px', once = true } = opts;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, inView];
}
