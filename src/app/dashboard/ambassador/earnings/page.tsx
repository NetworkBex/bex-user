'use client';

import { useEffect, useState } from 'react';
import { Coins, Filter } from 'lucide-react';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader, CardDivider } from '@/components/ui/Card';
import { DataTable, TR, TH, TD, TableEmpty } from '@/components/ui/DataTable';
import { Skeleton } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { BalanceChart } from '@/components/dashboard/BalanceChart';
import { useAmbassador } from '@/components/ambassador/AmbassadorProvider';
import { affiliateAPI } from '@/lib/api';
import { usePagination } from '@/hooks/usePagination';
import type { CommissionEntry } from '@/lib/affiliate';
import { formatMoney, shortDate } from '@/lib/ui';

const sourceLabel: Record<CommissionEntry['source'], string> = {
  residual:    'Residual',
  matching:    'Matching',
  lrp:         'LRP',
  rank_bonus:  'Rank bonus',
  fast_start:  'Fast Start',
  token:       'Token award',
};

const sourceTone: Record<CommissionEntry['source'], 'success' | 'info' | 'accent' | 'warning' | 'neutral'> = {
  residual:   'success',
  matching:   'info',
  lrp:        'accent',
  rank_bonus: 'warning',
  fast_start: 'accent',
  token:      'info',
};

export default function AmbassadorEarningsPage() {
  const { earnings, loadingEarnings } = useAmbassador();
  const [filter, setFilter] = useState<'all' | CommissionEntry['source']>('all');

  // Source filter is sent as ?source= to the server; pagination resets
  // to page 1 when the filter changes (handled by usePagination via the
  // `extraParams` change → re-fetch).
  const entries = usePagination<CommissionEntry>(
    ({ page, page_size }) => affiliateAPI.commissions({
      page, page_size,
      source: filter === 'all' ? undefined : filter,
    }),
    { initialPageSize: 20, extraParams: { source: filter === 'all' ? undefined : filter } },
  );

  const trend = earnings?.trend?.map((t) => ({ label: t.month, value: t.usd })) ?? undefined;

  const cards: { label: string; key: keyof typeof streamMap }[] = [
    { label: 'Residuals',     key: 'residualsUsd' },
    { label: 'Matching',      key: 'matchingUsd' },
    { label: 'Rank bonus',    key: 'rankBonusUsd' },
    { label: 'LRP',           key: 'lrpUsd' },
    { label: 'Fast Start',    key: 'fastStartUsd' },
  ];
  const streamMap = {
    residualsUsd: earnings?.residualsUsd,
    matchingUsd:  earnings?.matchingUsd,
    rankBonusUsd: earnings?.rankBonusUsd,
    lrpUsd:       earnings?.lrpUsd,
    fastStartUsd: earnings?.fastStartUsd,
  };

  return (
    <>
      <PageHeader
        title="Earnings"
        description="A complete ledger of every commission paid into your wallet."
      />

      {/* Stream breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {cards.map((c) => (
          <div key={c.key} className="p-4 rounded-lg border border-border bg-surface">
            <div className="text-[12px] uppercase tracking-wider text-fg-muted font-semibold">{c.label}</div>
            <div className="mt-1.5 text-[20px] font-semibold tracking-tight tabular text-fg">
              {loadingEarnings
                ? <Skeleton mode="pulse" className="h-6 w-16 rounded" />
                : streamMap[c.key] == null ? <span className="text-fg-subtle">—</span> : formatMoney(streamMap[c.key]!)}
            </div>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      <Card className="mb-6">
        <CardHeader title="6-month earnings trend" icon={<Coins className="size-4" />} />
        <CardBody className="pt-1">
          <BalanceChart data={trend} tone="success" />
        </CardBody>
      </Card>

      {/* Ledger */}
      <Card>
        <CardHeader
          title="Commission ledger"
          description={`${entries.total} entries`}
          action={
            <div className="flex items-center gap-2">
              <Filter className="size-3.5 text-fg-subtle" />
              <Select className="h-8 text-[13px]" value={filter} onChange={(e) => setFilter(e.target.value as any)}>
                <option value="all">All sources</option>
                {Object.entries(sourceLabel).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </div>
          }
        />
        <CardDivider />
        <DataTable>
          <thead>
            <tr>
              <TH>Date</TH>
              <TH>Source</TH>
              <TH>Level</TH>
              <TH>From</TH>
              <TH align="right">Amount</TH>
            </tr>
          </thead>
          <tbody>
            {entries.loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}><td colSpan={5} className="px-5 py-2"><Skeleton mode="pulse" className="h-8 w-full rounded" /></td></tr>
            ))}
            {!entries.loading && entries.rows.map((e) => (
              <TR key={e.id}>
                <TD className="text-fg-muted">{shortDate(e.date)}</TD>
                <TD><Badge tone={sourceTone[e.source]}>{sourceLabel[e.source]}</Badge></TD>
                <TD className="font-mono text-fg-muted">{e.level ? `L${e.level}` : '—'}</TD>
                <TD>{e.fromUser ?? '—'}</TD>
                <TD align="right" className="tabular font-medium">{formatMoney(e.amountUsd, { sign: true })}</TD>
              </TR>
            ))}
            {!entries.loading && entries.rows.length === 0 && (
              <TableEmpty colSpan={5}>No commissions yet — earnings appear here as your downline trades.</TableEmpty>
            )}
          </tbody>
        </DataTable>
        <Pagination
          page={entries.page}
          pageCount={entries.pageCount}
          total={entries.total}
          pageSize={entries.pageSize}
          onPageChange={entries.setPage}
          onPageSizeChange={entries.setPageSize}
          loading={entries.loading}
          itemLabel="entries"
        />
      </Card>
    </>
  );
}
