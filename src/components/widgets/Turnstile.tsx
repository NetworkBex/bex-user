'use client';

import { useEffect, useRef } from 'react';

// The Turnstile site key is public (it's rendered into the page anyway), so we
// ship it as a default and still allow an env override per environment.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAADp22a4Ri5YiSBlG';

/** True when a site key is configured — gate submit buttons off this. */
export const TURNSTILE_ENABLED = !!SITE_KEY;

let scriptPromise: Promise<void> | null = null;
function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Cloudflare Turnstile widget. Renders nothing when no site key is set, so the
 * forms work in dev / before keys are configured. Calls `onVerify` with the
 * token, and `onExpire` when it expires or errors (clear your stored token).
 */
export function Turnstile({
  onVerify,
  onExpire,
  theme = 'auto',
  className,
}: {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  theme?: 'auto' | 'light' | 'dark';
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    loadTurnstileScript().then(() => {
      const ts = (window as any).turnstile;
      if (cancelled || !ref.current || !ts) return;
      try {
        widgetId.current = ts.render(ref.current, {
          sitekey: SITE_KEY,
          theme,
          callback: (token: string) => onVerify(token),
          'expired-callback': () => onExpire?.(),
          'error-callback': () => onExpire?.(),
        });
      } catch { /* already rendered / hot-reload */ }
    });

    return () => {
      cancelled = true;
      const ts = (window as any).turnstile;
      try { if (widgetId.current && ts) ts.remove(widgetId.current); } catch {}
      widgetId.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={ref} className={className} />;
}
