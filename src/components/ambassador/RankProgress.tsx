'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Users, TrendingUp, Wallet, Trophy, Check } from 'lucide-react';
import { Card, CardBody, CardHeader, CardDivider } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAmbassador } from '@/components/ambassador/AmbassadorProvider';
import { RankBadge } from '@/components/ambassador/RankBadge';
import { nextRankOf, rankByKey } from '@/lib/affiliate';
import { cn, formatMoney } from '@/lib/ui';

/** Rank progress — current vs required across the three qualification
 *  criteria (directs, team volume, personal investment) toward the next
 *  rank, with bars that animate in on mount. */
export function RankProgress() {
  const { plan, me } = useAmbassador();
  const current = me ? rankByKey(plan, me.rank) : plan.ranks[0];
  const next = me ? nextRankOf(plan, me.rank) : plan.ranks[1] ?? null;

  const criteria = next && me ? [
    { icon: <Users className="size-3.5" />,       label: 'Direct referrals',     cur: me.directReferrals,   req: next.directRequired,    money: false },
    { icon: <TrendingUp className="size-3.5" />,  label: 'Team volume',          cur: me.teamVolumeUsd,     req: next.teamVolumeUsd,     money: true },
    { icon: <Wallet className="size-3.5" />,      label: 'Personal investment',  cur: me.personalInvestUsd, req: next.personalInvestUsd, money: true },
  ] : [];

  const overall = criteria.length
    ? Math.round(criteria.reduce((s, c) => s + Math.min(100, c.req > 0 ? (c.cur / c.req) * 100 : 100), 0) / criteria.length)
    : 100;

  return (
    <Card className="mb-6">
      <CardHeader
        title="Your progress to the next rank"
        icon={<Trophy className="size-4" />}
        description={next ? `Hit all three to advance to ${next.title}.` : 'You hold the highest rank.'}
      />
      <CardDivider />
      <CardBody className="pt-1">
        {!next ? (
          <div className="flex items-center gap-3 py-2">
            <RankBadge rank={current} size="sm" />
            <span className="text-[13px] text-success font-medium inline-flex items-center gap-1">
              <Check className="size-4" /> Top rank reached — every commission level is unlocked.
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 text-[13px] text-fg-muted">
                <RankBadge rank={current} size="sm" />
                <span className="text-fg-subtle">→</span>
                <RankBadge rank={next} size="sm" />
              </div>
              <Badge tone="accent">{overall}% there</Badge>
            </div>
            <div className="space-y-4">
              {criteria.map((c) => (
                <CriterionBar
                  key={c.label}
                  icon={c.icon}
                  label={c.label}
                  current={c.cur}
                  required={c.req}
                  money={c.money}
                />
              ))}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function CriterionBar({ icon, label, current, required, money }: {
  icon: ReactNode; label: string; current: number; required: number; money: boolean;
}) {
  const pct = required > 0 ? Math.min(100, (current / required) * 100) : 100;
  const met = current >= required;
  const fmt = (n: number) => (money ? formatMoney(n, { decimals: 0 }) : n.toLocaleString());

  // Animate the bar in: start at 0, expand to pct after mount.
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div>
      <div className="flex items-center justify-between text-[12.5px] mb-1.5">
        <span className="text-fg-muted inline-flex items-center gap-1.5">
          <span className="text-fg-subtle">{icon}</span>{label}
        </span>
        <span className={cn('tabular font-medium', met ? 'text-success' : 'text-fg')}>
          {fmt(current)} <span className="text-fg-subtle">/ {fmt(required)}</span>
          {met && <Check className="inline size-3.5 ml-1 text-success" />}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-surface-2 overflow-hidden">
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out',
            met ? 'bg-success' : 'bg-accent')}
          style={{ width: `${w}%` }}
        />
      </div>
    </div>
  );
}
