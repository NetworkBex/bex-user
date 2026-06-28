'use client';

import { useState } from 'react';
import { Info, ChevronDown, CalendarClock, TrendingUp, Wallet } from 'lucide-react';

/**
 * Expandable "What is a Cycle?" explainer. Mobile-friendly accordion shown
 * before first cycle activation to reduce uncertainty about how cycles work.
 */
export function CycleExplainer({ defaultOpen = false, className = '' }: { defaultOpen?: boolean; className?: string }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-xl border border-border bg-surface-sunk/40 overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-surface-2/40 transition-colors"
      >
        <span className="grid place-items-center size-7 rounded-lg bg-accent-soft text-accent shrink-0">
          <Info className="size-4" />
        </span>
        <span className="flex-1 min-w-0 text-[13.5px] font-semibold text-fg">What is a Cycle?</span>
        <ChevronDown className={`size-4 text-fg-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 text-[13px] leading-relaxed text-fg-muted">
          <p>
            A cycle is a <span className="text-fg font-medium">fixed-duration period</span> during which
            BEX&apos;s AI engine executes trades on <span className="text-fg font-medium">Hyperliquid</span> using
            your allocated capital.
          </p>
          <div className="grid gap-2.5">
            <Row icon={<TrendingUp className="size-4" />} title="Earnings credited daily"
                 body="Profit is added to your dashboard balance every day the cycle runs." />
            <Row icon={<CalendarClock className="size-4" />} title="Runs for a set duration"
                 body="Each plan has a fixed length — your capital is allocated for that period." />
            <Row icon={<Wallet className="size-4" />} title="Principal returns at the end"
                 body="When the cycle completes, your principal returns to your balance — withdraw it or start a new cycle." />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="grid place-items-center size-7 rounded-lg bg-surface-2 text-accent shrink-0 mt-0.5">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-fg">{title}</span>
        <span className="block text-[12.5px] text-fg-muted">{body}</span>
      </span>
    </div>
  );
}
