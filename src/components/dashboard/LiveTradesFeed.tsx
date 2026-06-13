'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ExternalLink, Filter, TriangleAlert, ChevronDown } from 'lucide-react';
import { hlTradesAPI, parseApiError } from '@/lib/api';
import { PulseDot, Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader, CardDivider } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, TR, TH, TD } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { cn, formatMoney, relativeTime } from '@/lib/ui';

export type HlTrade = {
  id: string;
  coin: string;
  side: 'B' | 'A' | string;
  px: number;
  sz: number;
  notional_usd: number;
  hash: string;
  time_ms: number;
  buyer: string;
  seller: string;
  received_ms?: number;
  explorer_url: string;
};

export type HlStatus = {
  buffer_size: number;
  subscribers: number;
  total_received: number;
  total_emitted: number;
  connected: boolean;
  connected_since: number | null;
  last_message: number | null;
};

const NOTIONAL_OPTIONS = [
  { value: 50_000,  label: '$50k+'  },
  { value: 100_000, label: '$100k+' },
  { value: 250_000, label: '$250k+' },
  { value: 500_000, label: '$500k+' },
];

const POLL_MS = 10_000;

function truncateHash(h: string) {
  if (!h) return '—';
  if (h.length <= 12) return h;
  return `${h.slice(0, 6)}…${h.slice(-4)}`;
}

function formatTimeOfDay(ms: number) {
  if (!ms) return '—';
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toISOString().slice(11, 19) + 'Z';
}

