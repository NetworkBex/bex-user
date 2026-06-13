'use client';

import { useEffect, useState } from 'react';
import { Users, ArrowDownToLine, ArrowUpFromLine, TrendingUp, Coins, Wallet } from 'lucide-react';
import { userAPI, transactionAPI, investmentAPI } from '@/lib/api';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader, CardDivider } from '@/components/ui/Card';
import { DataTable, TR, TH, TD, TableEmpty } from '@/components/ui/DataTable';
import { StatusPill } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Progress } from '@/components/ui/Progress';
import { MoneyStatCard, StatCard } from '@/components/dashboard/StatCard';
import { BalanceChart } from '@/components/dashboard/BalanceChart';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatMoney } from '@/lib/ui';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0, totalDeposit: 0, totalWithdraw: 0, totalInvest: 0, totalProfits: 0, totalAccBal: 0,
  });
  const [recentTxns, setRecentTxns] = useState<any[]>([]);
  const [activeInvestments, setActiveInvestments] = useState<any[]>([]);

  useEffect(() => {
    userAPI.list().then((res) => {
      const users = res.data.results || res.data || [];
      setStats((s) => ({ ...s, totalUsers: Array.isArray(users) ? users.length : 0 }));
    }).catch(() => {});

    transactionAPI.list().then((res) => {
      const txns: any[] = res.data.results || res.data || [];
      setRecentTxns(txns.slice(0, 8));
      const td = txns.filter((t: any) => t.type === 'deposit').reduce((s: number, t: any) => s + parseFloat(t.amount || 0), 0);
      const tw = txns.filter((t: any) => t.type === 'withdraw').reduce((s: number, t: any) => s + parseFloat(t.amount || 0), 0);
      setStats((s) => ({ ...s, totalDeposit: td, totalWithdraw: tw }));
    }).catch(() => {});

    investmentAPI.list().then((res) => {
      const invs: any[] = res.data.results || res.data || [];
      setActiveInvestments(invs.filter((i: any) => i.status === 0));
      const ti = invs.reduce((s: number, i: any) => s + parseFloat(i.amount || 0), 0);
      const tp = invs.reduce((s: number, i: any) => s + parseFloat(i.profit_gained || 0), 0);
      setStats((s) => ({ ...s, totalInvest: ti, totalProfits: tp }));
    }).catch(() => {});
  }, []);

  return (
    <>
      <PageHeader
        title="Operations overview"
        description="A real-time picture of platform-wide activity."
        breadcrumb={[{ label: 'Admin' }]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <StatCard      label="Users"      value={stats.totalUsers}                 icon={<Users />} />
        <MoneyStatCard label="Deposits"   value={stats.totalDeposit}               icon={<ArrowDownToLine />} tone="success" />
        <MoneyStatCard label="Withdraws"  value={stats.totalWithdraw}              icon={<ArrowUpFromLine />} tone="danger" />
        <MoneyStatCard label="Invested"   value={stats.totalInvest}                icon={<TrendingUp />} />
        <MoneyStatCard label="Profits"    value={stats.totalProfits}               icon={<Coins />} tone="success" />
        <MoneyStatCard label="Float bal." value={stats.totalAccBal + stats.totalProfits} icon={<Wallet />} tone="info" />
      </div>

      <Card className="mb-6">
        <CardHeader title="Platform volume" description="Aggregated deposits over the last 14 days." />
        <CardBody className="pt-1"><BalanceChart /></CardBody>
      </Card>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
        <Card>
          <CardHeader title={`Active investments (${activeInvestments.length})`} icon={<TrendingUp className="size-4" />} />
          <CardDivider />
          <CardBody className="space-y-3 pt-1">
            {activeInvestments.length === 0 ? (
              <EmptyState icon={<TrendingUp />} title="No active investments" />
            ) : activeInvestments.slice(0, 6).map((inv: any) => {
              const pct = Math.min(100, (parseFloat(inv.profit_gained || 0) / parseFloat(inv.profit || 1)) * 100);
              return (
                <div key={inv.investments_id || inv.id} className="p-3 rounded-lg border border-border bg-surface-sunk/40">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={inv.customer_name || `User #${inv.customer_id}`} size={28} />
                      <div className="min-w-0">
                        <div className="text-sm text-fg font-medium truncate">{inv.customer_name || `User #${inv.customer_id}`}</div>
                        <div className="text-[11px] text-fg-subtle">{inv.plan_name || 'Plan'}</div>
                      </div>
                    </div>
                    <div className="text-sm tabular font-semibold text-success shrink-0">{formatMoney(inv.amount)}</div>
                  </div>
                  <div className="mt-2"><Progress value={pct} tone="accent" /></div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent transactions" />
          <CardDivider />
          <DataTable>
            <thead>
              <tr>
                <TH>ID</TH>
                <TH>User</TH>
                <TH>Type</TH>
                <TH>Status</TH>
                <TH align="right">Amount</TH>
              </tr>
            </thead>
            <tbody>
              {recentTxns.map((txn: any) => (
                <TR key={txn.transaction_id || txn.id}>
                  <TD className="font-mono text-xs text-fg-muted">TNX-{txn.transaction_id || txn.id}</TD>
                  <TD>{txn.customer_name || `#${txn.customer_id}`}</TD>
                  <TD className="capitalize">{txn.type}</TD>
                  <TD><StatusPill status={txn.status} labels={{ 0: 'Pending', 2: 'Processing', 3: 'Completed' }} /></TD>
                  <TD align="right" className="font-medium">{formatMoney(txn.amount)}</TD>
                </TR>
              ))}
              {recentTxns.length === 0 && <TableEmpty colSpan={5}>No transactions.</TableEmpty>}
            </tbody>
          </DataTable>
        </Card>
      </div>
    </>
  );
}
