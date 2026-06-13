'use client';

import { Check, Lock, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader, CardDivider } from '@/components/ui/Card';
import { DataTable, TR, TH, TD } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { useAmbassador } from '@/components/ambassador/AmbassadorProvider';
import { RankBadge } from '@/components/ambassador/RankBadge';
import { formatMoney } from '@/lib/ui';

export default function AmbassadorRanksPage() {
  const { plan, me } = useAmbassador();
  const order = plan.ranks.map((r) => r.key);
  const userIdx = me ? order.indexOf(me.rank) : -1;

  return (
    <>
      <PageHeader
        title="Ranks & milestones"
        description="Eight ranks, eight levels of freedom. Each rank unlocks deeper commission levels, larger bonus pools, and milestone gifts."
      />

      {/* Rank ladder */}
      <Card className="mb-6">
        <CardHeader title="The BEX rank system" icon={<Trophy className="size-4" />} />
        <CardDivider />
        <DataTable>
          <thead>
            <tr>
              <TH>Rank</TH>
              <TH align="right">Directs</TH>
              <TH align="right">Team volume</TH>
              <TH align="right">Personal invest</TH>
              <TH>Levels open</TH>
              <TH>Rank bonus / mo</TH>
              <TH>Status</TH>
            </tr>
          </thead>
          <tbody>
            {plan.ranks.map((r, i) => {
              const bonus = plan.rankBonuses.find((b) => b.rank === r.key);
              const isCurrent = i === userIdx;
              const isAchieved = userIdx >= 0 && i <= userIdx;
              return (
                <TR key={r.key} className={isCurrent ? 'bg-accent-soft/30' : ''}>
                  <TD>
                    <div className="flex items-center gap-2">
                      <RankBadge rank={r} size="sm" />
                      {isCurrent && <Badge tone="accent">You</Badge>}
                    </div>
                  </TD>
                  <TD align="right" className="tabular">{r.directRequired.toLocaleString()}</TD>
                  <TD align="right" className="tabular">{formatMoney(r.teamVolumeUsd, { decimals: 0 })}</TD>
                  <TD align="right" className="tabular">{formatMoney(r.personalInvestUsd, { decimals: 0 })}</TD>
                  <TD>
                    <span className="font-mono text-fg-muted">L1–L{r.unlockedLevels}</span>
                    {r.lrpTier > 0 && <Badge tone="accent" className="ml-2">LRP T{r.lrpTier}</Badge>}
                  </TD>
                  <TD>
                    {bonus ? (
                      <div>
                        <div className="tabular font-medium">{formatMoney(bonus.cashUsd, { decimals: 0 })}</div>
                        <div className="text-[12px] text-fg-muted tabular">+ {bonus.tokenBex.toLocaleString()} ${plan.tokenTicker}</div>
                      </div>
                    ) : <span className="text-fg-subtle">—</span>}
                  </TD>
                  <TD>
                    {isCurrent
                      ? <Badge tone="accent">Current</Badge>
                      : isAchieved
                        ? <Badge tone="success"><Check className="size-3" /> Achieved</Badge>
                        : <Badge tone="neutral"><Lock className="size-3" /> Locked</Badge>}
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </DataTable>
      </Card>

      {/* Milestone gifts */}
      <h2 className="text-[18px] font-semibold text-fg mb-3">Milestone gifts</h2>
      <p className="text-[14px] text-fg-muted mb-4 max-w-2xl">
        One-time rewards delivered when you first reach a qualifying rank. Cash equivalents are available in lieu of physical items.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {plan.milestones.map((m) => {
          const r = plan.ranks.find((x) => x.key === m.rank)!;
          const achieved = userIdx >= 0 && order.indexOf(m.rank) <= userIdx;
          return (
            <Card key={m.rank} className={achieved ? 'border-success/40' : ''}>
              <CardBody className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <RankBadge rank={r} size="sm" />
                  <span className="text-[14px] font-semibold tabular text-fg">{formatMoney(m.valueUsd, { decimals: 0 })}</span>
                </div>
                <p className="text-[14px] text-fg-muted mt-3 leading-relaxed">{m.description}</p>
                {achieved && (
                  <div className="mt-3 text-[12px] text-success font-medium inline-flex items-center gap-1">
                    <Check className="size-3.5" /> Eligible
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Matching bonus matrix */}
      <Card className="mb-6">
        <CardHeader title="Matching bonus" description={`Rank-tiered match on your L1 partners' residual income.`} />
        <CardDivider />
        <DataTable>
          <thead>
            <tr>
              <TH>From rank</TH>
              <TH align="right">Match %</TH>
              <TH>What it means</TH>
            </tr>
          </thead>
          <tbody>
            {plan.matching.map((m) => {
              const r = plan.ranks.find((x) => x.key === m.fromRank)!;
              return (
                <TR key={m.fromRank}>
                  <TD><RankBadge rank={r} size="sm" /></TD>
                  <TD align="right" className="tabular font-semibold">{m.matchPercent}%</TD>
                  <TD className="text-fg-muted">If a top L1 partner earns $2,000/mo, you earn an extra <span className="text-fg tabular font-medium">{formatMoney(2000 * m.matchPercent / 100, { decimals: 0 })}/mo</span> — purely passive.</TD>
                </TR>
              );
            })}
          </tbody>
        </DataTable>
      </Card>

      {/* Single-leg rule */}
      <Card variant="sunk">
        <CardBody className="p-4 text-[14px] text-fg-muted">
          <span className="text-fg font-semibold">Single-leg rule.</span> No single team leg may contribute more than{' '}
          <span className="text-fg tabular font-semibold">{plan.maxLegContributionPercent}%</span> of required team volume —
          this forces broad building, not a single power-leg structure that collapses.
        </CardBody>
      </Card>
    </>
  );
}
