'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

// Dashboard is fully data-driven (auth-gated, live earnings, live HL trades
// on the sibling page) — opt out of static prerender to avoid SSG pitfalls
// like the SSR tree calling hooks whose provider isn't mounted at build time.
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import {
  Wallet, ArrowDownToLine, ArrowUpFromLine, Users, Sparkles,
  Copy, ChevronRight, ShieldCheck, Coins, TrendingUp, Trophy, Receipt,
} from 'lucide-react';
import { authAPI, transactionAPI, investmentAPI, userAPI, earningsAPI } from '@/lib/api';
import { Badge, StatusPill } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardDivider } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DataTable, TR, TH, TD, TableEmpty } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Progress, Skeleton, PageSpinner } from '@/components/ui/Progress';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ToastProvider';
import { PageHeader } from '@/components/layout/AppShell';
import { useAmbassador } from '@/components/ambassador/AmbassadorProvider';
import { MoneyStatCard, StatCard } from '@/components/dashboard/StatCard';
import {
  AnnouncementCard,
  type Announcement,
} from '@/components/dashboard/AnnouncementCard';
import { AnnouncementSkeleton } from '@/components/dashboard/AnnouncementSkeleton';
import {
  EarningsBarChart, type BarPoint, type EarningsRange, bucketByDay, bucketByMonth, pickBucket,
} from '@/components/dashboard/EarningsBarChart';
import { InvestmentCycleCard, type InvestmentCycle } from '@/components/dashboard/InvestmentCycleCard';
import { coreAPI } from '@/lib/api';
import { cn, formatMoney, shortDate } from '@/lib/ui';

