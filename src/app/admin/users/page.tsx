'use client';

import { useMemo, useState } from 'react';
import { Users, Search, Wallet, ShieldCheck, ShieldAlert, Pencil } from 'lucide-react';
import { userAPI } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardHeader, CardDivider } from '@/components/ui/Card';
import { DataTable, TR, TH, TD, TableEmpty } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Progress';
import { Pagination } from '@/components/ui/Pagination';
import { Dialog } from '@/components/ui/Dialog';
import { Field, Select } from '@/components/ui/Input';
import { usePagination } from '@/hooks/usePagination';
import { formatMoney } from '@/lib/ui';

export default function AdminUsersPage() {
  const [query, setQuery] = useState('');
  const [adjustTarget, setAdjustTarget] = useState<any | null>(null);
  const [adjAmount, setAdjAmount] = useState('');
  const [adjType, setAdjType] = useState<'credit' | 'debit'>('credit');
  const { toast } = useToast() || { toast: (() => {}) as any };

  // Server-paginated users list. Client-side search runs *over the
  // current page only*; the search box + pagination let the admin
  // navigate to find any specific user.
  const users = usePagination<any>(
    ({ page, page_size }) => userAPI.list({ page, page_size }),
    { initialPageSize: 25 },
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users.rows;
    return users.rows.filter((u: any) =>
      (u.username || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
    );
  }, [users.rows, query]);

  const suspend = async (id: number) => {
    try { await userAPI.suspend(id); toast('User suspended'); users.refresh(); }
    catch { toast('Failed', 'error'); }
  };
  const activate = async (id: number) => {
    try { await userAPI.activate(id); toast('User activated'); users.refresh(); }
    catch { toast('Failed', 'error'); }
  };
  const submitAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget || !adjAmount) return;
    try {
      await userAPI.adjustBalance(adjustTarget.customer_id || adjustTarget.id, { amount: adjAmount, type: adjType });
      toast(`Balance ${adjType}ed`);
      setAdjustTarget(null); setAdjAmount('');
      users.refresh();
    } catch { toast('Failed', 'error'); }
  };

  return (
    <>
      <PageHeader
        title="Users"
        description="Manage accounts, balances, and access."
        breadcrumb={[{ label: 'Admin', href: '/admin' }, { label: 'Users' }]}
        actions={
          <Input
            placeholder="Search users…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leadingIcon={<Search />}
            className="w-64"
          />
        }
      />

      <Card>
        <CardHeader title={`All users`} icon={<Users className="size-4" />} description={`${users.total} total · ${filtered.length} on this page`} />
        <CardDivider />
        <DataTable>
          <thead>
            <tr>
              <TH>User</TH>
              <TH>Email</TH>
              <TH align="right">Balance</TH>
              <TH>Status</TH>
              <TH align="right">Referrals</TH>
              <TH align="right">Actions</TH>
            </tr>
          </thead>
          <tbody>
            {users.loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}><td colSpan={6} className="px-5 py-2"><Skeleton mode="pulse" className="h-9 w-full rounded" /></td></tr>
            ))}
            {!users.loading && filtered.map((u: any) => (
              <TR key={u.customer_id || u.id}>
                <TD>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={u.username} size={32} />
                    <div>
                      <div className="text-fg font-medium">{u.username}</div>
                      <div className="text-[11px] text-fg-subtle font-mono">#{u.customer_id || u.id}</div>
                    </div>
                  </div>
                </TD>
                <TD className="text-fg-muted">{u.email}</TD>
                <TD align="right" className="tabular font-medium">{formatMoney(u.acc_balance)}</TD>
                <TD>
                  {u.status === 1 ? <Badge tone="success">Active</Badge>
                    : u.status === 2 ? <Badge tone="danger">Suspended</Badge>
                    : <Badge tone="warning">Inactive</Badge>}
                </TD>
                <TD align="right" className="tabular text-fg-muted">{u.referrer_id ?? 0}</TD>
                <TD align="right">
                  <div className="inline-flex items-center gap-1 justify-end">
                    <Button
                      size="sm" variant="ghost" leadingIcon={<Wallet className="size-3.5" />}
                      onClick={() => setAdjustTarget(u)}
                    >Adjust</Button>
                    {u.status === 2 ? (
                      <Button size="sm" variant="secondary" leadingIcon={<ShieldCheck className="size-3.5" />} onClick={() => activate(u.customer_id || u.id)}>Activate</Button>
                    ) : (
                      <Button size="sm" variant="secondary" leadingIcon={<ShieldAlert className="size-3.5" />} onClick={() => suspend(u.customer_id || u.id)}>Suspend</Button>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
            {!users.loading && filtered.length === 0 && <TableEmpty colSpan={6}>No users found.</TableEmpty>}
          </tbody>
        </DataTable>
        <Pagination
          page={users.page}
          pageCount={users.pageCount}
          total={users.total}
          pageSize={users.pageSize}
          onPageChange={users.setPage}
          onPageSizeChange={users.setPageSize}
          loading={users.loading}
          itemLabel="users"
        />
      </Card>

      <Dialog
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        title="Adjust balance"
        description={adjustTarget ? `${adjustTarget.username} (${adjustTarget.email})` : ''}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdjustTarget(null)}>Cancel</Button>
            <Button form="adj-form" type="submit">Apply</Button>
          </div>
        }
      >
        <form id="adj-form" onSubmit={submitAdjust} className="space-y-4">
          <Field label="Operation">
            <Select value={adjType} onChange={(e) => setAdjType(e.target.value as 'credit' | 'debit')}>
              <option value="credit">Credit (add funds)</option>
              <option value="debit">Debit (remove funds)</option>
            </Select>
          </Field>
          <Field label="Amount" hint="USD">
            <Input
              type="number" min="0" step="0.01"
              value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)}
              leadingIcon={<span className="text-fg-subtle text-sm font-medium">$</span>}
              autoFocus required
            />
          </Field>
        </form>
      </Dialog>
    </>
  );
}