function FeedRowSkeleton({ delay = 0, compact = false }: { delay?: number; compact?: boolean }) {
  return (
    <div
      className={cn(
        'grid items-center gap-2 rounded-md',
        compact ? 'grid-cols-[44px_56px_1fr_1fr_72px_72px] px-2 py-1.5' : 'grid-cols-[44px_56px_1fr_1fr_1fr_80px_72px_28px] px-3 py-2.5'
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="skeleton h-5 w-10 rounded" />
      <span className="skeleton h-4 w-9 rounded-full" />
      <span className="skeleton h-3.5 w-16 ml-auto" />
      <span className="skeleton h-3.5 w-14 ml-auto" />
      {!compact && <span className="skeleton h-3.5 w-20 ml-auto" />}
      <span className={cn('skeleton h-3.5 w-16', compact && 'ml-auto')} />
      <span className={cn('skeleton h-3.5 w-14 ml-auto', compact && 'hidden')} />
      {!compact && <span className="skeleton size-5 rounded ml-auto" />}
    </div>
  );
}

type Props = {
  /** Notional filter. Defaults to $50k. */
  defaultMinNotional?: number;
  /** Cap the visible rows in the table. Defaults to 20 (matches the page). */
  defaultVisible?: number;
  /** Override the scrollable feed height (in px). */
  maxHeight?: number;
  /** Compact mode used in marketing surfaces — drops the notional + size
   *  columns and the explorer icon, fits a smaller card. */
  compact?: boolean;
  className?: string;
};

/**
 * Live HL trade feed — used on the marketing landing hero and (unchanged) on
 * the dedicated /dashboard/trades page. Owns its own polling, skeleton state,
 * notional filter and "load more" pagination.
 */
export function LiveTradesFeed({
  defaultMinNotional = 50_000,
  defaultVisible = 20,
  maxHeight = 560,
  compact = false,
  className,
}: Props) {
  const [trades, setTrades]   = useState<HlTrade[]>([]);
  const [status, setStatus]   = useState<HlStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [minNotional, setMinNotional] = useState<number>(defaultMinNotional);
  const [visible, setVisible] = useState<number>(defaultVisible);

  const mountedRef = useRef(true);
  const minNotionalRef = useRef(minNotional);
  useEffect(() => { minNotionalRef.current = minNotional; }, [minNotional]);

  const load = useCallback(async (minUsd: number) => {
    try {
      const [recentRes, statusRes] = await Promise.all([
        hlTradesAPI.recent({ limit: 50, min_notional_usd: minUsd }),
        hlTradesAPI.status(),
      ]);
      if (!mountedRef.current) return;
      const payload = recentRes.data;
      const rows: HlTrade[] = Array.isArray(payload?.trades)
        ? payload.trades
        : Array.isArray(payload)
          ? payload
          : [];
      setTrades(rows);
      setStatus(statusRes.data);
      setError(null);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(parseApiError(e, 'Could not load Bex AI trades'));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    setVisible(defaultVisible);
    load(minNotional);
    const id = window.setInterval(() => load(minNotionalRef.current), POLL_MS);
    return () => {
      mountedRef.current = false;
      window.clearInterval(id);
    };
  }, [load, minNotional, defaultVisible]);

  const visibleTrades = useMemo(() => trades.slice(0, visible), [trades, visible]);
  const hasMore       = trades.length > visible;

  const isConnected = status?.connected === true;

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title="Bex trades"
        icon={<Activity className="size-4" />}
        description={
          status
            ? `${visibleTrades.length} of ${trades.length} events · ${status.buffer_size} buffered · ${status.total_emitted.toLocaleString()} emitted`
            : `${visibleTrades.length} of ${trades.length} events`
        }
        action={
          <label className="inline-flex items-center gap-1.5 text-[12px] text-fg-muted">
            <Filter className="size-3.5" />
            <select
              value={minNotional}
              onChange={(e) => setMinNotional(Number(e.target.value))}
              className="bg-surface-2 border border-border rounded-md px-2 py-1 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
              aria-label="Minimum notional"
            >
              {NOTIONAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        }
      />
      <CardDivider />

      {error && (
        <div className="mx-5 mt-3 flex items-center gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] text-danger">
          <TriangleAlert className="size-4 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      <CardBody className="p-0 flex-1 min-h-0">
        <div className="overflow-y-auto" style={{ maxHeight }}>
          {loading && (
            <div className="p-2 space-y-1">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <FeedRowSkeleton key={i} delay={i * 60} compact={compact} />
              ))}
            </div>
          )}
          {!loading && trades.length === 0 && (
            <EmptyState
              icon={<Activity />}
              title="Waiting for Bex AI trades"
              description="Trades at or above the selected notional from the bridge will surface here."
            />
          )}
          {trades.length > 0 && (
            <DataTable>
              <thead>
                <tr>
                  <TH>Coin</TH>
                  <TH>Side</TH>
                  <TH align="right">Price</TH>
                  {!compact && <TH align="right">Size</TH>}
                  <TH align="right">Notional</TH>
                  <TH align="right">Time</TH>
                  {!compact && <TH align="right"><span className="sr-only">Explorer</span></TH>}
                </tr>
              </thead>
              <tbody>
                {visibleTrades.map((t) => {
                  const isBuy = t.side === 'B';
                  return (
                    <TR key={t.id}>
                      <TD>
                        <Badge tone="neutral" className="font-mono uppercase">{t.coin}</Badge>
                      </TD>
                      <TD>
                        <span className={cn(
                          'inline-flex items-center gap-1.5 text-[12px] font-semibold tabular',
                          isBuy ? 'text-success' : 'text-danger'
                        )}>
                          <PulseDot tone={isBuy ? 'success' : 'danger'} />
                          {isBuy ? 'BUY' : 'ASK'}
                        </span>
                      </TD>
                      <TD align="right" className="font-mono tabular text-fg">
                        {t.px.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </TD>
                      {!compact && (
                        <TD align="right" className="font-mono tabular text-fg-muted">
                          {t.sz.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </TD>
                      )}
                      <TD align="right" className="font-mono tabular text-fg font-semibold">
                        {formatMoney(t.notional_usd, { decimals: 0 })}
                      </TD>
                      <TD align="right" className="font-mono tabular text-fg-subtle">
                        {formatTimeOfDay(t.time_ms)}
                      </TD>
                      {!compact && (
                        <TD align="right">
                          <a
                            href={t.explorer_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center size-7 rounded-md text-fg-muted hover:text-accent hover:bg-surface-2 transition-colors"
                            title="View on Hyperliquid explorer"
                            aria-label="Open explorer"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        </TD>
                      )}
                    </TR>
                  );
                })}
              </tbody>
            </DataTable>
          )}
          {!loading && trades.length > 0 && hasMore && (
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-hairline text-[12px] text-fg-muted">
              <Button
                size="sm"
                variant="secondary"
                leadingIcon={<ChevronDown className="size-3.5" />}
                onClick={() => setVisible((n) => Math.min(n + 20, trades.length))}
              >
                Load more
              </Button>
            </div>
          )}
        </div>
      </CardBody>

      {status && (
        <div className="px-5 py-2.5 border-t border-hairline text-[11px] text-fg-subtle flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <PulseDot tone={isConnected ? 'success' : 'danger'} />
            <span className="text-fg-muted">{isConnected ? 'HL connected' : 'HL disconnected'}</span>
          </span>
          <span className="text-fg-subtle">·</span>
          <span><span className="text-fg-muted">last msg</span> {status.last_message ? relativeTime(new Date(status.last_message).toISOString()) : '—'}</span>
          {!compact && (
            <>
              <span className="text-fg-subtle">·</span>
              <span><span className="text-fg-muted">received</span> {status.total_received.toLocaleString()}</span>
              <span className="text-fg-subtle">·</span>
              <span><span className="text-fg-muted">subscribers</span> {status.subscribers}</span>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