interface EarningsSummary {
  today: number;
  last_30_days: number;
  lifetime: number;
  credits_count: number;
  series: Array<{ date: string; usd: number }>;
}
interface EarningCredit {
  id: number;
  investment: number;
  investment_name?: string | null;
  plan_name?: string | null;
  period_date: string;
  percent: string;
  amount: string;
}
interface EarningRow {
  id: number;
  investment: number;
  investment_name?: string | null;
  plan_name?: string | null;
  period_date: string;
  percent: string;
  amount: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [investments, setInvestments] = useState<InvestmentCycle[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalDeposit: 0, totalWithdraw: 0 });
  const [loading, setLoading] = useState(true);

  // Earnings state
  const [summary,  setSummary]  = useState<EarningsSummary | null>(null);
  const [earnings, setEarnings] = useState<EarningCredit[]>([]);
  const [loadingEarnings, setLoadingEarnings] = useState(true);

  // Earnings bar chart
  const [range, setRange] = useState<EarningsRange>('month');
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null);
  const [barData, setBarData] = useState<BarPoint[]>([]);
  const [barLoading, setBarLoading] = useState(true);

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [featured, setFeatured] = useState<Announcement | null>(null);

  const { plan, me } = useAmbassador();
  const { toast } = useToast() || { toast: (() => {}) as any };

  // ─── Initial load ──────────────────────────────────────────────
  useEffect(() => {
    authAPI.me().then((res) => setUser(res.data.customer)).catch(() => {});
    transactionAPI.list({ type: 'deposit' }).then((res) => setDeposits(res.data.results || res.data)).catch(() => {});
    investmentAPI.list().then((res) => setInvestments(res.data.results || res.data)).catch(() => {});
    userAPI.referrals().then((res) => setReferrals(res.data?.results || res.data || [])).catch(() => {});
    transactionAPI.list().then((res) => {
      const txns: any[] = res.data.results || res.data || [];
      const td = txns.filter((t: any) => t.type === 'deposit' && t.status === 3).reduce((s: number, t: any) => s + parseFloat(t.amount || 0), 0);
      const tw = txns.filter((t: any) => t.type === 'withdraw').reduce((s: number, t: any) => s + parseFloat(t.amount || 0), 0);
      setStats((s) => ({ ...s, totalDeposit: td, totalWithdraw: tw }));
    }).catch(() => {}).finally(() => setLoading(false));

    earningsAPI.summary().then((res) => setSummary(res.data as EarningsSummary)).catch(() => setSummary(null));
    earningsAPI.list().then((res) => setEarnings(((res.data?.results ?? res.data) as EarningCredit[]).slice(0, 6))).catch(() => setEarnings([])).finally(() => setLoadingEarnings(false));

    coreAPI.announcements().then((res) => {
      // Defensive: the endpoint returns a DRF paginated envelope
      // ({ count, next, previous, results: [...] }) or a bare array
      // depending on the backend version — handle both.
      const data = res.data;
      const list: Announcement[] = Array.isArray(data)
        ? (data as Announcement[])
        : Array.isArray((data as any)?.results)
          ? ((data as any).results as Announcement[])
          : [];
      setAnnouncements(list);
      setFeatured(list[0] ?? null);
    }).catch(() => {
      setAnnouncements([]);
      setFeatured(null);
    });
  }, []);

  // ─── Earnings bar-chart data (per range) ───────────────────────
  const buildBarFromSummary = useCallback((s: EarningsSummary | null, r: EarningsRange): BarPoint[] => {
    if (!s) return [];
    if (r === 'today') {
      return [{ label: 'Today', sub: new Date().toISOString().slice(0, 10), value: s.today }];
    }
    if (r === 'week') {
      // Last 7 entries of the 30-day series
      const last7 = s.series.slice(-7);
      return last7.map((p) => ({ label: p.date.slice(8), sub: p.date, value: p.usd }));
    }
    if (r === 'month') {
      return s.series.map((p) => ({ label: p.date.slice(8), sub: p.date, value: p.usd }));
    }
    return []; // year / custom handled by direct fetch
  }, []);

  const fetchBar = useCallback(async (r: EarningsRange, custom?: { from: string; to: string } | null) => {
    setBarLoading(true);
    try {
      if (r === 'year') {
        const res = await earningsAPI.list({});
        const rows: EarningRow[] = (res.data?.results ?? res.data) as EarningRow[];
        setBarData(bucketByMonth(rows));
        return;
      }
      if (r === 'custom' && custom?.from && custom?.to) {
        const fromD = new Date(custom.from);
        const toD   = new Date(custom.to);
        const res = await earningsAPI.list({ period_date__gte: custom.from, period_date__lte: custom.to });
        const rows: EarningRow[] = (res.data?.results ?? res.data) as EarningRow[];
        const bucket = pickBucket(fromD, toD);
        if (bucket === 'day' || bucket === 'hour') {
          setBarData(bucketByDay(rows));
        } else {
          setBarData(bucketByMonth(rows));
        }
        return;
      }
      setBarData(buildBarFromSummary(summary, r));
    } catch {
      setBarData([]);
    } finally {
      setBarLoading(false);
    }
  }, [summary, buildBarFromSummary]);

  useEffect(() => { fetchBar(range, customRange); }, [range, customRange, fetchBar]);

  // ─── Computed ──────────────────────────────────────────────────
  const rank = useMemo(() => {
    const order = ['Beginner','Voyager','Navigator','Commander','Starlord','Celestial','Quantum Elite','BEX Titan'];
    const tiers = [0, 10_000, 20_000, 50_000, 100_000, 200_000, 500_000, 1_000_000];
    let current = order[0]; let min = 0;
    for (let i = 0; i < tiers.length; i++) {
      if (stats.totalDeposit >= tiers[i]) { current = order[i]; min = tiers[i]; }
    }
    const nextIdx = Math.min(order.length - 1, order.indexOf(current) + 1);
    const next = order[nextIdx];
    const nextMin = tiers[nextIdx];
    return {
      current, min, next, nextMin,
      progress: nextMin > min ? Math.min(100, ((stats.totalDeposit - min) / (nextMin - min)) * 100) : 100,
    };
  }, [stats.totalDeposit]);

  const referralLink = useMemo(() => (
    typeof window !== 'undefined' && user
      ? `${window.location.origin}/auth/register?ref=${user.referrer_id}`
      : ''
  ), [user]);

  const copyReferral = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    toast('Referral link copied');
  };

  // Cashout asks for reconfirmation first — the card click only selects
  // the target cycle; the API call happens in executeCashout.
  const [cashoutTarget, setCashoutTarget] = useState<any | null>(null);
  const [cashoutLoading, setCashoutLoading] = useState(false);

  const executeCashout = async () => {
    if (!cashoutTarget) return;
    setCashoutLoading(true);
    try {
      await investmentAPI.cashout(cashoutTarget.id);
      toast('Cycle cashed out');
      setCashoutTarget(null);
      const res = await investmentAPI.list();
      setInvestments(res.data.results || res.data);
    } catch (err: any) {
      toast(err.response?.data?.error || 'Cashout failed', 'error');
    } finally { setCashoutLoading(false); }
  };

  const activeCycles = useMemo(
    () => (investments || []).filter((c) => c.status === 0 || c.status === undefined).slice(0, 4),
    [investments],
  );

  const activeStake = useMemo(
    () => (investments || [])
      .filter((c) => c.status === 0 || c.status === undefined)
      .reduce((s, c) => s + (parseFloat(String(c.amount)) || 0), 0),
    [investments],
  );

  // ─── Render ────────────────────────────────────────────────────
  if (loading && !user) {
    return <PageSpinner label="Loading dashboard…" className="min-h-[60vh]" />;
  }

  return (
    <>
      <PageHeader
        title={user ? <>Welcome back, <span className="text-gradient">{user.username}</span></> : 'Welcome back'}
        description="Here's how your money is working today."
      />

      {/* ── HERO: balance + featured event ───────────────────────── */}
      <div className="grid lg:grid-cols-[1.55fr_1.45fr] gap-6 mb-6">
        {/* Balance hero */}
        <Card className="relative overflow-hidden">
          {/* Decorative accent glow */}
          <div aria-hidden className="pointer-events-none absolute -top-28 -right-20 size-72 rounded-full bg-accent/15 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 size-64 rounded-full bg-accent/10 blur-3xl" />

          <div className="relative p-5 md:p-6 flex flex-col h-full">
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-fg-muted">
                <Wallet className="size-3.5 text-accent" /> Total balance
              </div>
              <div className="flex items-center gap-1.5">
                <Badge tone="accent"><Trophy className="size-3" /> {rank.current}</Badge>
                <Badge tone="success"><ShieldCheck className="size-3" /> Verified</Badge>
              </div>
            </div>

            <div className="mt-3 text-[42px] md:text-[48px] font-semibold tabular tracking-tight leading-none text-fg">
              {user
                ? formatMoney(parseFloat(user.acc_balance || '0'), { decimals: 2 })
                : <Skeleton mode="pulse" className="h-11 w-52 rounded" />}
            </div>
            <div className="mt-2 text-[13px] text-fg-muted">
              {summary
                ? <>
                    <span className="text-success font-medium tabular">{formatMoney(summary.today, { sign: true })}</span> earned today
                    <span className="text-fg-subtle"> · </span>
                    <span className="tabular">{formatMoney(summary.last_30_days)}</span> in the last 30 days
                  </>
                : <Skeleton mode="pulse" className="h-4 w-56 rounded" />}
            </div>

            {/* Primary actions, folded into the hero */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link href="/dashboard/deposit"><Button size="sm" leadingIcon={<ArrowDownToLine className="size-4" />}>Deposit</Button></Link>
              <Link href="/dashboard/withdrawal"><Button size="sm" variant="secondary" leadingIcon={<ArrowUpFromLine className="size-4" />}>Withdraw</Button></Link>
              <Link href="/dashboard/investments"><Button size="sm" variant="secondary" leadingIcon={<Sparkles className="size-4" />}>New cycle</Button></Link>
              <Link href="/dashboard/transactions"><Button size="sm" variant="ghost" leadingIcon={<Receipt className="size-4" />}>Transactions</Button></Link>
            </div>

            {/* Earnings minis */}
            <div className="mt-auto pt-5">
              <div className="grid grid-cols-3 divide-x divide-hairline rounded-lg border border-hairline bg-surface-sunk/40">
                <HeroMini label="Earned today" value={summary?.today} tone="success" />
                <HeroMini label="Last 30 days" value={summary?.last_30_days} />
                <HeroMini label="Lifetime" value={summary?.lifetime} />
              </div>
            </div>
          </div>
        </Card>

        {/* Featured announcement */}
        {featured ? (
          <AnnouncementCard
            announcement={featured}
            siblings={announcements ?? []}
            compact
            me={me}
            plan={plan}
          />
        ) : (
          <AnnouncementSkeleton />
        )}
      </div>

      {/* ── STAT STRIP ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MoneyStatCard label="Active stake"  value={activeStake}          icon={<TrendingUp />} tone="accent" hint={`${activeCycles.length} cycle${activeCycles.length === 1 ? '' : 's'} running`} />
        <MoneyStatCard label="Deposited"     value={stats.totalDeposit}   icon={<ArrowDownToLine />} hint={`${deposits.length} deposit${deposits.length === 1 ? '' : 's'}`} />
        <MoneyStatCard label="Withdrawn"     value={stats.totalWithdraw}  icon={<ArrowUpFromLine />} hint="lifetime" />
        <StatCard      label="Referrals"     value={referrals.length}     icon={<Users />} hint="multi-level commissions" />
      </div>

      {/* ── EARNINGS CHART + RANK / REFERRAL SIDE COLUMN ─────────── */}
      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6 mb-6">
        <Card>
          <CardHeader
            title="Earnings"
            icon={<BarChartIcon />}
            description={`Range: ${range === 'custom' && customRange ? `${customRange.from} → ${customRange.to}` : range}`}
            action={
              <Link href="/dashboard/investments" className="text-xs text-fg-muted hover:text-fg inline-flex items-center gap-1">
                Full ledger <ChevronRight className="size-3.5" />
              </Link>
            }
          />
          <CardDivider />
          <CardBody className="pt-1">
            <EarningsBarChart
              data={barData}
              range={range}
              customRange={customRange ?? undefined}
              onRangeChange={(r, custom) => {
                setRange(r);
                if (r === 'custom' && custom) setCustomRange(custom);
                if (r !== 'custom') setCustomRange(null);
              }}
              loading={barLoading && barData.length === 0}
            />
          </CardBody>
        </Card>

        <div className="flex flex-col gap-6">
          {/* Rank progress */}
          <Card>
            <CardHeader
              title="Rank progress"
              icon={<Trophy className="size-4" />}
              description="Driven by your completed deposits."
            />
            <CardDivider />
            <CardBody className="pt-1 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-semibold text-fg">{rank.current}</span>
                <span className="text-[11px] text-fg-muted">next · {rank.next}</span>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-fg-muted mb-1.5">
                  <span className="tabular">{formatMoney(stats.totalDeposit)}</span>
                  <span className="tabular">{formatMoney(rank.nextMin)}</span>
                </div>
                <Progress value={rank.progress} tone="accent" />
              </div>
              <Link href="/dashboard/investments">
                <Button variant="secondary" size="sm" trailingIcon={<ChevronRight className="size-3.5" />}>
                  Advance rank
                </Button>
              </Link>
            </CardBody>
          </Card>

          {/* Referral link */}
          <Card className="flex-1">
            <CardHeader
              title="Invite & earn"
              icon={<Users className="size-4" />}
              description="Multi-level commissions on every invitee deposit."
            />
            <CardDivider />
            <CardBody className="pt-1 space-y-2">
              <Input readOnly value={referralLink} className="font-mono text-xs" />
              <div className="flex items-center justify-between gap-2">
                <Button size="sm" onClick={copyReferral} leadingIcon={<Copy className="size-4" />}>Copy link</Button>
                <span className="text-[11px] text-fg-muted tabular">{referrals.length} joined so far</span>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* ── ACTIVE CYCLES + RECENT EARNINGS ──────────────────────── */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 mb-6">
        <Card>
          <CardHeader
            title="Active cycles"
            icon={<TrendingUp className="size-4" />}
            description={`${activeCycles.length} running`}
            action={
              <Link href="/dashboard/investments" className="text-xs text-fg-muted hover:text-fg inline-flex items-center gap-1">
                View all <ChevronRight className="size-3.5" />
              </Link>
            }
          />
          <CardDivider />
          <CardBody className="pt-1">
            {activeCycles.length === 0 ? (
              <EmptyState
                icon={<Sparkles />}
                title="No active cycles"
                description="Start one to begin earning."
                action={<Link href="/dashboard/investments"><Button size="sm">Start a cycle</Button></Link>}
              />
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {activeCycles.map((inv) => (
                  <InvestmentCycleCard
                    key={inv.id}
                    cycle={inv}
                    onCashout={() => setCashoutTarget(inv)}
                    cashoutVariant="primary"
                  />
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Recent earnings"
            icon={<Coins className="size-4" />}
            description="Last 6 daily credits."
          />
          <CardDivider />
          <DataTable>
            <thead>
              <tr>
                <TH>Date</TH>
                <TH>Cycle</TH>
                <TH align="right">Rate</TH>
                <TH align="right">Credited</TH>
              </tr>
            </thead>
            <tbody>
              {loadingEarnings && (
                <tr><td colSpan={4} className="p-5"><Skeleton mode="pulse" className="h-12 w-full rounded-md" /></td></tr>
              )}
              {!loadingEarnings && earnings.map((e) => (
                <TR key={e.id}>
                  <TD className="text-fg-muted">{shortDate(e.period_date)}</TD>
                  <TD>{e.investment_name || e.plan_name || `#${e.investment}`}</TD>
                  <TD align="right" className="tabular text-accent font-medium">{Number(e.percent).toFixed(4)}%</TD>
                  <TD align="right" className="tabular text-success font-medium">{formatMoney(e.amount, { sign: true })}</TD>
                </TR>
              ))}
              {!loadingEarnings && earnings.length === 0 && (
                <TableEmpty colSpan={4}>No earnings yet — credits land here once your first cycle is active.</TableEmpty>
              )}
            </tbody>
          </DataTable>
        </Card>
      </div>

      {/* ── TEAM SUMMARY ─────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader
          title="Your team"
          icon={<Users className="size-4" />}
          description={`${referrals.length} direct ${referrals.length === 1 ? 'partner' : 'partners'}`}
          action={
            <Link href="/dashboard/ambassador/team" className="text-xs text-fg-muted hover:text-fg inline-flex items-center gap-1">
              View team <ChevronRight className="size-3.5" />
            </Link>
          }
        />
        <CardDivider />
        <CardBody className="pt-1">
          {referrals.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title="No partners yet"
              description="Share your referral link to start building your team and earning multi-level commissions."
              action={<Link href="/dashboard/ambassador"><Button size="sm">Open ambassador hub</Button></Link>}
            />
          ) : (
            <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-start">
              <div className="flex gap-5">
                <TeamStat label="Direct partners" value={referrals.length} />
                <TeamStat label="Active" value={referrals.filter((r: any) => r.status === 1).length} tone="success" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-fg-muted mb-1.5">Recent partners</div>
                <ul className="divide-y divide-hairline">
                  {referrals.slice(0, 5).map((r: any, i: number) => (
                    <li key={r.id || r.customer_id || i} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-[13px] text-fg truncate">{r.fullname || r.username || 'Partner'}</span>
                      <span className="text-[11px] text-fg-subtle shrink-0 tabular">{shortDate(r.date_created)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── RECENT DEPOSITS ──────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Recent deposits"
          description="Last 5 transactions to your wallet."
          icon={<ArrowDownToLine className="size-4" />}
          action={
            <Link href="/dashboard/transactions" className="text-xs text-fg-muted hover:text-fg inline-flex items-center gap-1">
              View all <ChevronRight className="size-3.5" />
            </Link>
          }
        />
        <CardDivider />
        <DataTable>
          <thead>
            <tr>
              <TH>ID</TH>
              <TH>Status</TH>
              <TH align="right">Amount</TH>
              <TH align="right">Date</TH>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="p-5"><Skeleton mode="pulse" className="h-12 w-full rounded-md" /></td></tr>
            )}
            {!loading && deposits.slice(0, 5).map((dep: any) => (
              <TR key={dep.transaction_id || dep.id}>
                <TD className="font-mono text-xs text-fg-muted">TNX-{dep.transaction_id || dep.id}</TD>
                <TD><StatusPill status={dep.status} labels={{ 0: 'Pending', 2: 'Processing', 3: 'Completed' }} /></TD>
                <TD align="right" className="font-medium">{formatMoney(dep.amount)}</TD>
                <TD align="right" className="text-fg-muted text-xs">{shortDate(dep.date_created)}</TD>
              </TR>
            ))}
            {!loading && deposits.length === 0 && (
              <TableEmpty colSpan={4}>No deposits yet — funds appear here after on-chain confirmation.</TableEmpty>
            )}
          </tbody>
        </DataTable>
      </Card>

      <ConfirmDialog
        open={!!cashoutTarget}
        onClose={() => setCashoutTarget(null)}
        onConfirm={executeCashout}
        loading={cashoutLoading}
        title="Confirm cashout"
        confirmLabel="Confirm cashout"
        rows={cashoutTarget ? [
          { label: 'Cycle', value: cashoutTarget.plan_name || cashoutTarget.name || 'Cycle' },
          { label: 'Stake', value: formatMoney(parseFloat(String(cashoutTarget.amount)) || 0, { decimals: 2 }) },
          { label: 'Profit earned', value: formatMoney(parseFloat(String(cashoutTarget.profit_gained)) || 0, { sign: true, decimals: 2 }) },
          { label: 'Total to credit', value: formatMoney((parseFloat(String(cashoutTarget.amount)) || 0) + (parseFloat(String(cashoutTarget.profit_gained)) || 0), { decimals: 2 }) },
        ] : []}
        note="This settles the cycle permanently — stake plus earned profit returns to your balance and the cycle stops earning."
      />
    </>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────── */

function TeamStat({ label, value, tone }: { label: string; value: number; tone?: 'success' }) {
  return (
    <div>
      <div className={cn('text-[28px] font-semibold tabular leading-none', tone === 'success' ? 'text-success' : 'text-fg')}>
        {value.toLocaleString()}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-wider font-semibold text-fg-muted">{label}</div>
    </div>
  );
}

function HeroMini({ label, value, tone }: { label: string; value: number | undefined; tone?: 'success' }) {
  return (
    <div className="px-4 py-3">
      <div className="text-fg-muted text-[10px] uppercase tracking-wider font-semibold">{label}</div>
      <div className={cn('mt-0.5 tabular font-semibold text-[15px]', tone === 'success' ? 'text-success' : 'text-fg')}>
        {value == null
          ? <Skeleton mode="pulse" className="h-4 w-16 rounded" />
          : formatMoney(value, { decimals: value >= 1000 ? 0 : 2 })}
      </div>
    </div>
  );
}

function BarChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="12" y1="20" x2="12" y2="10"/>
      <line x1="18" y1="20" x2="18" y2="4"/>
      <line x1="6"  y1="20" x2="6"  y2="14"/>
    </svg>
  );
}
