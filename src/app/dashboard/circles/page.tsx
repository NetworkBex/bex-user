'use client';

import { useEffect, useState } from 'react';
import {
  Orbit, Cpu, TrendingUp, CalendarClock, Wallet, ShieldCheck, Coins,
  ArrowRight, Sparkles, RefreshCw, BadgeCheck,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { coreAPI } from '@/lib/api';
import { InvestPlansSection } from '@/components/dashboard/InvestPlansSection';
import { StartCycleDialog } from '@/components/dashboard/StartCycleDialog';

export default function CirclesPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [initialPlanId, setInitialPlanId] = useState<number | string | null>(null);

  useEffect(() => {
    coreAPI.investPlans().then(setPlans).catch(() => {});
    coreAPI.currencies().then(setCurrencies).catch(() => {});
  }, []);

  const start = (planId: number | string) => { setInitialPlanId(planId); setOpen(true); };

  return (
    <>
      <PageHeader
        title="Circles"
        description="How your capital earns on BEX — explained."
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Circles' }]}
      />

      {/* ── What is a Circle ─────────────────────────────────────── */}
      <Card className="relative overflow-hidden mb-6">
        <div aria-hidden className="absolute -top-16 -right-16 size-56 rounded-full bg-accent/10 blur-3xl" />
        <CardBody className="relative p-5 sm:p-7">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="grid place-items-center size-10 rounded-xl bg-accent text-accent-fg shrink-0">
              <Orbit className="size-5" />
            </span>
            <div>
              <h2 className="text-[18px] font-bold text-fg">What is a Circle?</h2>
              <p className="text-[12.5px] text-fg-muted">A complete earning cycle, start to finish.</p>
            </div>
          </div>
          <p className="text-[14px] leading-relaxed text-fg-muted max-w-2xl">
            A <span className="text-fg font-semibold">Circle</span> is a fixed-duration earning cycle. You allocate
            capital to an access tier, and the BEX AI engine puts it to work executing trades on{' '}
            <span className="text-fg font-semibold">Hyperliquid</span>. Profit is credited to your balance{' '}
            <span className="text-fg font-semibold">every day</span> the Circle runs. When it reaches maturity, your
            principal returns to your balance — ready to withdraw or roll into a new Circle.
          </p>

          <div className="mt-5 grid sm:grid-cols-3 gap-3">
            <Fact icon={<TrendingUp className="size-4" />} title="Earnings credited daily"
                  body="Your chosen tier's daily rate is added to your balance every day the Circle runs." />
            <Fact icon={<CalendarClock className="size-4" />} title="Runs for a fixed term"
                  body="Each tier has a set duration. Capital stays committed and locked until maturity." />
            <Fact icon={<Wallet className="size-4" />} title="Principal returns at maturity"
                  body="When the Circle completes, your principal unlocks — withdraw it or start a new Circle." />
          </div>
        </CardBody>
      </Card>

      {/* ── How it works ─────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader title="How a Circle works" icon={<RefreshCw className="size-4" />}
                    description="Four steps from funding to payout." />
        <CardBody className="pt-1">
          <ol className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <Step n={1} icon={<Coins className="size-4" />} title="Fund & choose a tier"
                  body="Deposit, then pick an access tier that matches your stake." />
            <Step n={2} icon={<Cpu className="size-4" />} title="AI executes"
                  body="The BEX engine trades your allocated capital on Hyperliquid." />
            <Step n={3} icon={<TrendingUp className="size-4" />} title="Earn daily"
                  body="Profit lands in your balance every day, automatically." />
            <Step n={4} icon={<BadgeCheck className="size-4" />} title="Mature & repeat"
                  body="At the end, principal unlocks. Withdraw or start again." />
          </ol>
        </CardBody>
      </Card>

      {/* ── Access tiers (live plans) ───────────────────────────── */}
      <div className="mb-6">
        <InvestPlansSection plans={plans} onStart={start} />
      </div>

      {/* ── Good to know ────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader title="Good to know" icon={<ShieldCheck className="size-4" />} />
        <CardBody className="pt-1 grid sm:grid-cols-2 gap-x-8 gap-y-3">
          {[
            ['When are earnings paid?', 'Daily — the day’s profit is credited automatically each evening while the Circle is active.'],
            ['Can I withdraw mid-cycle?', 'Your principal is locked until the Circle matures. Earned profit accrues to your balance as it’s credited.'],
            ['What decides my rate?', 'Each access tier sets its own daily rate and duration. Higher tiers run shorter, higher-rate cycles.'],
            ['What happens at maturity?', 'Your principal returns to your balance. You can withdraw it or start a fresh Circle right away.'],
            ['How do I start?', 'Pick a tier above and tap “Start cycle” — choose your amount and confirm.'],
            ['Is the rate guaranteed?', 'Projections are illustrative. Daily credits follow your tier’s published rate over the cycle.'],
          ].map(([q, a]) => (
            <div key={q} className="py-1">
              <div className="text-[13.5px] font-semibold text-fg">{q}</div>
              <div className="text-[12.5px] text-fg-muted mt-0.5 leading-relaxed">{a}</div>
            </div>
          ))}
        </CardBody>
      </Card>

      <StartCycleDialog
        open={open}
        onClose={() => setOpen(false)}
        plans={plans}
        currencies={currencies}
        initialPlanId={initialPlanId}
        onSuccess={() => setOpen(false)}
      />
    </>
  );
}

function Fact({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-sunk/40 p-3.5">
      <div className="flex items-center gap-2 text-accent">
        <span className="grid place-items-center size-7 rounded-lg bg-accent-soft">{icon}</span>
        <span className="text-[13px] font-semibold text-fg">{title}</span>
      </div>
      <p className="mt-2 text-[12px] text-fg-muted leading-relaxed">{body}</p>
    </div>
  );
}

function Step({ n, icon, title, body }: { n: number; icon: React.ReactNode; title: string; body: string }) {
  return (
    <li className="relative rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className="grid place-items-center size-7 rounded-full bg-accent text-accent-fg text-[12px] font-bold shrink-0">{n}</span>
        <span className="text-accent">{icon}</span>
      </div>
      <div className="mt-2.5 text-[13.5px] font-semibold text-fg">{title}</div>
      <p className="mt-1 text-[12px] text-fg-muted leading-relaxed">{body}</p>
    </li>
  );
}
