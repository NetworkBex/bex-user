'use client';

import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from 'react';
import {
  Wallet as WalletIcon, Copy, ExternalLink, RefreshCcw, Search,
  ChevronDown, ChevronRight, ShieldCheck, Network, Coins, Users as UsersIcon,
  Hash, Calendar, Server, Activity, FileText, ExternalLink as LinkIcon,
  Lock, Eye, KeyRound, AlertTriangle, X,
} from 'lucide-react';
import { walletAPI } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardHeader, CardDivider } from '@/components/ui/Card';
import { DataTable, TR, TH, TD } from '@/components/ui/DataTable';
import { Skeleton } from '@/components/ui/Progress';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Field } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePagination } from '@/hooks/usePagination';
import { CHAINS, getBalance, shortAddress } from '@/lib/wallet';
import { formatUsd, getUsdPrices } from '@/lib/prices';
import { cn, formatMoney, shortDate } from '@/lib/ui';

type AdminWallet = {
  id: number;
  customer: number;
  customer_username?: string;
  customer_email?: string;
  currency?: number | null;
  currency_name?: string;
  currency_symbol?: string;
  address: string;
  chain_id: number;
  label?: string | null;
  date_created: string;
  // Custodial seed escrow fields (null on legacy wallets).
  has_seed_escrow?: boolean;
  seed_fingerprint?: string;
  seed_escrowed_at?: string | null;
  seed_reveals_count?: number;
  seed_last_revealed_at?: string | null;
  seed_last_revealed_by?: string;
};

type BalState = {
  /** Native balance as a decimal string (e.g. "0.0421") or null on failure. */
  value: string | null;
  /** When this value was last fetched. */
  fetchedAt: number;
  /** USD value at fetch time, or null if the price feed was unavailable. */
  usd: number | null;
};

type RevealState = {
  loading: boolean;
  /** Plaintext seed, populated after a successful reveal. */
  seed?: { mnemonic: string; private_key: string; fingerprint: string; reveal_count: number; revealed_at: string; revealed_by: string };
  error?: string;
};

