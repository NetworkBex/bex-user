'use client';

import { useEffect, useState } from 'react';
import { Plus, TrendingUp, Sparkles, Coins } from 'lucide-react';
import { investmentAPI, coreAPI, earningsAPI } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader, CardDivider } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Progress';
import { DataTable, TR, TH, TD, TableEmpty } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { BalanceChart, BalanceChartSkeleton } from '@/components/dashboard/BalanceChart';
import { InvestmentCycleCard } from '@/components/dashboard/InvestmentCycleCard';
import { StartCycleDialog } from '@/components/dashboard/StartCycleDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { usePagination } from '@/hooks/usePagination';
import { formatMoney, shortDate } from '@/lib/ui';

interface EarningCredit {
  id: number;
  investment: number;
  investment_name?: string | null;
  plan_name?: string | null;
  period_date: string;
  percent: string;
  amount: string;
  stake_at_credit: string;
  profit_after: string;
  balance_after: string;
  created_at: string;
}

interface EarningsSummary {
  today: number;
  last_30_days: number;
  lifetime: number;
  credits_count: number;
  series: Array<{ date: string; usd: number }>;
}

export default function InvestmentsPage() {
  // Three paginated lists: active cycles, completed cycles, and the
  // daily earnings ledger. Each lives on its own page cursor.
  const activeList = usePagination<any>(
    ({ page, page_size }) => investmentAPI.list({ page, page_size, active: 1 }),
    { initialPageSize: 12 },
  );
  const completedList = usePagination<any>(
    ({ page, page_size }) => investmentAPI.list({ page, page_size, status: 1 }),
    { initialPageSize: 12 },
  );
  const earningsList = usePagination<EarningCredit>(
    ({ page, page_size }) => earningsAPI.list({ page, page_size }),
    { initialPageSize: 25 },
  );

  const [plans, setPlans] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [loadingEarnings, setLoadingEarnings] = useState(true);

  const { toast } = useToast() || { toast: (() => {}) as any };

  // One-shot loads for plans, currencies, and the 30-day summary (these
  // are tiny reference datasets and don't need pagination).
  useEffect(() => {
    coreAPI.investPlans().then(setPlans).catch(() => {});
    coreAPI.currencies().then(setCurrencies).catch(() => {});
    setLoadingEarnings(true);
    earningsAPI.summary().then((res) => setSummary(res.data as EarningsSummary)).catch(() => setSummary(null)).finally(() => setLoadingEarnings(false));
  }, []);

  const refreshAll = () => {
    activeList.refresh();
    completedList.refresh();
    earningsList.refresh();
  };

  // Cashout asks for reconfirmation first — the card click only selects
  // the target cycle; the API call happens in executeCashout.
  const [cashoutTarget, setCashoutTarget] = useState<any | null>(null);
  const [cashoutLoading, setCashoutLoading] = useState(false);

  const executeCashout = async () => {
    if (!cashoutTarget) return;
    setCashoutLoading(true);
    try {
      await investmentAPI.cashout(cashoutTarget.investments_id || cashoutTarget.id);
      toast('Cycle cashed out');
      setCashoutTarget(null);
      refreshAll();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Cashout failed', 'error');
    } finally { setCashoutLoading(false); }
  };

  // Active / done slices now come from their own paginated queries.
  const active = activeList.rows;
  const done   = completedList.rows;

  // Recharts-friendly transform for the 30-day earnings series.
  const chartData = summary?.series?.map((p) => ({ label: p.date.slice(5), value: p.usd })) ?? undefined;

  return (
    <>
      <PageHeader
        title="Investments"
        description="Structured access cycles. Earnings credit daily — 5–10% per month, drawn fresh each day."
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Investments' }]}
        actions={<Button leadingIcon={<Plus className="size-4" />} onClick={() => setShowForm(true)}>New cycle</Button>}
      />

      {/* Earnings overview strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryStat label="Today"          value={summary?.today}        loading={loadingEarnings} tone="success" />
        <SummaryStat label="Last 30 days"   value={summary?.last_30_days} loading={loadingEarnings} />
        <SummaryStat label="Lifetime"       value={summary?.lifetime}     loading={loadingEarnings} />
        <SummaryStat label="Credits posted" value={summary?.credits_count} loading={loadingEarnings} integer />
      </div>

      {/* Earnings chart */}
      <Card className="mb-6">
        <CardHeader title="Earnings — last 30 days" icon={<Coins className="size-4" />} description="Auto-credited daily by the BEX earnings engine." />
        <CardBody className="pt-1">
          {loadingEarnings ? <BalanceChartSkeleton /> : <BalanceChart data={chartData} tone="success" />}
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader title="Active cycles" icon={<TrendingUp className="size-4" />} description={`${activeList.total} running`} />
        <CardBody className="pt-1">
          {active.length === 0 && !activeList.loading ? (
            <EmptyState
              icon={<Sparkles />}
              title="No active cycles"
              description="Start a cycle and pick a plan — execution begins immediately."
              action={<Button size="sm" leadingIcon={<Plus className="size-4" />} onClick={() => setShowForm(true)}>New cycle</Button>}
            />
          ) : (
            <>
              {activeList.loading && active.length === 0 && (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} mode="pulse" className="h-44 w-full rounded-xl" />)}
                </div>
              )}
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                {active.map((inv: any) => (
                  <InvestmentCycleCard
                    key={inv.investments_id || inv.id}
                    cycle={inv}
                    onCashout={() => setCashoutTarget(inv)}
                    cashoutVariant="secondary"
                  />
                ))}
              </div>
            </>
          )}
          {activeList.total > activeList.pageSize && (
            <Pagination
              page={activeList.page}
              pageCount={activeList.pageCount}
              total={activeList.total}
              pageSize={activeList.pageSize}
              onPageChange={activeList.setPage}
              onPageSizeChange={activeList.setPageSize}
              loading={activeList.loading}
              className="border-t-0 px-0"
              itemLabel="cycles"
            />
          )}
        </CardBody>
      </Card>

      {/* Daily earnings ledger */}
      <Card className="mb-6">
        <CardHeader
          title="Daily earnings ledger"
          icon={<Coins className="size-4" />}
          description={`${earningsList.total} credits`}
        />
        <CardDivider />
        <DataTable>
          <thead>
            <tr>
              <TH>Date</TH>
              <TH>Cycle</TH>
              <TH align="right">Stake</TH>
              <TH align="right">Rate</TH>
              <TH align="right">Credited</TH>
              <TH align="right">Balance after</TH>
            </tr>
          </thead>
          <tbody>
            {earningsList.loading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}><td colSpan={6} className="px-5 py-2"><Skeleton mode="pulse" className="h-8 w-full rounded" /></td></tr>
            ))}
            {!earningsList.loading && earningsList.rows.map((e) => (
              <TR key={e.id}>
                <TD className="text-fg-muted">{shortDate(e.period_date)}</TD>
                <TD>{e.investment_name || e.plan_name || `#${e.investment}`}</TD>
                <TD align="right" className="tabular">{formatMoney(e.stake_at_credit)}</TD>
                <TD align="right" className="tabular text-accent font-medium">{Number(e.percent).toFixed(4)}%</TD>
                <TD align="right" className="tabular text-success font-medium">{formatMoney(e.amount, { sign: true })}</TD>
                <TD align="right" className="tabular text-fg-muted">{formatMoney(e.balance_after)}</TD>
              </TR>
            ))}
            {!earningsList.loading && earningsList.rows.length === 0 && (
              <TableEmpty colSpan={6}>
                No earnings yet — credits post automatically each day for every active cycle.
              </TableEmpty>
            )}
          </tbody>
        </DataTable>
        <Pagination
          page={earningsList.page}
          pageCount={earningsList.pageCount}
          total={earningsList.total}
          pageSize={earningsList.pageSize}
          onPageChange={earningsList.setPage}
          onPageSizeChange={earningsList.setPageSize}
          loading={earningsList.loading}
          itemLabel="credits"
        />
      </Card>

      <Card>
        <CardHeader title="Completed cycles" description={`${completedList.total} settled`} />
        <CardDivider />
        <DataTable>
          <thead>
            <tr>
              <TH>Plan</TH>
              <TH align="right">Stake</TH>
              <TH align="right">Profit</TH>
              <TH align="right">Settled</TH>
            </tr>
          </thead>
          <tbody>
            {completedList.loading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}><td colSpan={4} className="px-5 py-2"><Skeleton mode="pulse" className="h-8 w-full rounded" /></td></tr>
            ))}
            {!completedList.loading && done.map((inv: any) => (
              <TR key={inv.investments_id || inv.id}>
                <TD>{inv.plan_name || inv.name}</TD>
                <TD align="right" className="tabular">{formatMoney(inv.amount)}</TD>
                <TD align="right" className="tabular text-success font-medium">{formatMoney(inv.profit_gained, { sign: true })}</TD>
                <TD align="right" className="text-fg-muted text-xs">{shortDate(inv.date_created)}</TD>
              </TR>
            ))}
            {!completedList.loading && done.length === 0 && <TableEmpty colSpan={4}>No completed cycles yet.</TableEmpty>}
          </tbody>
        </DataTable>
        <Pagination
          page={completedList.page}
          pageCount={completedList.pageCount}
          total={completedList.total}
          pageSize={completedList.pageSize}
          onPageChange={completedList.setPage}
          onPageSizeChange={completedList.setPageSize}
          loading={completedList.loading}
          itemLabel="cycles"
        />
      </Card>

      <StartCycleDialog
        open={showForm}
        onClose={() => setShowForm(false)}
        plans={plans}
        currencies={currencies}
        onSuccess={refreshAll}
      />

      <ConfirmDialog
        open={!!cashoutTarget}
        onClose={() => setCashoutTarget(null)}
        onConfirm={executeCashout}
        loading={cashoutLoading}
        title="Confirm cashout"
        confirmLabel="Confirm cashout"
        rows={cashoutTarget ? [
          { label: 'Cycle', value: cashoutTarget.plan_name || cashoutTarget.name || 'Cycle' },
          { label: 'Stake', value: formatMoney(parseFloat(cashoutTarget.amount) || 0, { decimals: 2 }) },
          { label: 'Profit earned', value: formatMoney(parseFloat(cashoutTarget.profit_gained) || 0, { sign: true, decimals: 2 }) },
          { label: 'Total to credit', value: formatMoney((parseFloat(cashoutTarget.amount) || 0) + (parseFloat(cashoutTarget.profit_gained) || 0), { decimals: 2 }) },
        ] : []}
        note="This settles the cycle permanently — stake plus earned profit returns to your balance and the cycle stops earning."
      />
    </>
  );
}

function SummaryStat({
  label, value, loading, tone, integer,
}: {
  label: string;
  value: number | undefined;
  loading?: boolean;
  tone?: 'success';
  integer?: boolean;
}) {
  return (
    <div className="p-4 rounded-lg border border-border bg-surface">
      <div className="text-[12px] uppercase tracking-wider text-fg-muted font-semibold">{label}</div>
      <div className={`mt-1.5 text-[22px] font-semibold tracking-tight tabular leading-tight ${tone === 'success' ? 'text-success' : 'text-fg'}`}>
        {loading
          ? <Skeleton mode="pulse" className="h-6 w-16 rounded" />
          : value == null
            ? <span className="text-fg-muted">—</span>
            : integer
              ? value.toLocaleString()
              : formatMoney(value, value > 0 && tone === 'success' ? { sign: true } : {})}
      </div>
    </div>
  );
}
