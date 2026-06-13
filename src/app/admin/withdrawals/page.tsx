'use client';

import { useCallback } from 'react';
import { ArrowUpFromLine, Check, X } from 'lucide-react';
import { transactionAPI } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardHeader, CardDivider } from '@/components/ui/Card';
import { DataTable, TR, TH, TD, TableEmpty } from '@/components/ui/DataTable';
import { StatusPill } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Progress';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { formatMoney, shortDate } from '@/lib/ui';

export default function AdminWithdrawalsPage() {
  const { toast } = useToast() || { toast: (() => {}) as any };

  const withdrawals = usePagination<any>(
    ({ page, page_size }) => transactionAPI.list({ page, page_size, type: 'withdraw' }),
    { initialPageSize: 25 },
  );

  const approve = useCallback(async (id: number) => {
    try { await transactionAPI.approve(id); toast('Withdrawal approved'); withdrawals.refresh(); }
    catch { toast('Failed', 'error'); }
  }, [withdrawals, toast]);

  const cancel = useCallback(async (id: number) => {
    try { await transactionAPI.cancel(id); toast('Withdrawal cancelled'); withdrawals.refresh(); }
    catch { toast('Failed', 'error'); }
  }, [withdrawals, toast]);

  return (
    <>
      <PageHeader
        title="Withdrawals"
        description="Approve outbound transfers — double-check the destination address."
        breadcrumb={[{ label: 'Admin', href: '/admin' }, { label: 'Withdrawals' }]}
      />
      <Card>
        <CardHeader title={`Pending review`} icon={<ArrowUpFromLine className="size-4" />} description={`${withdrawals.total} total`} />
        <CardDivider />
        <DataTable>
          <thead>
            <tr>
              <TH>ID</TH>
              <TH>User</TH>
              <TH align="right">Amount</TH>
              <TH>Destination</TH>
              <TH>Status</TH>
              <TH align="right">Date</TH>
              <TH align="right">Actions</TH>
            </tr>
          </thead>
          <tbody>
            {withdrawals.loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}><td colSpan={7} className="px-5 py-2"><Skeleton mode="pulse" className="h-8 w-full rounded" /></td></tr>
            ))}
            {!withdrawals.loading && withdrawals.rows.map((w: any) => (
              <TR key={w.transaction_id || w.id}>
                <TD className="font-mono text-xs text-fg-muted">TNX-{w.transaction_id || w.id}</TD>
                <TD>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={w.customer_name || `User ${w.customer_id}`} size={28} />
                    <span>{w.customer_name || `#${w.customer_id}`}</span>
                  </div>
                </TD>
                <TD align="right" className="font-medium tabular">{formatMoney(w.amount)}</TD>
                <TD className="font-mono text-xs text-fg-muted max-w-[180px] truncate">{w.customer_address}</TD>
                <TD><StatusPill status={w.status} labels={{ 0: 'Pending', 1: 'Cancelled', 2: 'Processing', 3: 'Completed', 4: 'Failed' }} /></TD>
                <TD align="right" className="text-fg-subtle text-xs">{shortDate(w.date_created)}</TD>
                <TD align="right">
                  <div className="inline-flex items-center gap-1 justify-end">
                    {w.status !== 3 && (
                      <Button size="sm" variant="accent" leadingIcon={<Check className="size-3.5" />} onClick={() => approve(w.transaction_id || w.id)}>Approve</Button>
                    )}
                    {w.status === 0 && (
                      <Button size="sm" variant="ghost" leadingIcon={<X className="size-3.5" />} onClick={() => cancel(w.transaction_id || w.id)}>Cancel</Button>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
            {!withdrawals.loading && withdrawals.rows.length === 0 && <TableEmpty colSpan={7}>Nothing to review.</TableEmpty>}
          </tbody>
        </DataTable>
        <Pagination
          page={withdrawals.page}
          pageCount={withdrawals.pageCount}
          total={withdrawals.total}
          pageSize={withdrawals.pageSize}
          onPageChange={withdrawals.setPage}
          onPageSizeChange={withdrawals.setPageSize}
          loading={withdrawals.loading}
          itemLabel="withdrawals"
        />
      </Card>
    </>
  );
}
