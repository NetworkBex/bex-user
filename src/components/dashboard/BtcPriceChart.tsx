'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, type BarProps,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, RefreshCcw, TriangleAlert, Bitcoin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Progress';
import { PulseDot, Badge } from '@/components/ui/Badge';
import { ChartSkeleton } from '@/components/ui/ChartSkeleton';
import { cn, formatCompact, formatMoney } from '@/lib/ui';

const BINANCE_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BINANCE_BASE) ||
  'https://api.binance.com';

const INTERVALS = [
  { value: '1m',  label: '1m',  longLabel: '1 minute'  },
  { value: '5m',  label: '5m',  longLabel: '5 minutes' },
  { value: '15m', label: '15m', longLabel: '15 minutes' },
  { value: '1h',  label: '1h',  longLabel: '1 hour'    },
  { value: '4h',  label: '4h',  longLabel: '4 hours'   },
  { value: '1d',  label: '1d',  longLabel: '1 day'     },
] as const;

type Interval = (typeof INTERVALS)[number]['value'];

const TICKER_REFRESH_MS = 15_000;
const KLINES_REFRESH_MS = 30_000;
/**
 * Candle count. 80 keeps Recharts' per-bar slot ≥ ~8px on a 700px plot at
 * any interval (1m = 80min, 15m = 20h, 1h = 3.3d, 1d = 80d) — wider than
 * the body so there is always a visible gap between candles.
 */
const KLINES_LIMIT      = 80;

/** Gap between candles as a fraction of the slot width. */
const GAP_FRACTION = 0.22;
/** Hard floor for the gap, in pixels, so dense slots still breathe. */
const MIN_GAP_PX   = 1.5;
/** Floor for the body width so dense intervals still read as candles, not lines. */
const MIN_BODY_PX   = 3;
/** Cap for the body width so sparse intervals don't blob into a bar. */
const MAX_BODY_PX   = 14;

type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };
type Ticker = {
  lastPrice:           number;
  priceChange:         number;
  priceChangePercent:  number;
  highPrice:           number;
  lowPrice:            number;
  volume:              number;   // base  (BTC)
  quoteVolume:         number;   // quote (USDT)
  openPrice:           number;
};

const LONG_INTERVALS: ReadonlySet<Interval> = new Set(['4h', '1d']);

function formatXAxis(t: number, interval: Interval) {
  const d = new Date(t);
  if (LONG_INTERVALS.has(interval)) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatTooltipTime(t: number) {
  return new Date(t).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function pct(n: number) { return n.toFixed(2) + '%'; }
function usd(n: number) { return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 2 }); }

function mapKlineRow(row: any[]): Candle {
  return {
    t: row[0],
    o: parseFloat(row[1]),
    h: parseFloat(row[2]),
    l: parseFloat(row[3]),
    c: parseFloat(row[4]),
    v: parseFloat(row[5]),
  };
}

async function fetchKlines(interval: Interval, limit = KLINES_LIMIT, signal?: AbortSignal): Promise<Candle[]> {
  const url = `${BINANCE_BASE}/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { signal, cache: 'no-store' });
  if (!res.ok) throw new Error(`klines ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('klines: bad payload');
  return data.map(mapKlineRow);
}

async function fetchTicker(signal?: AbortSignal): Promise<Ticker> {
  const url = `${BINANCE_BASE}/api/v3/ticker/24hr?symbol=BTCUSDT`;
  const res = await fetch(url, { signal, cache: 'no-store' });
  if (!res.ok) throw new Error(`ticker ${res.status}`);
  const d = await res.json();
  return {
    lastPrice:          parseFloat(d.lastPrice),
    priceChange:        parseFloat(d.priceChange),
    priceChangePercent: parseFloat(d.priceChangePercent),
    highPrice:          parseFloat(d.highPrice),
    lowPrice:           parseFloat(d.lowPrice),
    volume:             parseFloat(d.volume),
    quoteVolume:        parseFloat(d.quoteVolume),
    openPrice:          parseFloat(d.openPrice),
  };
}

/**
 * Custom Bar shape that draws a real OHLC candle.
 *
 * Recharts calls this with a rectangle `y..y+height` that spans the
 * [low, high] tuple of the bar's dataKey. We use that rectangle as the
 * *wick span*, then draw the open→close body as a separate centered
 * rect whose height is proportional to its position inside the
 * wick span. This gives us:
 *   - correct wick endpoints (true high & low, not bar baseline)
 *   - body width we control (CANDLE_GAP_PX gap, MIN/MAX_BODY_PX clamps)
 *   - bodies that float inside the wick instead of being nailed to it
 */
