'use client';

import { cn } from '@/lib/ui';

/**
 * Chart-shaped loading skeleton for the BTC price card.
 *
 * Composition (top → bottom):
 *   1. Faux header:  ticker label, big price (pulsing shimmer), delta chip,
 *      4 mini-stats with staggered widths.
 *   2. Interval tab strip: 6 slots matching the real tabs (1m…1d), one
 *      shown as "active" so the layout doesn't shift when real data lands.
 *   3. Plot area: hairline grid, 18 ghost candles whose bodies fade in
 *      with a wave delay, a sweeping accent beam that travels left→right,
 *      and a dashed price-ticker line that traces a sine path.
 *
 * Visual language reuses existing CSS variables (`--accent`, `--hairline`,
 * `--surface-sunk`) and the keyframes already defined in globals.css
 * (`beam-sweep`, `candle-grow`, `pulse-dot`, `shimmer`).
 */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col', className)}>
      {/* ─── Header strip (matches BtcPriceChart header) ─────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between px-5 pt-5 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wider text-fg-muted">
            <span className="size-3.5 rounded-full bg-warning/30" aria-hidden />
            <span className="skeleton h-3 w-20" />
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-success/25 bg-success-soft text-[12px] text-success font-semibold">
              <span className="size-1.5 rounded-full bg-success animate-pulse-dot" />
              live
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-3">
            <span className="skeleton h-10 w-44 rounded-md" />
            <span className="skeleton h-5 w-16 rounded-md" />
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-[12px]">
            <MiniStat w="w-20" />
            <MiniStat w="w-20" />
            <MiniStat w="w-24" />
            <MiniStat w="w-24" />
          </div>
        </div>

        {/* Interval tabs — 6 slots, one looks active */}
        <div className="inline-flex flex-wrap items-center gap-1 rounded-md border border-border bg-surface-sunk/40 p-1">
          {['1m', '5m', '15m', '1h', '4h', '1d'].map((label, i) => (
            <span
              key={label}
              className={cn(
                'h-7 px-2.5 inline-flex items-center justify-center rounded-md text-[12px] font-semibold tabular',
                i === 2
                  ? 'bg-fg text-fg-inverse border border-fg shadow-[var(--shadow-sm)]'
                  : 'text-fg-muted',
              )}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ─── Plot area ───────────────────────────────────────────────── */}
      <div className="relative px-2 pb-3">
        <div
          className="relative h-[420px] w-full overflow-hidden rounded-md border border-hairline bg-surface-sunk/30"
          role="status"
          aria-label="Loading chart"
        >
          {/* hairline grid background */}
          <div className="absolute inset-0 grid-bg pointer-events-none" aria-hidden />

          {/* ghost candles — staggered fade-in wave */}
          <GhostCandles />

          {/* dashed price trace */}
          <PriceTrace />

          {/* accent beam sweeping left → right */}
          <div
            className="absolute inset-y-0 -inset-x-1/2 pointer-events-none animate-beam"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, color-mix(in oklch, var(--accent) 22%, transparent) 50%, transparent 100%)',
              width: '40%',
            }}
            aria-hidden
          />

          {/* y-axis tick ghost rows */}
          <div className="absolute right-2 top-3 bottom-3 flex flex-col justify-between items-end pointer-events-none" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="skeleton h-2.5 w-10 rounded" />
            ))}
          </div>
          {/* x-axis tick ghost row */}
          <div className="absolute left-3 right-16 bottom-2 flex justify-between pointer-events-none" aria-hidden>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="skeleton h-2.5 w-8 rounded" />
            ))}
          </div>

          {/* subtle pulsing center badge — tells the eye "loading" without text */}
          <div className="absolute inset-0 grid place-items-center pointer-events-none" aria-hidden>
            <div className="flex items-center gap-2 rounded-full border border-border bg-surface/80 backdrop-blur-sm px-3 py-1.5 text-[12px] text-fg-muted shadow-[var(--shadow-sm)]">
              <Spinner />
              <span>Streaming BTC/USDT…</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────── */

function MiniStat({ w }: { w: string }) {
  return (
    <div>
      <span className="skeleton block h-2.5 w-12 rounded mb-1.5" />
      <span className={cn('skeleton block h-3.5 rounded', w)} />
    </div>
  );
}

/** 18 ghost candles spanning the plot area. Each one is a thin wick with a
 *  small body. The body's `animation-delay` produces a left→right wave so
 *  the skeleton feels alive while the data is on the wire. */
function GhostCandles() {
  // 18 evenly-spaced candles. Body heights / colors hand-tuned to feel
  // like a realistic BTC session.
  const candles = [
    { h: 18, b: 6,  up: false },
    { h: 22, b: 8,  up: true  },
    { h: 14, b: 5,  up: false },
    { h: 28, b: 12, up: true  },
    { h: 20, b: 7,  up: true  },
    { h: 26, b: 9,  up: false },
    { h: 16, b: 4,  up: true  },
    { h: 32, b: 14, up: true  },
    { h: 24, b: 8,  up: false },
    { h: 30, b: 11, up: true  },
    { h: 18, b: 6,  up: true  },
    { h: 20, b: 7,  up: false },
    { h: 26, b: 9,  up: true  },
    { h: 34, b: 15, up: true  },
    { h: 22, b: 7,  up: false },
    { h: 16, b: 5,  up: true  },
    { h: 28, b: 10, up: true  },
    { h: 20, b: 6,  up: false },
  ];
  return (
    <div
      className="absolute inset-0 flex items-center px-4 pointer-events-none"
      aria-hidden
    >
      {candles.map((c, i) => {
        const color = c.up ? 'var(--success)' : 'var(--danger)';
        return (
          <div
            key={i}
            className="flex-1 flex justify-center animate-candle"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div
              className="relative flex flex-col items-center"
              style={{ height: c.h * 4 }}
            >
              {/* wick */}
              <span
                className="absolute top-0 bottom-0 w-px"
                style={{ background: color, opacity: 0.4 }}
              />
              {/* body */}
              <span
                className="absolute rounded-sm"
                style={{
                  background: color,
                  opacity: 0.18,
                  width: 6,
                  height: c.b * 2,
                  // center the body on the wick, slightly above mid
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Dashed sine-ish path that "traces" a price line — uses the existing
 *  `animate-price-trace` keyframe (stroke-dashoffset 1000 → 0) for a
 *  draw-on effect. SVG, no JS animation cost. */
function PriceTrace() {
  // Hand-tuned polyline that waves up and down across the plot. Path
  // drawn left-to-right; combined with the dashed stroke + dashoffset
  // animation, the line appears to "stream" from the left edge.
  const d =
    'M 0 220 ' +
    'C 80 200, 140 180, 200 200 ' +
    'S 320 240, 380 210 ' +
    'S 500 150, 580 180 ' +
    'S 720 230, 800 195 ' +
    'S 940 140, 1000 170';
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1000 300"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="traceFade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0" />
          <stop offset="15%"  stopColor="var(--accent)" stopOpacity="0.65" />
          <stop offset="85%"  stopColor="var(--accent)" stopOpacity="0.65" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={d}
        fill="none"
        stroke="url(#traceFade)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="4 4"
        className="animate-price-trace"
      />
    </svg>
  );
}

/** Inline spinner — a quarter-arc that rotates. Lighter than a full
 *  circle and reads as "in progress" without the heaviness of a gear. */
function Spinner() {
  return (
    <svg
      className="size-3.5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12" cy="12" r="9"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="2.5"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
