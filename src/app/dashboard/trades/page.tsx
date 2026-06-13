'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, BarChart3, ExternalLink, Filter, TriangleAlert, ChevronDown } from 'lucide-react';
import { hlTradesAPI, coreAPI, parseApiError } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader, CardDivider } from '@/components/ui/Card';
import { PulseDot, Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, TR, TH, TD, TableEmpty } from '@/components/ui/DataTable';
import { BtcPriceChart } from '@/components/dashboard/BtcPriceChart';
import { InvestPlansSection } from '@/components/dashboard/InvestPlansSection';
import { StartCycleDialog } from '@/components/dashboard/StartCycleDialog';
import { Button } from '@/components/ui/Button';
import { cn, formatMoney, relativeTime } from '@/lib/ui';

type HlTrade = {
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

type HlStatus = {
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

/**
 * Skeleton row that mirrors the real trade row layout (8 columns), with
 * hand-picked widths so the list looks like a real ledger, not 6 identical
 * bars. Staggered shimmer delay makes the feed feel alive.
 */
function FeedRowSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="grid grid-cols-[44px_56px_1fr_1fr_1fr_80px_72px_28px] items-center gap-2 px-3 py-2.5 rounded-md"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="skeleton h-5 w-10 rounded" />
      <span className="skeleton h-4 w-9 rounded-full" />
      <span className="skeleton h-3.5 w-16 ml-auto" />
      <span className="skeleton h-3.5 w-14 ml-auto" />
      <span className="skeleton h-3.5 w-20 ml-auto" />
      <span className="skeleton h-3.5 w-16" />
      <span className="skeleton h-3.5 w-14 ml-auto" />
      <span className="skeleton size-5 rounded ml-auto" />
    </div>
  );
}

export default function TradesPage() {
  const [trades, setTrades]   = useState<HlTrade[]>([]);
  const [status, setStatus]   = useState<HlStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [minNotional, setMinNotional] = useState<number>(50_000);
  /** How many of the buffered trades to show — the buffer is bounded at 50
   *  so the "load more" pattern is the right fit (not server pagination). */
  const [visible, setVisible] = useState<number>(20);

  // Plan tiers + start-cycle dialog state (plans shared with the dialog).
  const [plans, setPlans] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [cycleDialogOpen, setCycleDialogOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | string | null>(null);

  const { toast } = useToast() || { toast: (() => {}) as any };

  const mountedRef = useRef(true);
  const minNotionalRef = useRef(minNotional);
  useEffect(() => { minNotionalRef.current = minNotional; }, [minNotional]);

  useEffect(() => {
    coreAPI.investPlans().then(setPlans).catch(() => {}).finally(() => setPlansLoading(false));
    coreAPI.currencies().then(setCurrencies).catch(() => {});
  }, []);

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
    setVisible(20); // reset on filter change
    load(minNotional);
    const id = window.setInterval(() => load(minNotionalRef.current), POLL_MS);
    return () => {
      mountedRef.current = false;
      window.clearInterval(id);
    };
  }, [load, minNotional]);

  const visibleTrades = useMemo(() => trades.slice(0, visible), [trades, visible]);
  const hasMore       = trades.length > visible;

  const isConnected = status?.connected === true;

  return (
    <>
      <PageHeader
        title="Live trades"
        description="Real-time Bex AI trades from the bridge."
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Live trades' }]}
        actions={
          <Badge tone={isConnected ? 'success' : 'danger'}>
            <PulseDot tone={isConnected ? 'success' : 'danger'} />
            {isConnected ? 'HL connected' : 'HL disconnected'}
          </Badge>
        }
      />

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] text-danger">
          <TriangleAlert className="size-4 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* BTC chart card */}
        <Card className="overflow-hidden">
          <CardHeader
            title="BTC / USDT"
            icon={<BarChart3 className="size-4" />}
            description="Live BTC candlesticks · Live trades shown right"
          />
          <CardDivider />
          <CardBody className="p-0">
            <BtcPriceChart />
          </CardBody>
        </Card>

        {/* HL trades feed card */}
        <Card>
          <CardHeader
            title="Bex trades"
            icon={<Activity className="size-4" />}
            description={
              status
                ? `Showing ${visibleTrades.length} of ${trades.length} events · ${status.buffer_size} buffered · ${status.total_emitted.toLocaleString()} emitted`
                : `Showing ${visibleTrades.length} of ${trades.length} events`
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
          <div className="max-h-[560px] overflow-y-auto">
            {loading && (
              <div className="p-3 space-y-1">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <FeedRowSkeleton key={i} delay={i * 60} />
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
                    <TH align="right">Size</TH>
                    <TH align="right">Notional</TH>
                    <TH>Hash</TH>
                    <TH align="right">Time</TH>
                    <TH align="right"><span className="sr-only">Explorer</span></TH>
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
                        <TD align="right" className="font-mono tabular text-fg-muted">
                          {t.sz.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </TD>
                        <TD align="right" className="font-mono tabular text-fg font-semibold">
                          {formatMoney(t.notional_usd, { decimals: 0 })}
                        </TD>
                        <TD className="font-mono text-fg-subtle" title={t.hash}>
                          {truncateHash(t.hash)}
                        </TD>
                        <TD align="right" className="font-mono tabular text-fg-subtle">
                          {formatTimeOfDay(t.time_ms)}
                        </TD>
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
                      </TR>
                    );
                  })}
                </tbody>
              </DataTable>
            )}
            {/* Load-more footer — the HL feed is a bounded 50-row buffer,
                so a true server pager doesn't apply. */}
            {!loading && trades.length > 0 && (
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-hairline text-[12px] text-fg-muted">
                <span className="tabular">
                  Showing {visibleTrades.length} of {trades.length} events
                </span>
                <div className="flex items-center gap-2">
                  {hasMore && (
                    <Button
                      size="sm"
                      variant="secondary"
                      leadingIcon={<ChevronDown className="size-3.5" />}
                      onClick={() => setVisible((n) => Math.min(n + 20, trades.length))}
                    >
                      Load more
                    </Button>
                  )}
                  {visible > 20 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setVisible(20)}
                    >
                      Collapse
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
          {status && (
            <div className="px-5 py-2.5 border-t border-hairline text-[11px] text-fg-subtle flex flex-wrap items-center gap-x-3 gap-y-1">
              <span><span className="text-fg-muted">last msg</span> {status.last_message ? relativeTime(new Date(status.last_message).toISOString()) : '—'}</span>
              <span className="text-fg-subtle">·</span>
              <span><span className="text-fg-muted">received</span> {status.total_received.toLocaleString()}</span>
              <span className="text-fg-subtle">·</span>
              <span><span className="text-fg-muted">subscribers</span> {status.subscribers}</span>
            </div>
          )}
        </Card>
      </div>

      {/* Access tiers — start an investment cycle straight from the feed. */}
      <div className="mt-6">
        <InvestPlansSection
          plans={plans}
          loading={plansLoading}
          onStart={(planId) => {
            setSelectedPlanId(planId);
            setCycleDialogOpen(true);
          }}
        />
      </div>

      <StartCycleDialog
        open={cycleDialogOpen}
        onClose={() => setCycleDialogOpen(false)}
        plans={plans}
        currencies={currencies}
        initialPlanId={selectedPlanId}
        onSuccess={() => toast('Track your cycle under Investments')}
      />
    </>
  );
}