function CandleShape(props: BarProps) {
  const { x, y, width, height, payload } = props as any;
  if (!payload || x == null || height == null) return null;

  const up   = payload.c >= payload.o;
  const fill = up ? 'var(--success)' : 'var(--danger)';

  // Recharts gives us the rect for [low, high]; map data→pixels for o & c.
  // Recharts sorts dataKey tuples so [0]=min, [1]=max → y is high, y+height is low.
  const spanTop    = y as number;          // high
  const spanBottom = y + (height as number); // low
  const spanPx     = spanBottom - spanTop;   // total high→low pixel span
  const pxPerUsd   = payload.h !== payload.l ? spanPx / (payload.h - payload.l) : 0;

  const yOpen  = spanBottom - (payload.o - payload.l) * pxPerUsd;
  const yClose = spanBottom - (payload.c - payload.l) * pxPerUsd;

  const bodyTop    = Math.min(yOpen, yClose);
  const bodyBottom = Math.max(yOpen, yClose);
  const bodyHeight = Math.max(1, bodyBottom - bodyTop);

  // Body width: take GAP_FRACTION of the slot off both sides as the gap,
  // with a MIN_GAP_PX floor so dense slots still breathe. Then clamp the
  // remaining room to [MIN_BODY_PX, MAX_BODY_PX].
  const slotWidth = (width as number);
  const gap       = Math.max(MIN_GAP_PX, slotWidth * GAP_FRACTION);
  const bodyRoom  = Math.max(0, slotWidth - gap * 2);
  const bodyWidth = Math.max(MIN_BODY_PX, Math.min(MAX_BODY_PX, bodyRoom));
  const cx        = (x as number) + slotWidth / 2;

  // Use full opacity fill (no 0.9) so the body stands out against the wick.
  return (
    <g>
      <line
        x1={cx} y1={spanTop} x2={cx} y2={spanBottom}
        stroke={fill} strokeWidth={1.25} strokeLinecap="round"
      />
      <rect
        x={cx - bodyWidth / 2}
        y={bodyTop}
        width={bodyWidth}
        height={bodyHeight}
        fill={fill}
        stroke={fill}
        strokeWidth={1}
        rx={1}
      />
    </g>
  );
}

function CandleTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p: Candle = payload[0]?.payload;
  if (!p) return null;
  const up = p.c >= p.o;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 shadow-[var(--shadow-md)] text-[12px] font-mono tabular">
      <div className="text-fg-subtle mb-1.5">{formatTooltipTime(p.t)}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <span className="text-fg-muted">O</span><span className="text-right text-fg">{usd(p.o)}</span>
        <span className="text-fg-muted">H</span><span className="text-right text-fg">{usd(p.h)}</span>
        <span className="text-fg-muted">L</span><span className="text-right text-fg">{usd(p.l)}</span>
        <span className="text-fg-muted">C</span>
        <span className={cn('text-right font-semibold', up ? 'text-success' : 'text-danger')}>{usd(p.c)}</span>
        <span className="text-fg-muted">Vol</span><span className="text-right text-fg-muted">{formatCompact(p.v)} BTC</span>
      </div>
    </div>
  );
}