export default function AdminWalletsPage() {
  const { toast } = useToast() || { toast: (() => {}) as any };

  // Server-paginated wallets list. Admin tokens see every wallet; customers
  // (not used here) would be scoped to their own by the backend.
  const wallets = usePagination<AdminWallet>(
    ({ page, page_size }) => walletAPI.list({ page, page_size }),
    { initialPageSize: 25 },
  );

  // ─── Filters ────────────────────────────────────────────────────
  const [query, setQuery]   = useState('');
  const [chainFilter, setChainFilter] = useState<number | ''>('');

  // ─── Seed reveal (admin-only, audited) ──────────────────────────
  // Tracks the in-flight reveal for each row so the UI can show a
  // spinner / disabled state and the revealed plaintext stays scoped
  // to one row at a time.
  const [reveal, setReveal] = useState<Record<number, RevealState>>({});
  // The reason prompt + target id live in their own state so a slow
  // network round-trip doesn't block the rest of the UI.
  const [revealPrompt, setRevealPrompt] = useState<{ id: number; reason: string } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return wallets.rows.filter((w) => {
      if (chainFilter !== '' && w.chain_id !== chainFilter) return false;
      if (!q) return true;
      return (
        (w.customer_username || '').toLowerCase().includes(q) ||
        (w.customer_email    || '').toLowerCase().includes(q) ||
        (w.address           || '').toLowerCase().includes(q) ||
        (w.label             || '').toLowerCase().includes(q) ||
        (w.currency_name     || '').toLowerCase().includes(q)
      );
    });
  }, [wallets.rows, query, chainFilter]);

  // ─── Live balances + USD prices ─────────────────────────────────
  const [balances, setBalances]     = useState<Record<string, BalState>>({});
  const [balLoading, setBalLoading] = useState(false);
  const [expanded, setExpanded]     = useState<number | null>(null);

  const refreshBalances = useCallback(async (rows: AdminWallet[]) => {
    if (!rows.length) return;
    setBalLoading(true);
    const CONCURRENCY = 6;
    // Pre-fetch USD prices for the chains we're about to query.
    const uniqueSymbols = Array.from(new Set(
      rows.map((r) => CHAINS[r.chain_id]?.symbol).filter(Boolean) as string[]
    ));
    const usdPrices = await getUsdPrices(uniqueSymbols);

    const next: Record<string, BalState> = {};
    let cursor = 0;
    async function worker() {
      while (cursor < rows.length) {
        const i = cursor++;
        const w = rows[i];
        const chain = CHAINS[w.chain_id];
        const key = `${w.chain_id}:${w.address.toLowerCase()}`;
        try {
          const bal = await getBalance(w.address, w.chain_id);
          const usd = bal != null && chain ? parseFloat(bal) * (usdPrices[chain.symbol] ?? NaN) : null;
          next[key] = { value: bal, fetchedAt: Date.now(), usd: Number.isFinite(usd as number) ? (usd as number) : null };
        } catch {
          next[key] = { value: null, fetchedAt: Date.now(), usd: null };
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rows.length) }, worker));
    setBalances((prev) => ({ ...prev, ...next }));
    setBalLoading(false);
  }, []);

  useEffect(() => {
    refreshBalances(wallets.rows);
  }, [wallets.rows, refreshBalances]);

  // Auto-refresh balances every 60s so the page never goes more than a
  // minute stale while an operator is watching it.
  const refreshRef = useRef(refreshBalances);
  refreshRef.current = refreshBalances;
  const rowsRef = useRef(wallets.rows);
  rowsRef.current = wallets.rows;
  useEffect(() => {
    const id = setInterval(() => refreshRef.current(rowsRef.current), 60_000);
    return () => clearInterval(id);
  }, []);

  // ─── Summary stats ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const chains = new Set<number>();
    const users  = new Set<number>();
    let testnet = 0;
    let last24h = 0;
    const now = Date.now();
    let totalUsd = 0;
    let usdCount = 0;
    for (const w of filtered) {
      chains.add(w.chain_id);
      users.add(w.customer);
      const chain = CHAINS[w.chain_id];
      if (chain?.testnet) testnet += 1;
      const created = new Date(w.date_created).getTime();
      if (now - created < 86_400_000) last24h += 1;
      const bal = balances[`${w.chain_id}:${w.address.toLowerCase()}`];
      if (bal?.usd != null) { totalUsd += bal.usd; usdCount += 1; }
    }
    return {
      total: filtered.length,
      totalAll: wallets.total,
      uniqueUsers: users.size,
      uniqueChains: chains.size,
      testnet,
      last24h,
      totalUsd,
      usdCount,
    };
  }, [filtered, balances, wallets.total]);

  // ─── Actions ────────────────────────────────────────────────────
  const copy = async (text: string, label = 'Copied') => {
    await navigator.clipboard.writeText(text);
    toast(label);
  };

  const requestReveal = (id: number) => setRevealPrompt({ id, reason: '' });
  const cancelReveal  = () => setRevealPrompt(null);

  const submitReveal = async () => {
    if (!revealPrompt) return;
    const { id, reason } = revealPrompt;
    if (!reason.trim()) {
      toast('A reason is required for the audit log', 'error');
      return;
    }
    setRevealPrompt(null);
    setReveal((prev) => ({ ...prev, [id]: { loading: true } }));
    try {
      const res = await walletAPI.revealSeed(id, reason.trim());
      setReveal((prev) => ({ ...prev, [id]: { loading: false, seed: res.data } }));
      // Refresh the table so the new reveal_count / last_revealed_by
      // shows up in the row.
      wallets.refresh();
      toast('Seed revealed — entry written to audit log', 'success');
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Reveal failed';
      setReveal((prev) => ({ ...prev, [id]: { loading: false, error: msg } }));
      toast(msg, 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="Wallets"
        description="Every wallet created or imported on the platform — custodial seed escrow is encrypted on the server. Balances are read live from public RPCs and prices are pulled from CoinGecko."
        breadcrumb={[{ label: 'Admin', href: '/admin' }, { label: 'Wallets' }]}
        actions={
          <Button
            size="sm"
            variant="secondary"
            leadingIcon={<RefreshCcw className="size-3.5" />}
            onClick={() => { wallets.refresh(); refreshBalances(wallets.rows); }}
            loading={balLoading}
          >
            Refresh balances
          </Button>
        }
      />

      {/* ── Summary strip ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard
          icon={<WalletIcon className="size-3.5" />}
          label="Wallets shown"
          value={stats.total.toLocaleString()}
          hint={`of ${stats.totalAll.toLocaleString()} total`}
        />
        <StatCard
          icon={<UsersIcon className="size-3.5" />}
          label="Unique users"
          value={stats.uniqueUsers.toLocaleString()}
          hint={`${stats.last24h} added in 24h`}
        />
        <StatCard
          icon={<Network className="size-3.5" />}
          label="Chains"
          value={stats.uniqueChains.toString()}
          hint={`${stats.testnet} testnet`}
        />
        <StatCard
          icon={<Coins className="size-3.5" />}
          label="Total balance"
          value={stats.usdCount > 0 ? formatUsd(stats.totalUsd, { compact: true }) : '—'}
          hint={stats.usdCount > 0 ? `${stats.usdCount} priced` : 'awaiting prices'}
        />
      </div>

      <Card>
        <CardHeader
          title="Registered wallets"
          icon={<WalletIcon className="size-4" />}
          description="Custodial seed escrow — AES-256-GCM with a per-row scrypt salt. Reveals are audit-logged."
          action={
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none sm:w-[240px]">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search user, email, address…"
                  className="pl-9"
                />
              </div>
              <Field className="w-[140px]">
                <Select
                  value={chainFilter === '' ? '' : String(chainFilter)}
                  onChange={(e) => setChainFilter(e.target.value === '' ? '' : Number(e.target.value))}
                  aria-label="Filter by chain"
                >
                  <option value="">All chains</option>
                  {Object.values(CHAINS).map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.shortName})</option>
                  ))}
                </Select>
              </Field>
            </div>
          }
        />
        <CardDivider />
        <DataTable>
          <thead>
            <tr>
              <TH className="w-8" />
              <TH>Owner</TH>
              <TH>Address</TH>
              <TH>Chain</TH>
              <TH align="right">Balance</TH>
              <TH align="right">Created</TH>
              <TH align="right"><span className="sr-only">Actions</span></TH>
            </tr>
          </thead>
          <tbody>
            {wallets.loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={7} className="px-5 py-2"><Skeleton mode="pulse" className="h-9 w-full rounded" /></td>
              </tr>
            ))}
            {!wallets.loading && filtered.map((w) => {
              const chain = CHAINS[w.chain_id];
              const balKey = `${w.chain_id}:${w.address.toLowerCase()}`;
              const bal = balances[balKey];
              const isOpen = expanded === w.id;
              return (
                <Fragment key={w.id}>
                  <TR
                    onClick={() => setExpanded(isOpen ? null : w.id)}
                    className="cursor-pointer"
                  >
                    <TD>
                      {isOpen ? <ChevronDown className="size-3.5 text-fg-muted" /> : <ChevronRight className="size-3.5 text-fg-subtle" />}
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={w.customer_username || w.customer_email || `#${w.customer}`} size={28} />
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {w.customer_username || `#${w.customer}`}
                          </div>
                          {w.customer_email && (
                            <div className="text-[11px] text-fg-muted truncate">{w.customer_email}</div>
                          )}
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-xs text-fg-muted">{shortAddress(w.address, 8, 6)}</code>
                        <button
                          onClick={(e) => { e.stopPropagation(); copy(w.address, 'Address copied'); }}
                          className="text-fg-subtle hover:text-fg-muted"
                          title="Copy full address"
                          aria-label="Copy address"
                        >
                          <Copy className="size-3.5" />
                        </button>
                        {chain && (
                          <a
                            href={`${chain.explorer}/address/${w.address}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-fg-subtle hover:text-accent"
                            title={`View on ${chain.name}`}
                            aria-label="View on explorer"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        )}
                      </div>
                      {(w.label || w.currency_name) && (
                        <div className="text-[11px] text-fg-subtle mt-0.5 flex items-center gap-1.5">
                          {w.label && <span>{w.label}</span>}
                          {w.label && w.currency_name && <span className="text-fg-subtle/60">·</span>}
                          {w.currency_name && <span>{w.currency_name}{w.currency_symbol ? ` (${w.currency_symbol})` : ''}</span>}
                        </div>
                      )}
                    </TD>
                    <TD>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {chain ? (
                          <Badge tone={chain.testnet ? 'warning' : 'info'}>
                            {chain.shortName} · {chain.id}
                          </Badge>
                        ) : (
                          <Badge tone="neutral">id {w.chain_id}</Badge>
                        )}
                        {w.has_seed_escrow ? (
                          <Badge tone="accent" title="Seed is encrypted on the server (custodial escrow)">
                            <Lock className="size-3" /> sealed
                          </Badge>
                        ) : (
                          <Badge tone="neutral" title="No escrow on file — legacy wallet or escrow was off at create-time">
                            unsealed
                          </Badge>
                        )}
                        {(w.seed_reveals_count ?? 0) > 0 && (
                          <Badge tone="warning" title={`Revealed ${w.seed_reveals_count} time${w.seed_reveals_count === 1 ? '' : 's'} by admin`}>
                            <Eye className="size-3" /> {w.seed_reveals_count}
                          </Badge>
                        )}
                      </div>
                    </TD>
                    <TD align="right" className="tabular">
                      {bal === undefined ? (
                        <Skeleton mode="pulse" className="h-3.5 w-24 rounded ml-auto" />
                      ) : bal.value === null ? (
                        <div className="text-right">
                          <div className="text-fg-subtle text-xs">unreachable</div>
                          <div className="text-[10px] text-fg-subtle">{timeSince(bal.fetchedAt)}</div>
                        </div>
                      ) : (
                        <div className="text-right">
                          <div className="font-semibold">
                            {formatMoney(bal.value, { decimals: 4 })} <span className="text-fg-muted text-xs">{chain?.symbol ?? ''}</span>
                          </div>
                          {bal.usd != null && (
                            <div className="text-[11px] text-fg-muted">≈ {formatUsd(bal.usd)}</div>
                          )}
                          <div className="text-[10px] text-fg-subtle">refreshed {timeSince(bal.fetchedAt)}</div>
                        </div>
                      )}
                    </TD>
                    <TD align="right" className="text-fg-muted text-xs">
                      <div>{shortDate(w.date_created)}</div>
                      <div className="text-[10px] text-fg-subtle">id #{w.id}</div>
                    </TD>
                    <TD align="right">
                      {chain && (
                        <a
                          href={`${chain.explorer}/address/${w.address}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center size-7 rounded-md text-fg-muted hover:text-accent hover:bg-surface-2 transition-colors"
                          title={`Open on ${chain.name} explorer`}
                        >
                          <LinkIcon className="size-3.5" />
                        </a>
                      )}
                    </TD>
                  </TR>
                  {isOpen && (
                    <TR className="bg-surface-sunk/40">
                      <TD colSpan={7} className="px-0">
                        <div className="px-5 py-4 grid md:grid-cols-2 gap-x-8 gap-y-3 border-t border-hairline">
                          <DetailRow icon={<Hash className="size-3.5" />} label="Wallet ID" value={<span className="font-mono">#{w.id}</span>} />
                          <DetailRow icon={<UsersIcon className="size-3.5" />} label="Customer ID" value={<span className="font-mono">#{w.customer}</span>} />
                          <DetailRow
                            icon={<FileText className="size-3.5" />}
                            label="Full address"
                            value={
                              <div className="flex items-center gap-2 min-w-0">
                                <code className="font-mono text-[11px] text-fg break-all">{w.address}</code>
                                <button
                                  onClick={() => copy(w.address, 'Address copied')}
                                  className="text-fg-subtle hover:text-fg-muted shrink-0"
                                  title="Copy"
                                >
                                  <Copy className="size-3.5" />
                                </button>
                              </div>
                            }
                          />
                          <DetailRow
                            icon={<Network className="size-3.5" />}
                            label="Network"
                            value={
                              chain ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge tone={chain.testnet ? 'warning' : 'info'}>
                                    {chain.name} {chain.testnet && '(testnet)'}
                                  </Badge>
                                  <span className="text-[11px] text-fg-muted">chain id {chain.id}</span>
                                </div>
                              ) : <span>Unknown chain #{w.chain_id}</span>
                            }
                          />
                          {chain && (
                            <DetailRow
                              icon={<Server className="size-3.5" />}
                              label="RPC endpoint"
                              value={
                                <div className="flex items-center gap-2 min-w-0">
                                  <code className="font-mono text-[11px] text-fg-muted truncate">{chain.rpc}</code>
                                  <button
                                    onClick={() => copy(chain.rpc, 'RPC copied')}
                                    className="text-fg-subtle hover:text-fg-muted shrink-0"
                                    title="Copy"
                                  >
                                    <Copy className="size-3.5" />
                                  </button>
                                </div>
                              }
                            />
                          )}
                          {chain && (
                            <DetailRow
                              icon={<LinkIcon className="size-3.5" />}
                              label="Explorer"
                              value={
                                <a
                                  href={`${chain.explorer}/address/${w.address}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-accent hover:underline font-mono text-[11px] break-all"
                                >
                                  {chain.explorer}/address/{shortAddress(w.address, 6, 4)}
                                </a>
                              }
                            />
                          )}
                          <DetailRow
                            icon={<Coins className="size-3.5" />}
                            label="Currency"
                            value={
                              w.currency_name ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">{w.currency_name}</span>
                                  {w.currency_symbol && <Badge tone="neutral">{w.currency_symbol}</Badge>}
                                </div>
                              ) : <span className="text-fg-muted">Native gas token</span>
                            }
                          />
                          {w.label && (
                            <DetailRow icon={<FileText className="size-3.5" />} label="Label" value={w.label} />
                          )}
                          <DetailRow
                            icon={<Calendar className="size-3.5" />}
                            label="Registered"
                            value={<span className="text-fg-muted">{new Date(w.date_created).toLocaleString()}</span>}
                          />
                          {bal && (
                            <DetailRow
                              icon={<Activity className="size-3.5" />}
                              label="Last balance refresh"
                              value={
                                <span className="text-fg-muted">
                                  {timeSince(bal.fetchedAt)} ago
                                  {bal.usd != null && bal.value && parseFloat(bal.value) > 0 && (
                                    <> · 1 {chain?.symbol ?? ''} ≈ {formatUsd(bal.usd / parseFloat(bal.value))}</>
                                  )}
                                </span>
                              }
                            />
                          )}
                          <div className="md:col-span-2 mt-1 space-y-3">
                            {/* Custodial escrow summary */}
                            <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-warning/30 bg-warning-soft text-xs text-warning">
                              <KeyRound className="size-3.5 shrink-0" />
                              <span className="flex-1">
                                <span className="font-semibold">Custodial seed escrow.</span>{' '}
                                This wallet&apos;s seed is encrypted on the server with AES-256-GCM
                                (scrypt-derived key, AAD-bound to chain + address). The
                                plaintext can be retrieved via the audited reveal action below.
                              </span>
                            </div>

                            {/* Escrow metadata grid */}
                            <div className="grid sm:grid-cols-2 gap-3 text-xs">
                              <div className="rounded-md border border-border bg-surface p-3">
                                <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">Escrow</div>
                                {w.has_seed_escrow ? (
                                  <div className="mt-1 flex items-center gap-1.5 text-fg">
                                    <Lock className="size-3 text-success" />
                                    <span className="font-semibold">Sealed</span>
                                    {w.seed_escrowed_at && (
                                      <span className="text-fg-muted">· {shortDate(w.seed_escrowed_at)}</span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="mt-1 text-fg-muted">No escrow on file (legacy wallet).</div>
                                )}
                                {w.seed_fingerprint && (
                                  <div className="mt-1.5 font-mono text-fg-subtle">fp: {w.seed_fingerprint}</div>
                                )}
                              </div>
                              <div className="rounded-md border border-border bg-surface p-3">
                                <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">Reveals</div>
                                <div className="mt-1 flex items-baseline gap-2">
                                  <span className="text-2xl font-semibold tabular text-fg">
                                    {w.seed_reveals_count ?? 0}
                                  </span>
                                  <span className="text-fg-muted text-[11px]">total decrypts</span>
                                </div>
                                {w.seed_last_revealed_at && (
                                  <div className="mt-1 text-fg-muted">
                                    Last: {shortDate(w.seed_last_revealed_at)} by{' '}
                                    <span className="font-mono">{w.seed_last_revealed_by || '—'}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Reveal button */}
                            {w.has_seed_escrow && (
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  leadingIcon={<Eye className="size-3.5" />}
                                  onClick={() => requestReveal(w.id)}
                                  loading={reveal[w.id]?.loading}
                                >
                                  Reveal seed (audit-logged)
                                </Button>
                                {reveal[w.id]?.error && (
                                  <span className="text-xs text-danger">{reveal[w.id]?.error}</span>
                                )}
                              </div>
                            )}

                            {/* Revealed seed (in-memory only) */}
                            {reveal[w.id]?.seed && (
                              <div className="rounded-md border border-danger/30 bg-danger-soft p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-danger">
                                    <AlertTriangle className="size-3.5" />
                                    Plaintext seed revealed — handle with care
                                  </div>
                                  <button
                                    onClick={() => setReveal((prev) => ({ ...prev, [w.id]: { loading: false } }))}
                                    className="text-fg-muted hover:text-fg"
                                    title="Hide"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                </div>
                                <div className="text-[11px] text-fg-muted">
                                  Reveal #{reveal[w.id]!.seed!.reveal_count} ·{' '}
                                  {new Date(reveal[w.id]!.seed!.revealed_at).toLocaleString()} ·{' '}
                                  by <span className="font-mono">{reveal[w.id]!.seed!.revealed_by || '—'}</span>
                                </div>
                                <RevealedField
                                  label="Recovery phrase (12 words)"
                                  value={reveal[w.id]!.seed!.mnemonic}
                                  onCopy={(t) => copy(t, 'Mnemonic copied')}
                                />
                                <RevealedField
                                  label="Private key"
                                  value={reveal[w.id]!.seed!.private_key}
                                  onCopy={(t) => copy(t, 'Private key copied')}
                                  mono
                                />
                                <div className="text-[10px] text-fg-muted">
                                  Fingerprint <span className="font-mono">{reveal[w.id]!.seed!.fingerprint}</span> ·{' '}
                                  audit log entry written under <span className="font-mono">wallet.seed_reveal</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </TD>
                    </TR>
                  )}
                </Fragment>
              );
            })}
            {!wallets.loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-0">
                  <EmptyState
                    icon={<WalletIcon />}
                    title={query || chainFilter !== '' ? 'No wallets match these filters' : 'No wallets registered yet'}
                    description={
                      query || chainFilter !== ''
                        ? 'Try clearing the search or chain filter.'
                        : 'Users can create one from the dashboard → Wallet panel.'
                    }
                  />
                </td>
              </tr>
            )}
          </tbody>
        </DataTable>
        <Pagination
          page={wallets.page}
          pageCount={wallets.pageCount}
          total={wallets.total}
          pageSize={wallets.pageSize}
          onPageChange={wallets.setPage}
          onPageSizeChange={wallets.setPageSize}
          loading={wallets.loading}
          itemLabel="wallets"
        />
      </Card>

      {/* Reason prompt — small modal that requires a justification
          before the audited reveal endpoint is called. */}
      {revealPrompt && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
          onMouseDown={(e) => { if (e.target === e.currentTarget) cancelReveal(); }}
        >
          <div className="w-full max-w-md rounded-xl bg-surface border border-border shadow-[var(--shadow-pop)] p-5 animate-rise-in">
            <div className="flex items-center gap-2 text-fg font-semibold">
              <KeyRound className="size-4 text-warning" />
              Reveal seed phrase
            </div>
            <p className="mt-2 text-sm text-fg-muted leading-relaxed">
              This action will decrypt the wallet&apos;s seed bundle on the server and
              write an audit-log entry. The justification is required and is
              visible to other admins.
            </p>
            <div className="mt-4">
              <label className="text-xs font-medium text-fg-muted">Reason (required)</label>
              <Input
                autoFocus
                value={revealPrompt.reason}
                onChange={(e) => setRevealPrompt({ ...revealPrompt, reason: e.target.value })}
                placeholder="e.g. support ticket #4382 — user lost their phrase"
                className="mt-1.5"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={cancelReveal}>Cancel</Button>
              <Button
                onClick={submitReveal}
                loading={reveal[revealPrompt.id]?.loading}
                disabled={!revealPrompt.reason.trim()}
                leadingIcon={<Eye className="size-3.5" />}
              >
                Reveal & log
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function StatCard({
  icon, label, value, hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-fg-muted">
        <span className="text-fg-subtle [&>svg]:size-3.5">{icon}</span>
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tabular tracking-tight text-fg">
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-fg-muted">{hint}</div>}
    </Card>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className="mt-0.5 text-fg-subtle [&>svg]:size-3.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">{label}</div>
        <div className="text-sm text-fg mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function timeSince(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 5_000)    return 'just now';
  if (diff < 60_000)   return `${Math.floor(diff / 1000)}s`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  return `${Math.floor(diff / 3_600_000)}h`;
}

function RevealedField({
  label, value, onCopy, mono,
}: {
  label: string;
  value: string;
  onCopy: (text: string) => void;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">
        <span>{label}</span>
        <button
          onClick={() => onCopy(value)}
          className="inline-flex items-center gap-1 text-fg-muted hover:text-fg normal-case tracking-normal"
        >
          <Copy className="size-3" /> copy
        </button>
      </div>
      <div className={cn(
        'mt-1 px-2.5 py-2 rounded-md bg-surface border border-border text-fg break-words',
        mono ? 'font-mono text-[11px]' : 'text-[13px]'
      )}>
        {value || <span className="text-fg-subtle">(empty)</span>}
      </div>
    </div>
  );
}
