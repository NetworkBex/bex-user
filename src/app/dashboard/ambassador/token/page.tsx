'use client';

import { Sparkles, Flame, Coins, Percent, ShieldCheck, ArrowDown } from 'lucide-react';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader, CardDivider } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAmbassador } from '@/components/ambassador/AmbassadorProvider';
import { formatMoney } from '@/lib/ui';

export default function AmbassadorTokenPage() {
  const { plan, me } = useAmbassador();
  const t = plan.tokenTicker;

  // Cumulative annual table — derived purely from the plan (no hardcoding).
  const annual = plan.rankBonuses.map((b) => ({
    rank: plan.ranks.find((r) => r.key === b.rank)!,
    cashYear: b.cashUsd * 12,
    tokenYear: b.tokenBex * 12,
  }));

  return (
    <>
      <PageHeader
        title={`$${t} — partner token programme`}
        description={`$${t} is an equity-analogue tied to platform performance. Every allocation is a long-term wealth position, not a speculation.`}
      />

      {/* Your balance */}
      <Card className="mb-6">
        <CardHeader title={`Your $${t} position`} icon={<Sparkles className="size-4" />} description="Allocated from rank bonuses, fast-start, and milestone gifts." />
        <CardBody className="pt-1 grid sm:grid-cols-3 gap-4">
          <Stat label="Total balance"     value={me?.tokenBalance != null ? `${me.tokenBalance.toLocaleString()} $${t}` : '—'} />
          <Stat label="Pre-launch price"  value={`$${plan.founding.preLaunchTokenPrice.toFixed(4)}`} />
          <Stat label="TGE price"         value={`$${plan.founding.tgePrice.toFixed(4)}`} />
        </CardBody>
      </Card>

      {/* Why it appreciates */}
      <Card className="mb-6">
        <CardHeader title={`Why $${t} appreciates`} icon={<Flame className="size-4" />} />
        <CardDivider />
        <CardBody className="grid md:grid-cols-2 gap-4 pt-1">
          <Mechanism
            icon={<Flame />}
            label="Buyback & burn"
            driver={`30% of platform fee used weekly`}
            impact={`Reduces supply → price support`}
          />
          <Mechanism
            icon={<Coins />}
            label="Staking yield"
            driver={`Partners stake $${t} → earn from platform fee`}
            impact="Creates holding incentive"
          />
          <Mechanism
            icon={<Percent />}
            label="Fee discount"
            driver={`Hold $${t} → pay 15% fee vs ${plan.managementFeePercent}%`}
            impact="Organic buy pressure from investors"
          />
          <Mechanism
            icon={<ShieldCheck />}
            label="Rank qualification"
            driver={`Higher ranks require minimum $${t} holding`}
            impact="Permanent demand floor"
          />
        </CardBody>
      </Card>

      {/* Annual allocations by rank */}
      <Card className="mb-6">
        <CardHeader title="Annual token allocation by rank" description={`Rank bonus paid monthly, vests over 6 months from receipt.`} />
        <CardDivider />
        <div className="overflow-x-auto">
          <table className="w-full text-[14px] tabular border-separate border-spacing-0">
            <thead>
              <tr className="text-[12px] uppercase tracking-wider font-semibold text-fg-muted">
                <th className="text-left px-5 py-3 bg-surface-sunk border-b border-border">Rank</th>
                <th className="text-right px-5 py-3 bg-surface-sunk border-b border-border">Monthly cash</th>
                <th className="text-right px-5 py-3 bg-surface-sunk border-b border-border">Monthly ${t}</th>
                <th className="text-right px-5 py-3 bg-surface-sunk border-b border-border">Annual cash</th>
                <th className="text-right px-5 py-3 bg-surface-sunk border-b border-border">Annual ${t}</th>
              </tr>
            </thead>
            <tbody>
              {annual.map((row) => {
                const b = plan.rankBonuses.find((x) => x.rank === row.rank.key)!;
                return (
                  <tr key={row.rank.key} className="hover:bg-surface-sunk/50 transition-colors">
                    <td className="px-5 py-3 border-b border-hairline text-fg">
                      <span className="font-medium">{row.rank.title}</span>{' '}
                      <span className="text-fg-muted font-mono text-[12px]">{row.rank.shortKey}</span>
                    </td>
                    <td className="px-5 py-3 border-b border-hairline text-right">{formatMoney(b.cashUsd, { decimals: 0 })}</td>
                    <td className="px-5 py-3 border-b border-hairline text-right text-accent font-medium">{b.tokenBex.toLocaleString()}</td>
                    <td className="px-5 py-3 border-b border-hairline text-right font-semibold">{formatMoney(row.cashYear, { decimals: 0 })}</td>
                    <td className="px-5 py-3 border-b border-hairline text-right text-accent font-semibold">{row.tokenYear.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Vesting reminder */}
      <Card variant="sunk">
        <CardBody className="p-4 text-[13px] text-fg-muted flex gap-3">
          <ArrowDown className="size-4 text-accent shrink-0 mt-0.5" />
          <span>
            All pre-launch allocations vest <span className="text-fg font-medium">25% at TGE</span> and the remaining
            {' '}<span className="text-fg font-medium">75% over the following 6 months</span>. Partners cannot dump on the community at launch.
          </span>
        </CardBody>
      </Card>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-lg border border-hairline bg-surface-sunk/40">
      <div className="text-[12px] uppercase tracking-wider text-fg-muted font-semibold">{label}</div>
      <div className="mt-1.5 text-[22px] font-semibold tracking-tight tabular text-fg leading-tight">{value}</div>
    </div>
  );
}

function Mechanism({ icon, label, driver, impact }: { icon: React.ReactNode; label: string; driver: string; impact: string }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-surface-sunk/30">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-accent [&>svg]:size-4">{icon}</span>
        <span className="text-[15px] font-semibold text-fg">{label}</span>
      </div>
      <div className="text-[13px] text-fg-muted leading-relaxed">{driver}</div>
      <div className="text-[13px] text-success mt-1.5">{impact}</div>
    </div>
  );
}