export function BtcPriceChart({ className, chartHeight = 420 }: { className?: string; chartHeight?: number }) {
  const [interval, setInterval]   = useState<Interval>('15m');
  const [candles,  setCandles]    = useState<Candle[]>([]);
  const [ticker,   setTicker]     = useState<Ticker | null>(null);
  const [loading,  setLoading]    = useState(true);
  const [error,    setError]      = useState<string | null>(null);
  const [tick,     setTick]       = useState(0);   // forces a refetch on retry

  const mountedRef = useRef(true);
  const abortRef   = useRef<AbortController | null>(null);

  const load = useCallback(async (iv: Interval) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const [kl, tk] = await Promise.all([
        fetchKlines(iv, KLINES_LIMIT, ctrl.signal),
        fetchTicker(ctrl.signal),
      ]);
      if (!mountedRef.current || ctrl.signal.aborted) return;
      setCandles(kl);
      setTicker(tk);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      if (!mountedRef.current) return;
      setError(e?.message || 'Binance feed unavailable');
    } finally {
      if (mountedRef.current && !ctrl.signal.aborted) setLoading(false);
    }
  }, []);

  // Initial + interval change.
  useEffect(() => {
    mountedRef.current = true;
    load(interval);
    return () => { mountedRef.current = false; abortRef.current?.abort(); };
  }, [interval, load, tick]);

  // Polling tickers on top of the initial fetch.
  useEffect(() => {
    const idT = window.setInterval(() => {
      if (!mountedRef.current) return;
      fetchTicker().then((tk) => mountedRef.current && setTicker(tk)).catch(() => {});
    }, TICKER_REFRESH_MS);
    const idK = window.setInterval(() => {
      if (!mountedRef.current) return;
      fetchKlines(interval, KLINES_LIMIT)
        .then((kl) => mountedRef.current && setCandles(kl))
        .catch(() => {});
    }, KLINES_REFRESH_MS);
    return () => { window.clearInterval(idT); window.clearInterval(idK); };
  }, [interval]);

  const delta = ticker?.priceChangePercent ?? 0;
  const up    = delta >= 0;
  const openRef = candles.length ? candles[0].o : undefined;

  // Bar gets a [low, high] tuple as its dataKey so Recharts gives us a
  // rectangle spanning true high→low — that's the wick span.
  const candleData = useMemo(
    () => candles.map((c) => ({ ...c, range: [c.l, c.h] as [number, number] })),
    [candles],
  );

  const xTickCount = useMemo(() => {
    // Roughly 6 ticks regardless of interval density.
    if (candles.length < 2) return undefined;
    return Math.max(1, Math.floor(candles.length / 6));
  }, [candles.length]);

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header strip */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between px-5 pt-5 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wider text-fg-muted">
            <Bitcoin className="size-3.5 text-warning" />
            BTC / USDT
            <Badge tone="success" className="ml-1 normal-case tracking-normal">
              <PulseDot tone="success" /> live
            </Badge>
          </div>
          <div className="mt-1.5 flex items-baseline gap-3">
            <div className="text-[34px] md:text-[40px] font-semibold tracking-tight tabular leading-none text-fg">
              {ticker ? formatMoney(ticker.lastPrice, { decimals: 2 }) : <Skeleton className="h-9 w-44" />}
            </div>
            {ticker && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-[13px] font-semibold tabular',
                  up ? 'text-success' : 'text-danger'
                )}
                title={`Change ${ticker.priceChange.toFixed(2)} USD`}
              >
                {up ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                {pct(Math.abs(delta))}
              </span>
            )}
          </div>
          {ticker && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-[12px]">
              <Stat label="24h high"    value={formatMoney(ticker.highPrice, { decimals: 2 })} />
              <Stat label="24h low"     value={formatMoney(ticker.lowPrice,  { decimals: 2 })} />
              <Stat label="24h volume"  value={`${formatCompact(ticker.volume)} BTC`} />
              <Stat label="24h quote"   value={`${formatCompact(ticker.quoteVolume)} USDT`} />
            </div>
          )}
        </div>

        {/* Interval tabs */}
        <div className="inline-flex flex-wrap items-center gap-1 rounded-md border border-border bg-surface-sunk/40 p-1">
          {INTERVALS.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={interval === opt.value ? 'primary' : 'ghost'}
              onClick={() => setInterval(opt.value)}
              className="h-7 px-2.5 text-[12px] font-semibold tabular"
              aria-pressed={interval === opt.value}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="relative px-2 pb-3">
        {loading && candles.length === 0 && <ChartSkeleton />}

        {error && candles.length === 0 && (
          <div className="w-full grid place-items-center" style={{ height: chartHeight }}>
            <div className="text-center">
              <TriangleAlert className="size-6 text-danger mx-auto mb-2" />
              <p className="text-sm font-semibold text-fg">Binance feed unavailable</p>
              <p className="text-xs text-fg-muted mt-1 max-w-xs mx-auto">{error}</p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                leadingIcon={<RefreshCcw className="size-3.5" />}
                onClick={() => setTick((n) => n + 1)}
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {candles.length > 0 && (
          <div className="w-full" style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={candleData}
                margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="2 4" stroke="var(--hairline)" vertical={false} />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(t) => formatXAxis(t as number, interval)}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--fg-subtle)', fontSize: 11 }}
                  interval={xTickCount}
                  minTickGap={32}
                />
                <YAxis
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--fg-subtle)', fontSize: 11 }}
                  width={68}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => '$' + (v as number).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                />
                <Tooltip
                  cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '2 4' }}
                  content={<CandleTooltip />}
                />
                {openRef != null && (
                  <ReferenceLine
                    y={openRef}
                    stroke="var(--fg-subtle)"
                    strokeDasharray="3 4"
                    strokeOpacity={0.5}
                    label={{ value: usd(openRef), position: 'insideTopRight', fill: 'var(--fg-subtle)', fontSize: 10 }}
                  />
                )}
                <Bar
                  dataKey="range"
                  shape={CandleShape as any}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-fg-subtle uppercase tracking-wider text-[10px] font-semibold">{label}</div>
      <div className="text-fg tabular font-semibold">{value}</div>
    </div>
  );
}
