'use client';

import { useEffect, useState } from 'react';
import { Clock, Layers, Sparkles, TrendingUp } from 'lucide-react';
import { coreAPI } from '@/lib/api';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Progress';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatMoney } from '@/lib/ui';

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
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {plans.map((p: any) => <PlanTierCard key={p.invest_plan_id || p.id} plan={p} onStart={onStart} />)}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function PlanTierCard({ plan, onStart }: { plan: any; onStart: (planId: number | string) => void }) {
  const pct = parseFloat(plan.percentage) || 0;
  const days = parseInt(plan.duration) || 0;
  const roi = pct * days; // projected total ROI over the cycle, %

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold text-fg">{plan.name}</div>
        <Badge tone="accent">
          <Clock className="size-3" /> {days}-day cycle
        </Badge>
      </div>

      <div className="mt-3 text-[20px] font-semibold tracking-tight tabular text-fg">
        {formatMoney(plan.min_amount)}
        <span className="text-fg-muted text-sm font-normal"> – {formatMoney(plan.max_amount)}</span>
      </div>
      <div className="text-[11px] uppercase tracking-wider text-fg-subtle font-semibold mt-0.5">Stake range</div>

      <div className="mt-3 space-y-1.5 text-[12px] text-fg-muted">
        <div className="flex items-center justify-between">
          <span>Daily rate</span>
          <span className="font-mono text-accent">{pct}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Projected ROI</span>
          <span className="font-mono text-success inline-flex items-center gap-1">
            <TrendingUp className="size-3" /> {roi.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Locked until</span>
          <span className="font-mono">maturity</span>
        </div>
      </div>

      <Button
        size="sm"
        className="mt-4 w-full"
        onClick={() => onStart(plan.invest_plan_id || plan.id)}
      >
        Start cycle
      </Button>
    </div>
  );
}
