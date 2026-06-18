'use client';

import { useEffect, useState } from 'react';
import { Lock, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardHeader, CardDivider, CardBody } from '@/components/ui/Card';
import { DataTable, TR, TH, TD, TableEmpty } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Progress';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { affiliateAPI, userAPI } from '@/lib/api';
import { DownlineTree } from '@/components/ambassador/DownlineTree';
import { useAmbassador } from '@/components/ambassador/AmbassadorProvider';
import { levelUnlocked, rankByKey, type LevelStanding } from '@/lib/affiliate';
import { usePagination } from '@/hooks/usePagination';
import { formatMoney, shortDate } from '@/lib/ui';
import { Avatar } from '@/components/ui/Avatar';

export default function AmbassadorTeamPage() {
  const { plan, me } = useAmbassador();
  const [standings, setStandings] = useState<LevelStanding[] | null>(null);

  // Server-paginated directs list.
  const directs = usePagination<any>(
    ({ page, page_size }) => userAPI.referrals({ page, page_size }),
    { initialPageSize: 25 },
  );

  useEffect(() => {
    affiliateAPI.team()
      .then((res) => setStandings((res.data?.levels ?? res.data) as LevelStanding[]))
      .catch(() => setStandings(null));
  }, []);

  const userRank = me?.rank ?? rankByKey(plan, 'founder').key;

  return (
    <>
      <PageHeader
        title="Team"
        description="Your downline by level. Compression keeps your income flowing past inactive intermediaries."
      />

      {/* Full downline pyramid — everyone under you, all levels */}
      <DownlineTree />

      {/* Unilevel snapshot */}
      <Card className="mb-6">
        <CardHeader title="Unilevel snapshot" icon={<Users className="size-4" />} description={`${plan.unilevel.length} levels · compression active`} />
        <CardDivider />
        <DataTable>
          <thead>
            <tr>
              <TH>Level</TH>
              <TH>Relationship</TH>
              <TH align="right">Rate</TH>
              <TH align="right">Active investors</TH>
              <TH align="right">Volume</TH>
              <TH align="right">Commission (mo)</TH>
              <TH>Status</TH>
            </tr>
          </thead>
          <tbody>
            {plan.unilevel.map((l) => {
              const open = levelUnlocked(plan, userRank, l.level);
              const s = standings?.find((x) => x.level === l.level);
              return (
                <TR key={l.level}>
                  <TD className="font-mono text-fg-muted">L{l.level}</TD>
                  <TD>{l.relationship}</TD>
                  <TD align="right" className="tabular font-semibold">{l.rate}%</TD>
                  <TD align="right" className="tabular">{open ? (s?.activeInvestors ?? 0) : '—'}</TD>
                  <TD align="right" className="tabular">{open ? formatMoney(s?.volumeUsd ?? 0) : '—'}</TD>
                  <TD align="right" className="tabular text-success font-medium">{open ? formatMoney(s?.monthlyCommissionUsd ?? 0) : '—'}</TD>
                  <TD>
                    {open
                      ? <Badge tone="success">Unlocked</Badge>
                      : <Badge tone="neutral" className="inline-flex items-center gap-1">
                          <Lock className="size-3" /> {plan.ranks.find(r => r.key === l.unlockRank)?.title}
                        </Badge>}
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </DataTable>
      </Card>

      {/* Direct referrals */}
      <Card>
        <CardHeader title="Your direct referrals" icon={<Users className="size-4" />} description={`${directs.total} direct invitees`} />
        <CardDivider />
        {directs.loading && directs.rows.length === 0 ? (
          <CardBody>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} mode="pulse" className="h-10 w-full rounded" />)}
            </div>
          </CardBody>
        ) : directs.rows.length > 0 ? (
          <>
            <DataTable>
              <thead>
                <tr>
                  <TH>User</TH>
                  <TH>Email</TH>
                  <TH align="right">Joined</TH>
                </tr>
              </thead>
              <tbody>
                {directs.rows.map((r: any) => (
                  <TR key={r.customer_id || r.id}>
                    <TD>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.username} size={28} />
                        <span className="text-fg">{r.username}</span>
                      </div>
                    </TD>
                    <TD className="text-fg-muted">{r.email}</TD>
                    <TD align="right" className="text-fg-muted">{shortDate(r.date_created)}</TD>
                  </TR>
                ))}
              </tbody>
            </DataTable>
            <Pagination
              page={directs.page}
              pageCount={directs.pageCount}
              total={directs.total}
              pageSize={directs.pageSize}
              onPageChange={directs.setPage}
              onPageSizeChange={directs.setPageSize}
              loading={directs.loading}
              itemLabel="referrals"
            />
          </>
        ) : (
          <CardBody>
            <EmptyState
              icon={<Users />}
              title="No direct referrals yet"
              description="Share your referral link from the Overview tab to start building your team."
            />
          </CardBody>
        )}
      </Card>
    </>
  );
}
