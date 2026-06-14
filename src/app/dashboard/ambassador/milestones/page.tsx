'use client';

import { useEffect, useState } from 'react';
import { Award, Check, Lock, Gift } from 'lucide-react';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAmbassador } from '@/components/ambassador/AmbassadorProvider';
import { RankBadge } from '@/components/ambassador/RankBadge';
import { cn, formatMoney } from '@/lib/ui';

/** Milestone tracker — every rank reward with an animated progress bar
 *  showing how close you are to unlocking it, plus a reward preview. */
export default function AmbassadorMilestonesPage() {
  const { plan, me } = useAmbassador();
  const order = plan.ranks.map((r) => r.key);
  const userIdx = me ? order.indexOf(me.rank) : -1;

  return (
    <>
      <PageHeader
        title="Milestone tracker"
        description="One-time rewards delivered the first time you reach each qualifying rank. Track how close you are and preview what's waiting."
      />

      <div className="grid lg:grid-cols-2 gap-4">
        {plan.milestones.map((m) => {
          const rank = plan.ranks.find((x) => x.key === m.rank)!;
          const rankIdx = order.indexOf(m.rank);
          const achieved = userIdx >= 0 && rankIdx <= userIdx;
          const progress = milestoneProgress(me, rank, achieved);

          return (
            <Card key={m.rank} className={cn('overflow-hidden', achieved && 'border-success/40')}>
              <CardBody className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <RankBadge rank={rank} size="sm" />
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-fg">{rank.title} milestone</div>
                      <div className="text-[12px] text-fg-muted tabular">
                        {formatMoney(m.valueUsd, { decimals: 0 })} reward value
                      </div>
                    </div>
                  </div>
                  {achieved ? (
                    <Badge tone="success"><Check className="size-3" /> Unlocked</Badge>
                  ) : (
                    <Badge tone="neutral"><Lock className="size-3" /> {Math.round(progress)}%</Badge>
                  )}
                </div>

                {/* Reward preview */}
                <div className="mt-3 flex gap-2.5 rounded-lg border border-hairline bg-surface-sunk/40 p-3">
                  <Gift className="size-4 text-accent shrink-0 mt-0.5" />
                  <p className="text-[13px] text-fg-muted leading-relaxed">{m.description}</p>
                </div>

                {/* Animated progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11.5px] mb-1.5">
                    <span className="text-fg-muted">{achieved ? 'Earned' : `Progress to ${rank.title}`}</span>
                    <span className={cn('tabular font-medium', achieved ? 'text-success' : 'text-fg')}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <MilestoneBar pct={progress} achieved={achieved} />
                  {!achieved && (
                    <div className="mt-1.5 text-[11px] text-fg-subtle">
                      Reach {rank.directRequired} directs · {formatMoney(rank.teamVolumeUsd, { decimals: 0 })} team volume ·
                      {' '}{formatMoney(rank.personalInvestUsd, { decimals: 0 })} personal
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card variant="sunk" className="mt-4">
        <CardBody className="p-4 text-[13px] text-fg-muted flex items-start gap-2.5">
          <Award className="size-4 text-accent shrink-0 mt-0.5" />
          <span>
            Cash equivalents are available in lieu of physical items. Milestones are awarded once,
            the first time you qualify for the rank — they stack as you climb.
          </span>
        </CardBody>
      </Card>
    </>
  );
}

/** Average completion across the rank's three criteria (0–100). */
function milestoneProgress(me: any, rank: any, achieved: boolean): number {
  if (achieved) return 100;
  if (!me) return 0;
  const ratios = [
    rank.directRequired > 0 ? me.directReferrals / rank.directRequired : 1,
    rank.teamVolumeUsd > 0 ? me.teamVolumeUsd / rank.teamVolumeUsd : 1,
    rank.personalInvestUsd > 0 ? me.personalInvestUsd / rank.personalInvestUsd : 1,
  ].map((r) => Math.min(1, Math.max(0, r)));
  return (ratios.reduce((s, r) => s + r, 0) / ratios.length) * 100;
}

function MilestoneBar({ pct, achieved }: { pct: number; achieved: boolean }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);
  return (
    <div className="relative h-2.5 rounded-full bg-surface-2 overflow-hidden">
      <div
        className={cn('absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-out',
          achieved ? 'bg-success' : 'bg-accent')}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}
