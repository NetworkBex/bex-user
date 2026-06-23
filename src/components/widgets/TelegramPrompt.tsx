'use client';

import { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';

const TG_URL = 'https://t.me/BEX_Network';
const STORAGE_KEY = 'bex_tg_prompt_dismissed';
// Don't nag — once dismissed/joined, stay quiet for this many days.
const SNOOZE_DAYS = 5;
// Small delay so it feels intentional, not jarring on first paint.
const SHOW_DELAY_MS = 1400;

/**
 * A clean, on-load prompt inviting visitors to join the BEX Network Telegram
 * channel. Shows once, then snoozes for a few days after dismiss/join.
 */
export function TelegramPrompt() {
  const [mounted, setMounted] = useState(false); // in the DOM
  const [visible, setVisible] = useState(false);  // transitioned in

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const until = Number(raw);
        if (Number.isFinite(until) && Date.now() < until) return; // still snoozed
      }
    } catch { /* ignore */ }

    const t = setTimeout(() => {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    }, SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const snooze = () => {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now() + SNOOZE_DAYS * 86400_000)); } catch {}
  };

  const close = () => {
    snooze();
    setVisible(false);
    setTimeout(() => setMounted(false), 220);
  };

  const join = () => {
    snooze();
    window.open(TG_URL, '_blank', 'noopener,noreferrer');
    close();
  };

  // Close on Escape.
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Join the BEX Network Telegram channel"
    >
      {/* Backdrop */}
      <div
        onClick={close}
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Card */}
      <div
        className={`relative w-full max-w-sm overflow-hidden rounded-2xl border border-hairline bg-surface shadow-2xl
                    transition-all duration-300 ease-out
                    ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-95'}`}
      >
        {/* Telegram-blue glow header */}
        <div className="relative h-28 bg-gradient-to-br from-[#2AABEE] to-[#229ED9] overflow-hidden">
          <div aria-hidden className="absolute -top-10 -right-10 size-40 rounded-full bg-white/15 blur-2xl" />
          <div aria-hidden className="absolute -bottom-12 -left-8 size-40 rounded-full bg-black/10 blur-2xl" />
          <button
            onClick={close}
            aria-label="Close"
            className="absolute top-3 right-3 grid place-items-center size-8 rounded-full bg-black/15 text-white/90 hover:bg-black/30 transition-colors"
          >
            <X className="size-4" />
          </button>

          {/* Telegram logo */}
          <div className="absolute left-1/2 -bottom-9 -translate-x-1/2">
            <div className="grid place-items-center size-[72px] rounded-full bg-surface ring-4 ring-surface shadow-lg">
              <TelegramLogo className="size-14" />
            </div>
          </div>
        </div>

        <div className="px-6 pt-12 pb-6 text-center">
          <h2 className="text-[18px] font-bold text-fg">Join BEX Network on Telegram</h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">
            Get infrastructure updates, product news, and direct support —
            straight to your phone.
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-fg-subtle">
            <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-[#229ED9]" /> Updates</span>
            <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-[#229ED9]" /> News</span>
            <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-[#229ED9]" /> Support</span>
          </div>

          <button
            onClick={join}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl
                       bg-gradient-to-br from-[#2AABEE] to-[#229ED9] text-white font-semibold text-[14px]
                       shadow-lg shadow-[#229ED9]/25 hover:brightness-110 active:scale-[0.99] transition"
          >
            <TelegramGlyph className="size-[18px]" /> Join our channel
          </button>

          <button
            onClick={close}
            className="mt-2.5 w-full h-9 text-[12.5px] text-fg-subtle hover:text-fg transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

/** Official Telegram mark — blue gradient circle with the white paper plane. */
function TelegramLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 240" className={className} aria-hidden>
      <defs>
        <linearGradient id="tg-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2AABEE" />
          <stop offset="1" stopColor="#229ED9" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="120" fill="url(#tg-grad)" />
      <path
        fill="#fff"
        d="M53.7 118.2c34.9-15.2 58.2-25.2 69.9-30.1 33.3-13.8 40.2-16.2 44.7-16.3 1 0 3.2.2 4.7 1.4 1.2 1 1.5 2.3 1.7 3.3.2 1 .4 3.1.2 4.8-1.8 19.4-9.8 66.3-13.9 87.9-1.7 9.2-5.1 12.3-8.4 12.6-7.1.7-12.5-4.7-19.4-9.2-10.8-7.1-16.9-11.5-27.4-18.4-12.1-8-4.3-12.4 2.7-19.6 1.8-1.9 33.4-30.6 34-33.2.1-.3.1-1.5-.6-2.1-.7-.6-1.7-.4-2.5-.2-1.1.2-17.9 11.4-50.6 33.4-4.8 3.3-9.1 4.9-13 4.8-4.3-.1-12.5-2.4-18.6-4.4-7.5-2.4-13.5-3.7-13-7.9.3-2.1 3.2-4.3 8.8-6.5z"
      />
    </svg>
  );
}

/** White paper-plane glyph for the button. */
function TelegramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.27 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  );
}
