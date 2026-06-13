'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Receipt, Download, Search, Filter, ArrowDownLeft, ArrowUpRight,
  TrendingUp, Wallet, CalendarRange, X, FileText,
} from 'lucide-react';
import { transactionAPI, earningsAPI, authAPI } from '@/lib/api';
import { generateInvoicePdf, generateStatementPdf, methodLabel, type InvoiceCustomer } from '@/lib/invoice';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader, CardDivider } from '@/components/ui/Card';
import { DataTable, TR, TH, TD, TableEmpty } from '@/components/ui/DataTable';
import { StatusPill, Badge, PulseDot } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Progress';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { cn, formatMoney, shortDate, relativeTime } from '@/lib/ui';

type Txn = {
  id: number | string;
  transaction_id?: number | string;
  type: string;
  status?: number;
  amount: number | string;
  date_created: string;
  name?: string;
  method?: string;
  customer_address?: string;
  trans_id?: string;
  code?: string;
  package_id?: string;
  currency_name?: string;
  direction?: 'credit' | 'debit' | 'neutral';
  _source?: 'txn' | 'earning';
};

type Filter = 'all' | 'deposit' | 'withdraw' | 'invest' | 'cashout' | 'commission' | 'earning';

const FILTERS: { value: Filter; label: string; tone: 'accent' | 'success' | 'danger' | 'info' | 'neutral' | 'warning' }[] = [
  { value: 'all',        label: 'All',        tone: 'neutral' },
  { value: 'deposit',    label: 'Deposits',   tone: 'success' },
  { value: 'withdraw',   label: 'Withdrawals',tone: 'warning' },
  { value: 'invest',     label: 'Investments',tone: 'info'    },
  { value: 'cashout',    label: 'Cashouts',   tone: 'accent'  },
  { value: 'commission', label: 'Commissions',tone: 'success' },
  { value: 'earning',    label: 'Earnings',   tone: 'info'    },
];

const TYPE_LABEL: Record<string, string> = {
  deposit:    'Deposit',
  withdraw:   'Withdrawal',
  invest:     'Investment',
  cashout:    'Cashout',
  nft:        'NFT Purchase',
  commission: 'Commission',
  adjustment: 'Adjustment',
  earning:    'Earning credit',
};

