'use client';

import { useCallback } from 'react';
import { ArrowDownToLine, Check, X } from 'lucide-react';
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

export default function AdminDepositsPage() {
  const { toast } = useToast() || { toast: (() => {}) as any };

  // Server-paginated deposits (type=deposit).
  const deposits = usePagination<any>(
    ({ page, page_size }) => transactionAPI.list({ page, page_size, type: 'deposit' }),
    { initialPageSize: 25 },
  );

  const approve = useCallback(async (id: number) => {
    try {
      await transactionAPI.approve(id);
      toast('Deposit approved');
      deposits.refresh();
    } catch { toast('Failed', 'error'); }
  }, [deposits, toast]);

  const cancel = useCallback(async (id: number) => {
    try {
      await transactionAPI.cancel(id);
      toast('Deposit cancelled');
      deposits.refresh();
    } catch { toast('Failed', 'error'); }
  }, [deposits, toast]);

  return (
    <>
      <PageHeader
        title="Deposits"
        description="Approve, cancel, and audit incoming funds."
        breadcrumb={[{ label: 'Admin', href: '/admin' }, { label: 'Deposits' }]}
      />
      <Card>
        <CardHeader title={`Pending review`} icon={<ArrowDownToLine className="size-4" />} description={`${deposits.total} total`} />
        <CardDivider />
        <DataTable>
          <thead>
            <tr>
              <TH>ID</TH>
              <TH>User</TH>
              <TH align="right">Amount</TH>
              <TH>Status</TH>
              <TH align="right">Date</TH>
              <TH align="right">Actions</TH>
            </tr>
          </thead>
          <tbody>
            {deposits.loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}><td colSpan={6} className="px-5 py-2"><Skeleton mode="pulse" className="h-8 w-full rounded" /></td></tr>
            ))}
            {!deposits.loading && deposits.rows.map((d: any) => (
              <TR key={d.transaction_id || d.id}>
                <TD className="font-mono text-xs text-fg-muted">TNX-{d.transaction_id || d.id}</TD>
                <TD>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={d.customer_name || `User ${d.customer_id}`} size={28} />
                    <span>{d.customer_name || `#${d.customer_id}`}</span>
                  </div>
                </TD>
                <TD align="right" className="font-medium tabular">{formatMoney(d.amount)}</TD>
                <TD><StatusPill status={d.status} labels={{ 0: 'Pending', 1: 'Cancelled', 2: 'Processing', 3: 'Completed', 4: 'Failed' }} /></TD>
                <TD align="right" className="text-fg-subtle text-xs">{shortDate(d.date_created)}</TD>
                <TD align="right">
                  <div className="inline-flex items-center gap-1 justify-end">
                    {d.status !== 3 && (
                      <Button size="sm" variant="accent" leadingIcon={<Check className="size-3.5" />} onClick={() => approve(d.transaction_id || d.id)}>Approve</Button>
                    )}
                    {d.status === 0 && (
                      <Button size="sm" variant="ghost" leadingIcon={<X className="size-3.5" />} onClick={() => cancel(d.transaction_id || d.id)}>Cancel</Button>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
            {!deposits.loading && deposits.rows.length === 0 && <TableEmpty colSpan={6}>Nothing to review.</TableEmpty>}
          </tbody>
        </DataTable>
        <Pagination
          page={deposits.page}
          pageCount={deposits.pageCount}
          total={deposits.total}
          pageSize={deposits.pageSize}
          onPageChange={deposits.setPage}
          onPageSizeChange={deposits.setPageSize}
          loading={deposits.loading}
          itemLabel="deposits"
        />
      </Card>
    </>
  );
}
