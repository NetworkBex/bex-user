'use client';

import { useCallback } from 'react';
import { TrendingUp, X } from 'lucide-react';
import { investmentAPI } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardHeader, CardDivider } from '@/components/ui/Card';
import { DataTable, TR, TH, TD, TableEmpty } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Progress';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { formatMoney } from '@/lib/ui';

export default function AdminInvestmentsPage() {
  const { toast } = useToast() || { toast: (() => {}) as any };

  const investments = usePagination<any>(
    ({ page, page_size }) => investmentAPI.list({ page, page_size }),
    { initialPageSize: 25 },
  );

  const cancel = useCallback(async (id: number) => {
    try { await investmentAPI.cancel(id); toast('Investment cancelled'); investments.refresh(); }
    catch { toast('Failed', 'error'); }
  }, [investments, toast]);

  return (
    <>
      <PageHeader
        title="Investments"
        description="Inspect cycles across the platform."
        breadcrumb={[{ label: 'Admin', href: '/admin' }, { label: 'Investments' }]}
      />
      <Card>
        <CardHeader title={`All cycles`} icon={<TrendingUp className="size-4" />} description={`${investments.total} total`} />
        <CardDivider />
        <DataTable>
          <thead>
            <tr>
              <TH>ID</TH>
              <TH>User</TH>
              <TH>Plan</TH>
              <TH align="right">Stake</TH>
              <TH align="right">Profit</TH>
              <TH>Status</TH>
              <TH align="right">Actions</TH>
            </tr>
          </thead>
          <tbody>
            {investments.loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}><td colSpan={7} className="px-5 py-2"><Skeleton mode="pulse" className="h-8 w-full rounded" /></td></tr>
            ))}
            {!investments.loading && investments.rows.map((inv: any) => (
              <TR key={inv.investments_id || inv.id}>
                <TD className="font-mono text-xs text-fg-muted">{inv.investments_id || inv.id}</TD>
                <TD>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={inv.customer_name || `User ${inv.customer_id}`} size={28} />
                    <span>{inv.customer_name || `#${inv.customer_id}`}</span>
                  </div>
                </TD>
                <TD>{inv.plan_name || inv.name}</TD>
                <TD align="right" className="tabular font-medium">{formatMoney(inv.amount)}</TD>
                <TD align="right" className="tabular text-success font-medium">{formatMoney(inv.profit, { sign: true })}</TD>
                <TD>{inv.status === 0 ? <Badge tone="warning">Active</Badge> : <Badge tone="success">Completed</Badge>}</TD>
                <TD align="right">
                  {inv.status === 0 && (
                    <Button size="sm" variant="ghost" leadingIcon={<X className="size-3.5" />} onClick={() => cancel(inv.investments_id || inv.id)}>Cancel</Button>
                  )}
                </TD>
              </TR>
            ))}
            {!investments.loading && investments.rows.length === 0 && <TableEmpty colSpan={7}>No investments.</TableEmpty>}
          </tbody>
        </DataTable>
        <Pagination
          page={investments.page}
          pageCount={investments.pageCount}
          total={investments.total}
          pageSize={investments.pageSize}
          onPageChange={investments.setPage}
          onPageSizeChange={investments.setPageSize}
          loading={investments.loading}
          itemLabel="investments"
        />
      </Card>
    </>
  );
}
