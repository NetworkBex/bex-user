'use client';

import { useEffect, useState } from 'react';
import { Layers, Sparkles, Crown } from 'lucide-react';
import { coreAPI } from '@/lib/api';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Progress';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn, formatMoney } from '@/lib/ui';

const TIER_LABELS = ['Entry tier', 'Growth tier', 'Professional tier', 'Institutional tier'];

function sortTiers(rows: any[]) {
  return [...rows].sort((a, b) => {
    const da = parseInt(a.duration) || 0;
    const db = parseInt(b.duration) || 0;
    if (da !== db) return db - da;
    return parseFloat(a.percentage) - parseFloat(b.percentage);
  });
}

/** Plan tier grid — lower tiers run longer cycles (inverse
 *  amount/duration model), so cards sort duration DESC. Pass `plans`
 *  when the parent already fetched them; otherwise it self-fetches. */
export function InvestPlansSection({ onStart, plans: externalPlans, loading: externalLoading }: {
  onStart: (planId: number | string) => void;
  plans?: any[];
  loading?: boolean;
}) {
  const [fetched, setFetched] = useState<any[]>([]);
  const [selfLoading, setSelfLoading] = useState(externalPlans === undefined);

  useEffect(() => {
    if (externalPlans !== undefined) return;
    coreAPI.investPlans()
      .then((rows: any[]) => setFetched(rows))
      .catch(() => setFetched([]))
      .finally(() => setSelfLoading(false));
  }, [externalPlans]);

  const loading = externalPlans !== undefined ? !!externalLoading : selfLoading;
  const plans = sortTiers(externalPlans ?? fetched);

  return (
    <Card>
      <CardHeader
        title="Access tiers"
        icon={<Layers className="size-4" />}
        description="Put the Bex AI to work — pick a tier and start a cycle. Smaller stakes run longer cycles; funds stay locked until maturity."
      />
      <CardBody className="pt-1">
        {loading ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} mode="pulse" className="h-48 w-full rounded-xl" />)}
          </div>
        ) : plans.length === 0 ? (
          <EmptyState
            icon={<Sparkles />}
            title="No plans available"
            description="Investment tiers haven't been published yet — check back soon."
          />
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-2">
            {plans.map((p: any, i: number) => (
              <PlanTierCard key={p.invest_plan_id || p.id} plan={p} index={i} popular={i === 1} onStart={onStart} />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function PlanTierCard({ plan, index, popular, onStart }: {
  plan: any; index: number; popular?: boolean; onStart: (planId: number | string) => void;
}) {
  const pct = parseFloat(plan.percentage) || 0;
  const days = parseInt(plan.duration) || 0;
  const roi = pct * days;                 // projected total ROI over the cycle, %
  const monthly = Math.round(pct * 30);   // ~monthly target, derived from daily rate
  const tierLabel = TIER_LABELS[index] ?? 'Access tier';

  return (
    <div className={cn(
      'relative flex flex-col rounded-2xl border bg-surface p-5 transition-colors',
      popular
        ? 'border-accent ring-1 ring-accent/30 shadow-[var(--shadow-pop)]'
        : 'border-border hover:border-border-strong',
    )}>
      {popular && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-fg">
            <Crown className="size-3" /> Most popular
          </span>
        </div>
      )}

      <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-accent">{tierLabel}</div>
      <div className="mt-1 text-[22px] font-semibold tracking-tight text-fg leading-none">{plan.name}</div>
      <div className="mt-1.5 text-[12px] text-fg-muted tabular">
        {formatMoney(plan.min_amount)} – {formatMoney(plan.max_amount)}
      </div>

      {/* Daily-return highlight */}
      <div className="mt-4 rounded-xl border border-accent/15 bg-accent-soft/60 px-4 py-3 text-center">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-accent-fg/70">Daily return</div>
        <div className="mt-0.5 text-[24px] font-semibold tracking-tight text-accent tabular">{pct}%</div>
      </div>

      {/* Metric rows */}
      <div className="mt-4 border-t border-hairline divide-y divide-hairline">
        <Metric label="Monthly target" value={`~${monthly}%`} />
        <Metric label="Capital lock-up" value={`${days} Days`} />
        <Metric label="Projected ROI" value={`${roi.toFixed(1)}%`} accent />
      </div>

      <Button
        size="sm"
        variant={popular ? 'primary' : 'secondary'}
        className="mt-5 w-full"
        onClick={() => onStart(plan.invest_plan_id || plan.id)}
      >
        Start cycle
      </Button>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 text-[12px]">
      <span className="text-fg-muted">{label}</span>
      <span className={cn('font-semibold tabular', accent ? 'text-success' : 'text-fg')}>{value}</span>
    </div>
  );
}