export default function TransactionsPage() {
  // Server-paginated lists. The unified activity merges the two
  // server-side pages, so the client-side filter runs *after* pagination
  // (which means the visible page may be smaller than `pageSize` when
  // filters exclude rows).
  const txns = usePagination<any>(
    ({ page, page_size }) => transactionAPI.list({ page, page_size }),
    { initialPageSize: 25 },
  );
  const earnings = usePagination<any>(
    ({ page, page_size }) => earningsAPI.list({ page, page_size }),
    { initialPageSize: 50 },
  );

  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');

  // Customer identity for the PDF invoices — best effort, never blocks
  // the download (falls back to a generic bill-to block).
  const [customer, setCustomer] = useState<InvoiceCustomer>({ name: 'BEX customer', email: '' });
  useEffect(() => {
    authAPI.me().then((res) => {
      const c = res.data?.customer ?? res.data ?? {};
      setCustomer({
        name: c.fullname || c.username || 'BEX customer',
        email: c.email || '',
      });
    }).catch(() => {});
  }, []);

  // Unified activity list = transactions + earnings credits.
  const activity = useMemo<Txn[]>(() => {
    const txnRows: Txn[] = txns.rows.map((t: any) => ({ ...t, _source: 'txn' as const }));
    const earningRows: Txn[] = earnings.rows.map((e: any) => ({
      id: `e-${e.id}`,
      type: 'earning',
      amount: parseFloat(String(e.amount)) || 0,
      date_created: e.period_date || e.created_at,
      name: e.investment_name || e.plan_name,
      direction: 'credit' as const,
      _source: 'earning' as const,
    }));
    return [...txnRows, ...earningRows].sort(
      (a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime(),
    );
  }, [txns.rows, earnings.rows]);

  const loading = txns.loading || earnings.loading;

  // Filtered + searched view.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activity.filter((t) => {
      // Type filter
      if (filter !== 'all' && t.type !== filter) return false;
      // Date filter
      if (from) {
        const d = new Date(t.date_created);
        if (d < new Date(from)) return false;
      }
      if (to) {
        const d = new Date(t.date_created);
        // include the whole "to" day
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      // Search
      if (q) {
        const hay = [
          String(t.id),
          t.transaction_id ? `TNX-${t.transaction_id}` : '',
          t.trans_id ?? '',
          t.name ?? '',
          t.method ?? '',
          t.customer_address ?? '',
          t.code ?? '',
          t.package_id ?? '',
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [activity, filter, from, to, search]);

  // Totals for the stat strip — over the currently-loaded page. The user
  // can paginate forward to see the rest, and the per-type filter pills
  // let them focus on a specific kind. To show lifetime totals across
  // all pages, the user would use Export CSV; we deliberately don't
  // aggregate server-side here to keep the page responsive.
  const totals = useMemo(() => {
    let in_  = 0, out = 0, invested = 0, earned = 0;
    for (const t of activity) {
      const v = parseFloat(String(t.amount)) || 0;
      if (t.type === 'deposit')    in_ += v;
      if (t.type === 'withdraw')   out += v;
      if (t.type === 'invest')     invested += v;
      if (t.type === 'earning')    earned += v;
    }
    return { in_, out, invested, earned };
  }, [activity]);

  // Per-filter counts (used as a small badge on each pill). Approximated
  // from the current page; the cap of `total` keeps the "All" badge honest.
  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all:        txns.total + earnings.total,
      deposit:    0, withdraw: 0, invest: 0, cashout: 0, commission: 0, earning: 0,
    };
    for (const t of activity) {
      if (t.type in c) (c as any)[t.type] += 1;
    }
    return c;
  }, [activity, txns.total, earnings.total]);

  const clearFilters = () => {
    setFilter('all');
    setSearch('');
    setFrom('');
    setTo('');
  };

  const hasActiveFilter = filter !== 'all' || search || from || to;

  // Export the current filtered view to CSV.
  const exportCsv = () => {
    const rows = [
      ['Date', 'Type', 'Description', 'Status', 'Direction', 'Amount', 'Currency', 'Reference', 'Method'],
      ...filtered.map((t) => [
        new Date(t.date_created).toISOString(),
        TYPE_LABEL[t.type] ?? t.type,
        t.name ?? '',
        t.status != null ? String(t.status) : '',
        t.direction ?? '',
        String(t.amount),
        t.currency_name ?? '',
        t.trans_id ?? (t.transaction_id ? `TNX-${t.transaction_id}` : ''),
        t.method ?? '',
      ]),
    ];
    const csv = rows.map((r) =>
      r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bex-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Transactions"
        description="A unified ledger of every deposit, withdrawal, investment, cashout, commission, and earning credit on your account."
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Transactions' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" leadingIcon={<Download className="size-4" />} onClick={exportCsv} disabled={filtered.length === 0}>
              Export CSV
            </Button>
            <Button
              variant="secondary"
              leadingIcon={<FileText className="size-4" />}
              onClick={() => generateStatementPdf(filtered, customer, {
                filterLabel: FILTERS.find((f) => f.value === filter)?.label,
                from: from || undefined,
                to: to || undefined,
              })}
              disabled={filtered.length === 0}
            >
              Export PDF
            </Button>
          </div>
        }
      />

      {/* Stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatTile
          icon={<ArrowDownLeft className="size-4" />}
          label="Total deposited"
          value={totals.in_}
          tone="success"
        />
        <StatTile
          icon={<ArrowUpRight className="size-4" />}
          label="Total withdrawn"
          value={totals.out}
          tone="warning"
        />
        <StatTile
          icon={<Wallet className="size-4" />}
          label="Net invested"
          value={totals.invested}
          tone="info"
        />
        <StatTile
          icon={<TrendingUp className="size-4" />}
          label="Earnings credits"
          value={totals.earned}
          tone="accent"
        />
      </div>

      {/* Filter bar */}
      <Card className="mb-4">
        <CardBody className="space-y-3 py-4">
          {/* Type pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((f) => {
              const active = filter === f.value;
              const n = counts[f.value];
              return (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[12px] font-semibold transition-colors',
                    active
                      ? 'bg-fg text-fg-inverse border-fg'
                      : 'bg-surface text-fg-muted border-border hover:text-fg hover:border-border-strong',
                  )}
                  aria-pressed={active}
                >
                  {f.label}
                  <span className={cn(
                    'tabular text-[10px] px-1.5 rounded-full',
                    active ? 'bg-fg-inverse/20 text-fg-inverse' : 'bg-surface-2 text-fg-muted',
                  )}>
                    {n}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search + date range */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-fg-subtle pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by ID, hash, address, plan…"
                className="pl-8 h-9 text-[13px]"
              />
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-fg-muted">
              <CalendarRange className="size-3.5" />
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 px-2 rounded-md border border-border bg-surface-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
                aria-label="From date"
              />
              <span>→</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 px-2 rounded-md border border-border bg-surface-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
                aria-label="To date"
              />
            </div>
            {hasActiveFilter && (
              <Button
                size="sm"
                variant="ghost"
                leadingIcon={<X className="size-3.5" />}
                onClick={clearFilters}
              >
                Clear
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Ledger table */}
      <Card>
        <CardHeader
          title={`Ledger (${filtered.length}${filtered.length !== activity.length ? ` of ${activity.length}` : ''})`}
          icon={<Receipt className="size-4" />}
        />
        <CardDivider />
        <DataTable>
          <thead>
            <tr>
              <TH>ID</TH>
              <TH>Type</TH>
              <TH>Description</TH>
              <TH>Status</TH>
              <TH align="right">Direction</TH>
              <TH align="right">Amount</TH>
              <TH align="right">Date</TH>
              <TH align="right"><span className="sr-only">Invoice</span></TH>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}><td colSpan={8} className="px-5 py-2"><Skeleton mode="pulse" className="h-8 w-full rounded" /></td></tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    icon={activity.length === 0 ? <Receipt /> : <Filter />}
                    title={activity.length === 0 ? 'No transactions yet' : 'No matching activity'}
                    description={
                      activity.length === 0
                        ? 'Your deposits, withdrawals, and investment activity will surface here as soon as you make your first transaction.'
                        : 'Try widening the date range or clearing the active filter.'
                    }
                    action={
                      activity.length > 0 && hasActiveFilter ? (
                        <Button size="sm" variant="secondary" onClick={clearFilters}>Clear filters</Button>
                      ) : undefined
                    }
                  />
                </td>
              </tr>
            )}
            {!loading && filtered.map((t) => {
              const id = t.transaction_id || t.trans_id || t.id;
              const isEarning = t._source === 'earning';
              const direction = t.direction ?? (t.type === 'deposit' || t.type === 'cashout' || t.type === 'commission' ? 'credit'
                                              : t.type === 'withdraw' || t.type === 'invest' ? 'debit' : 'neutral');
              const amount = parseFloat(String(t.amount)) || 0;
              return (
                <TR key={String(t.id)}>
                  <TD className="font-mono text-[11px] text-fg-muted whitespace-nowrap">
                    {isEarning ? `CR-${t.id}` : `TNX-${id}`}
                  </TD>
                  <TD>
                    <TypeBadge type={t.type} />
                  </TD>
                  <TD>
                    <div className="min-w-0">
                      {t.name && <div className="text-fg text-[13px] truncate max-w-[260px]">{t.name}</div>}
                      <div className="text-[11px] text-fg-subtle truncate max-w-[260px]">
                        <span>{methodLabel(t)}</span>
                        {t.code ? <span> · code {t.code}</span> : null}
                        {t.customer_address ? <span className="font-mono"> · {shortAddress(t.customer_address)}</span> : null}
                      </div>
                    </div>
                  </TD>
                  <TD>
                    {isEarning ? (
                      <Badge tone="success"><PulseDot tone="success" /> auto</Badge>
                    ) : t.status != null ? (
                      <StatusPill status={t.status} labels={{ 0: 'Pending', 1: 'Cancelled', 2: 'Processing', 3: 'Completed', 4: 'Failed' }} />
                    ) : '—'}
                  </TD>
                  <TD align="right">
                    {direction === 'credit'
                      ? <Badge tone="success">credit</Badge>
                      : direction === 'debit'
                        ? <Badge tone="warning">debit</Badge>
                        : <Badge tone="neutral">—</Badge>}
                  </TD>
                  <TD align="right" className={cn(
                    'tabular font-semibold',
                    direction === 'credit' ? 'text-success' : direction === 'debit' ? 'text-fg' : 'text-fg-muted',
                  )}>
                    {direction === 'credit' ? '+' : direction === 'debit' ? '−' : ''}{formatMoney(amount, { decimals: 2 })}
                  </TD>
                  <TD align="right" className="text-[11px] text-fg-subtle whitespace-nowrap">
                    <div>{shortDate(t.date_created)}</div>
                    <div className="text-fg-subtle">{relativeTime(new Date(t.date_created).toISOString())}</div>
                  </TD>
                  <TD align="right">
                    <button
                      type="button"
                      onClick={() => generateInvoicePdf(t, customer)}
                      className="inline-flex items-center justify-center size-7 rounded-md text-fg-muted hover:text-accent hover:bg-surface-2 transition-colors"
                      title="Download invoice (PDF)"
                      aria-label="Download invoice"
                    >
                      <FileText className="size-3.5" />
                    </button>
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </DataTable>
        <Pagination
          page={txns.page}
          pageCount={Math.max(txns.pageCount, earnings.pageCount)}
          total={txns.total + earnings.total}
          pageSize={txns.pageSize}
          onPageChange={(p) => { txns.setPage(p); earnings.setPage(p); }}
          onPageSizeChange={(s) => { txns.setPageSize(s as any); earnings.setPageSize(50 as any); }}
          loading={loading}
        />
      </Card>
    </>
  );
}

function StatTile({
  icon, label, value, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'success' | 'warning' | 'info' | 'accent';
}) {
  const toneClass: Record<string, string> = {
    success: 'text-success',
    warning: 'text-warning',
    info:    'text-info',
    accent:  'text-accent-fg',
  };
  return (
    <div className="p-4 rounded-xl border border-border bg-surface">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-fg-muted inline-flex items-center gap-1.5">
        <span className="text-fg-subtle">{icon}</span>
        {label}
      </div>
      <div className={cn('mt-1.5 text-[24px] font-semibold tracking-tight tabular leading-tight', toneClass[tone])}>
        {formatMoney(value, { decimals: 2 })}
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; tone: 'success' | 'warning' | 'info' | 'accent' | 'neutral' }> = {
    deposit:    { label: 'Deposit',     tone: 'success' },
    withdraw:   { label: 'Withdrawal',  tone: 'warning' },
    invest:     { label: 'Investment',  tone: 'info'    },
    cashout:    { label: 'Cashout',     tone: 'accent'  },
    nft:        { label: 'NFT',         tone: 'neutral' },
    commission: { label: 'Commission',  tone: 'success' },
    adjustment: { label: 'Adjustment',  tone: 'neutral' },
    earning:    { label: 'Earning',     tone: 'info'    },
  };
  const cfg = map[type] ?? { label: type, tone: 'neutral' as const };
  return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
}

function shortAddress(a: string) {
  if (!a) return '';
  if (a.length <= 14) return a;
  return `${a.slice(0, 8)}…${a.slice(-6)}`;
}
