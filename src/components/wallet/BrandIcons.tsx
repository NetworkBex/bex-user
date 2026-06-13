import type { SVGProps } from 'react';

/**
 * Wallet brand marks — simplified, color-only representations.
 * These are NOT pixel-perfect copies of trademarked logos; they evoke the
 * brand via shape and palette so the option is recognizable in lists.
 */

export function MetaMaskIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path fill="#E2761B" d="M28.5 3 18 10.6l1.9-4.6z" />
      <path fill="#E4761B" d="M3.5 3 14 10.7 12.1 6zM24.7 21.6 21.9 26l6 1.6 1.7-5.9zM2.4 21.7 4.1 27.6l6-1.6-2.8-4.4z" />
      <path fill="#E4761B" d="M9.8 14.5 8.1 17l5.9.3-.2-6.4zM22.2 14.5 18.2 11l-.1 6.5 5.9-.3zM10.1 26 13.7 24.3 10.6 21.8zM18.3 24.3 21.9 26l-.5-4.2z" />
      <path fill="#D7C1B3" d="M21.9 26 18.3 24.3l.3 2.3-.1 1zM10.1 26l3.5 1.6-.1-1 .3-2.3z" />
      <path fill="#233447" d="m13.7 19.6-2.9-.9 2.1-.9zM18.3 19.6l.8-1.8 2.1.9z" />
      <path fill="#CD6116" d="m10.1 26 .5-4.4-3.3.1zM21.4 21.6l.5 4.4 2.8-4.3zM23.9 17l-5.9.3.5 3 .9-1.8 2.1 1z" />
    </svg>
  );
}

export function TrustWalletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M16 3 5 7v9.5C5 22.4 9.6 26.8 16 29c6.4-2.2 11-6.6 11-12.5V7L16 3z"
        fill="#3375BB"
      />
      <path
        d="M16 6.4v19.4c4.7-2 8.2-5.5 8.2-9.6V8.7L16 6.4z"
        fill="#fff"
        opacity=".25"
      />
    </svg>
  );
}

export function CoinbaseWalletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="16" cy="16" r="13" fill="#0052FF" />
      <rect x="11" y="11" width="10" height="10" rx="2" fill="#fff" />
    </svg>
  );
}

export function RainbowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <linearGradient id="rbg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#001E59" />
          <stop offset="100%" stopColor="#174299" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#rbg)" />
      <path d="M5 27a16 16 0 0 1 16-16" stroke="#FF4000" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M5 27a11 11 0 0 1 11-11" stroke="#FFB800" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M5 27a6 6 0 0 1 6-6" stroke="#00AAFF" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="7" cy="27" r="2" fill="#9747FF" />
    </svg>
  );
}

/* ─── Store badges ───────────────────────────────────────────────── */

export function AppStoreBadge({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 h-11 px-3.5 rounded-lg bg-black text-white border border-white/10 hover:bg-zinc-900 transition-colors ${className ?? ''}`}
    >
      <svg viewBox="0 0 24 24" className="size-6 shrink-0" fill="currentColor">
        <path d="M17.6 13c0-2.9 2.4-4.3 2.5-4.4-1.4-2-3.5-2.3-4.3-2.3-1.8-.2-3.5 1.1-4.4 1.1-.9 0-2.4-1-3.9-1-2 0-3.9 1.2-4.9 3-2.1 3.7-.5 9.2 1.5 12.1 1 1.4 2.2 3 3.7 3 1.5-.1 2-1 3.8-1s2.3 1 3.9 1c1.6 0 2.6-1.4 3.6-2.9.7-1 1.3-2.1 1.7-3.4-1.8-.7-3.2-2.4-3.2-4.2zM14.7 4.5c.8-1 1.4-2.4 1.2-3.8-1.2.1-2.6.8-3.4 1.8-.8.9-1.5 2.3-1.3 3.7 1.3.1 2.7-.7 3.5-1.7z" />
      </svg>
      <span className="flex flex-col leading-tight text-left">
        <span className="text-[9px] uppercase tracking-wider opacity-80">Download on the</span>
        <span className="text-sm font-semibold">App Store</span>
      </span>
    </span>
  );
}

export function PlayStoreBadge({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 h-11 px-3.5 rounded-lg bg-black text-white border border-white/10 hover:bg-zinc-900 transition-colors ${className ?? ''}`}
    >
      <svg viewBox="0 0 24 24" className="size-6 shrink-0">
        <path fill="#00D7FE" d="M3.6 1.7c-.4.4-.6 1-.6 1.7v17.2c0 .7.2 1.3.6 1.7l11.5-10.3L3.6 1.7z" />
        <path fill="#FFCE00" d="m17.4 14 3.4-2c1.1-.6 1.1-1.7 0-2.3l-3.4-2-3.7 3.2 3.7 3.1z" />
        <path fill="#FF3A44" d="m3.6 22.3 13.8-8.3-3.7-3.2L3.6 22.3z" />
        <path fill="#00F076" d="M3.6 1.7 13.7 11l3.7-3.2L3.6 1.7z" />
      </svg>
      <span className="flex flex-col leading-tight text-left">
        <span className="text-[9px] uppercase tracking-wider opacity-80">Get it on</span>
        <span className="text-sm font-semibold">Google Play</span>
      </span>
    </span>
  );
}
