'use client';

import { useEffect, useState } from 'react';
import {
  Copy, Share2, ShieldCheck, Sparkles, TrendingUp, Users, Coins, Trophy,
  ArrowUpRight, AlertCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader, CardDivider } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Progress, Skeleton } from '@/components/ui/Progress';
import { useToast } from '@/components/ToastProvider';
import { authAPI, affiliateAPI } from '@/lib/api';
import { useAmbassador } from '@/components/ambassador/AmbassadorProvider';
import { RankBadge } from '@/components/ambassador/RankBadge';
import { LevelLadder } from '@/components/ambassador/LevelLadder';
import { StreamCard } from '@/components/ambassador/StreamCard';
import {
  matchingFor, nextRankOf, rankBonusFor, rankByKey, lrpTierFor, type FastStartStatus,
} from '@/lib/affiliate';
import { formatMoney } from '@/lib/ui';

export default function AmbassadorOverviewPage() {
  const { plan, me, earnings, loadingMe, loadingEarnings } = useAmbassador();
  const { toast } = useToast() || { toast: (() => {}) as any };
  const [referrer, setReferrer] = useState<string | null>(null);
  const [fastStart, setFastStart] = useState<FastStartStatus | null>(null);

  useEffect(() => {
    authAPI.me().then((res) => setReferrer(res.data.customer?.referrer_id ?? null)).catch(() => {});
    affiliateAPI.fastStart().then((res) => setFastStart(res.data as FastStartStatus)).catch(() => {});
  }, []);

  const link = typeof window !== 'undefined' && referrer
    ? `${window.location.origin}/auth/register?ref=${referrer}` : '';
  const copy = async () => { if (link) { await navigator.clipboard.writeText(link); toast('Link copied'); } };
  const share = async () => {
    if (navigator.share && link) { try { await navigator.share({ title: 'Join BEX Network', url: link }); } catch {} }
    else copy();
  };

  const current = me ? rankByKey(plan, me.rank) : null;
  const next    = me ? nextRankOf(plan, me.rank) : null;
  const matchingTier = me ? matchingFor(plan, me.rank) : null;
  const bonus = me ? rankBonusFor(plan, me.rank) : null;
  const lrp   = me ? lrpTierFor(plan, me.rank) : null;

  const teamPct = me && next && next.teamVolumeUsd > 0
    ? Math.min(100, (me.teamVolumeUsd / next.teamVolumeUsd) * 100) : 0;
  const directPct = me && next && next.directRequired > 0
    ? Math.min(100, (me.directReferrals / next.directRequired) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Ambassador program"
        description="Built for partners who are serious about long-term, compounding income. Every dollar earned by the BEX ecosystem adds to your residual income stream."
      />

      {/* Hero — rank + qualification */}
      <Card className="mb-6 overflow-hidden">
        <div className="p-5 md:p-6 grid lg:grid-cols-[1fr_1.4fr] gap-6 items-center">
          <div>
            <div className="text-[12px] uppercase tracking-wider text-fg-muted font-semibold">Current rank</div>
            <div className="mt-2 flex items-center gap-3">
              {loadingMe || !current
                ? <Skeleton mode="pulse" className="h-9 w-40 rounded-full" />
                : <RankBadge rank={current} size="lg" />}
              {me?.isFoundingPartner && <Badge tone="accent">Founding Partner</Badge>}
            </div>
            {next ? (
              <p className="text-[14px] text-fg-muted mt-3 max-w-md leading-relaxed">
                Advance to <span className="text-fg font-semibold">{next.title}</span> by reaching
                {' '}<span className="text-fg tabular">{next.directRequired}</span> directs and
                {' '}<span className="text-fg tabular">{formatMoney(next.teamVolumeUsd)}</span> in team volume.
              </p>
            ) : (
              <p className="text-[14px] text-fg-muted mt-3">You're at the top — no further rank to unlock.</p>
            )}
          </div>

          {next && (
            <div className="grid sm:grid-cols-2 gap-4">
              <ProgressBlock label="Active directs" got={me?.directReferrals ?? 0} need={next.directRequired} pct={directPct} />
              <ProgressBlock label="Team volume" got={me?.teamVolumeUsd ?? 0} need={next.teamVolumeUsd} pct={teamPct} money />
            </div>
          )}
        </div>
        <CardDivider />
        <div className="p-5">
          <div className="text-[12px] uppercase tracking-wider text-fg-muted font-semibold mb-3">Unlocked commission levels</div>
          <LevelLadder plan={plan} unlocked={me?.unlockedLevels ?? current?.unlockedLevels ?? 1} />
        </div>
      </Card>

      {/* Earnings */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StreamCard
          label="Residuals (this month)"
          amountUsd={earnings?.residualsUsd}
          icon={<TrendingUp />}
          description={`${plan.unilevel.length}-level unilevel · ${plan.partnerPoolSharePercent}% of mgmt fee`}
        />
        <StreamCard
          label="Matching"
          amountUsd={earnings?.matchingUsd}
          icon={<Users />}
          description={matchingTier
            ? `${matchingTier.matchPercent}% match on L1 residuals`
            : `Unlocks at ${plan.matching[0].fromRank}`}
        />
        <StreamCard
          label="Rank bonus"
          amountUsd={bonus?.cashUsd ?? earnings?.rankBonusUsd}
          icon={<Trophy />}
          description={bonus
            ? `+ ${bonus.tokenBex.toLocaleString()} $${plan.tokenTicker} / mo`
            : 'Reach Affiliate rank to start'}
        />
        <StreamCard
          label="Leadership pool"
          amountUsd={earnings?.lrpUsd}
          icon={<Sparkles />}
          description={lrp
            ? `Tier ${lrp.tier} · ${lrp.allocationPercent}% of LRP`
            : `Unlocks at ${plan.lrpAllocation[0].rank}`}
          highlight={!!lrp}
        />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 mb-6">
        {/* Fast start tracker — only meaningful in first 60 days */}
        {fastStart && fastStart.daysRemaining > 0 && (
          <Card>
            <CardHeader
              title="Fast Start tracker"
              icon={<Sparkles className="size-4" />}
              description={`${fastStart.daysRemaining} of ${fastStart.windowDays} days remaining`}
            />
            <CardDivider />
            <CardBody className="space-y-3">
              {plan.fastStart.map((tier) => {
                const achieved = fastStart.tiersAchieved.includes(tier.id);
                return (
                  <div
                    key={tier.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                      achieved
                        ? 'border-success/30 bg-success-soft/30'
                        : 'border-border bg-surface-sunk/30'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-fg">
                        {tier.directRequired} directs · {formatMoney(tier.minimumPerDirectUsd, { decimals: 0 })} min each
                      </div>
                      <div className="text-[12px] text-fg-muted">within {tier.windowDays} days</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[14px] font-semibold tabular text-fg">{formatMoney(tier.cashBonusUsd)}</div>
                      {tier.tokenBonus > 0 && (
                        <div className="text-[12px] text-accent tabular">
                          + {tier.tokenBonus.toLocaleString()} ${plan.tokenTicker}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>
        )}

        {/* Referral link */}
        <Card className={!fastStart || fastStart.daysRemaining === 0 ? 'lg:col-span-2' : ''}>
          <CardHeader title="Your referral link" description="Use this to credit invitees to you." />
          <CardBody className="pt-1 space-y-3">
            <Input readOnly value={link} className="font-mono text-[13px]" />
            <div className="flex flex-wrap gap-2">
              <Button onClick={copy} leadingIcon={<Copy className="size-4" />}>Copy</Button>
              <Button variant="secondary" onClick={share} leadingIcon={<Share2 className="size-4" />}>Share</Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Why-this-pays explainer */}
      <Card>
        <CardHeader title="How your income is funded" icon={<ShieldCheck className="size-4" />} />
        <CardBody className="grid md:grid-cols-3 gap-4 pt-1">
          <Fact
            value={`${plan.managementFeePercent}%`}
            label="of net trading profits"
            sub="taken as the management fee — never from deposits"
          />
          <Fact
            value={`${plan.partnerPoolSharePercent}%`}
            label="of the management fee"
            sub={`allocated to the partner commission pool, paid ${plan.payoutCadence.toLowerCase()}`}
          />
          <Fact
            value={`${plan.lrpFundingPercent}%`}
            label="of platform fees"
            sub={`set aside monthly for the Leadership Revenue Pool, split among ${plan.lrpAllocation.map((t) => t.rank).join(' & ')} qualifiers`}
          />
        </CardBody>
      </Card>

      {/* Compliance footer */}
      <Card variant="sunk" className="mt-6">
        <CardBody className="p-4 text-[13px] text-fg-muted">
          <div className="flex items-center gap-2 mb-2 text-fg font-medium">
            <AlertCircle className="size-3.5 text-warning" />
            Compliance — every ambassador agrees to the following
          </div>
          <ul className="grid md:grid-cols-2 gap-x-6 gap-y-1.5 list-disc pl-5">
            {plan.compliance.map((rule, i) => <li key={i}>{rule}</li>)}
          </ul>
        </CardBody>
      </Card>
    </>
  );
}

function ProgressBlock({
  label, got, need, pct, money,
}: { label: string; got: number; need: number; pct: number; money?: boolean }) {
  const fmt = (n: number) => money ? formatMoney(n) : n.toLocaleString();
  return (
    <div className="rounded-lg border border-border bg-surface-sunk/40 p-4">
      <div className="flex justify-between items-baseline">
        <span className="text-[12px] uppercase tracking-wider text-fg-muted font-semibold">{label}</span>
        <span className="text-[12px] text-fg-muted tabular">{fmt(got)} / {fmt(need)}</span>
      </div>
      <div className="mt-2"><Progress value={pct} tone="accent" /></div>
      <div className="mt-1 text-right text-[12px] text-fg-subtle tabular">{Math.round(pct)}%</div>
    </div>
  );
}

function Fact({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="p-4 rounded-lg border border-hairline bg-surface-sunk/30">
      <div className="text-[28px] font-semibold tracking-tight tabular text-fg leading-tight">{value}</div>
      <div className="text-[14px] text-fg font-medium mt-1">{label}</div>
      {sub && <div className="text-[12px] text-fg-muted mt-1.5 leading-snug">{sub}</div>}
    </div>
  );
}
