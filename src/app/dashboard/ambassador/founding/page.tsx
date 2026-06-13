'use client';

import { useEffect, useState } from 'react';
import {
  Gem, Lock, CheckCircle2, AlertTriangle, ShieldCheck, Star,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader, CardDivider } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ToastProvider';
import { useAmbassador } from '@/components/ambassador/AmbassadorProvider';
import { affiliateAPI } from '@/lib/api';
import { formatMoney } from '@/lib/ui';

export default function AmbassadorFoundingPage() {
  const { plan, me } = useAmbassador();
  const { toast } = useToast() || { toast: (() => {}) as any };
  const [slotsFilled, setSlotsFilled] = useState<number>(plan.founding.slotsFilled);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    affiliateAPI.foundingStatus()
      .then((res) => {
        const n = (res.data?.slots_filled ?? res.data?.slotsFilled);
        if (typeof n === 'number') setSlotsFilled(n);
      })
      .catch(() => {});
  }, []);

  const total = plan.founding.slotsTotal;
  const remaining = Math.max(0, total - slotsFilled);
  const pct = total > 0 ? (slotsFilled / total) * 100 : 0;
  const fullyBooked = remaining === 0;
  const isFounding = !!me?.isFoundingPartner;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    setSubmitting(true);
    try {
      await affiliateAPI.applyFounding({ investment_amount: amt, note });
      toast('Application submitted — we\'ll be in touch within 24h.');
      setOpen(false); setAmount(''); setNote('');
    } catch (err: any) {
      toast(err?.response?.data?.error ?? 'Submission failed', 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <>
      <PageHeader
        title="Founding Partner programme"
        description={`A strictly limited class of BEX ambassadors who join before public launch. First come, first in, first to earn.`}
      />

      {/* Slot counter */}
      <Card className="mb-6 overflow-hidden">
        <div className="p-5 md:p-6 grid md:grid-cols-[1fr_auto] gap-4 items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-wider text-fg-muted font-semibold">
              <Gem className="size-3.5 text-accent" /> Limited availability
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-[40px] font-semibold tracking-tight tabular text-fg leading-none">
                {remaining}
              </span>
              <span className="text-fg-muted">of {total} slots remaining</span>
            </div>
            <div className="mt-3 max-w-md">
              {slotsFilled > 0 ? (
                <>
                  <Progress value={pct} tone="accent" />
                  <div className="mt-1.5 text-[12px] text-fg-subtle tabular">{slotsFilled}/{total} claimed</div>
                </>
              ) : (
                // Pre-launch: don't show an empty "0/N claimed" bar — claims
                // open at the Global Launch.
                <div className="text-[12px] text-fg-subtle">
                  Claiming opens at the Global Launch — all {total} founding slots are available.
                </div>
              )}
            </div>
          </div>
          <div className="shrink-0">
            {isFounding ? (
              <Badge tone="accent" className="h-8 px-3 text-[13px]">
                <CheckCircle2 className="size-3.5" /> You're a Founding Partner
              </Badge>
            ) : fullyBooked ? (
              <Button variant="secondary" disabled>Programme closed</Button>
            ) : (
              <Button leadingIcon={<Gem className="size-4" />} onClick={() => setOpen(true)}>
                Apply now
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* What you get */}
      <h2 className="text-[18px] font-semibold text-fg mb-3">What Founding Partners receive</h2>
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Benefit
          icon={<Star />}
          title="Permanent rank-skipping acceleration"
          body="Founder status counts as pre-qualifying for Affiliate rank at launch — zero team volume required to open L1 and L2 commissions from Day 1."
        />
        <Benefit
          icon={<ShieldCheck />}
          title="Enhanced L1 commission"
          body={`Founding Partners earn ${plan.founding.l1CommissionRateBoost}% on L1 vs the standard ${plan.unilevel[0].rate}% — permanent, not time-limited.`}
        />
        <Benefit
          icon={<Gem />}
          title={`Pre-launch $${plan.tokenTicker} at $${plan.founding.preLaunchTokenPrice.toFixed(4)}`}
          body={`Half the TGE price of $${plan.founding.tgePrice.toFixed(4)}. Tiered allocations awarded based on investment size.`}
        />
        <Benefit
          icon={<Lock />}
          title="Lock-in protection"
          body={`Your rank-bonus rates are locked at launch-day rates for ${plan.founding.rateLockMonths} months regardless of future plan adjustments.`}
        />
      </div>

      {/* Pricing tiers — driven by plan data */}
      <Card className="mb-6">
        <CardHeader title="Pre-launch token tiers" description="Allocations awarded at the pre-launch price; vesting begins immediately at TGE." />
        <CardDivider />
        <div className="overflow-x-auto">
          <table className="w-full text-[14px] tabular border-separate border-spacing-0">
            <thead>
              <tr className="text-[12px] uppercase tracking-wider font-semibold text-fg-muted">
                <th className="text-left px-5 py-3 bg-surface-sunk border-b border-border">Minimum investment</th>
                <th className="text-right px-5 py-3 bg-surface-sunk border-b border-border">${plan.tokenTicker} awarded</th>
                <th className="text-right px-5 py-3 bg-surface-sunk border-b border-border">Cost at pre-launch</th>
                <th className="text-right px-5 py-3 bg-surface-sunk border-b border-border">Value at TGE</th>
              </tr>
            </thead>
            <tbody>
              {plan.founding.pricingTiers.map((t) => {
                const cost = t.tokensAwarded * plan.founding.preLaunchTokenPrice;
                const value = t.tokensAwarded * plan.founding.tgePrice;
                return (
                  <tr key={t.minInvestUsd} className="hover:bg-surface-sunk/50 transition-colors">
                    <td className="px-5 py-4 border-b border-hairline text-fg font-medium">{formatMoney(t.minInvestUsd, { decimals: 0 })}+</td>
                    <td className="px-5 py-4 border-b border-hairline text-right text-accent font-semibold">{t.tokensAwarded.toLocaleString()}</td>
                    <td className="px-5 py-4 border-b border-hairline text-right">{formatMoney(cost, { decimals: 0 })}</td>
                    <td className="px-5 py-4 border-b border-hairline text-right text-success font-semibold">{formatMoney(value, { decimals: 0 })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Disclaimer */}
      <Card variant="sunk">
        <CardBody className="p-4 flex gap-3 text-[13px] text-fg-muted">
          <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
          <span>
            <span className="text-fg font-medium">Important.</span> Founding Partner allocations are subject to KYC, jurisdictional checks, and the formal Partner Agreement.
            No income guarantee is made or implied. Past performance does not guarantee future results.
          </span>
        </CardBody>
      </Card>

      {/* Application dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Apply for Founding Partner status"
        description="Submit your application below — our partnerships team responds within 24 hours."
        maxWidth="max-w-lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button form="founding-form" type="submit" loading={submitting}>Submit application</Button>
          </div>
        }
      >
        <form id="founding-form" onSubmit={submit} className="space-y-4">
          <Field label="Intended investment" hint="USD" required>
            <Input
              type="number" min="500" step="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              leadingIcon={<span className="text-fg-muted text-sm font-medium">$</span>}
              required autoFocus
            />
          </Field>
          <Field label="Tell us about your network" hint="optional">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Audience size, channels, previous network-marketing experience…"
            />
          </Field>
        </form>
      </Dialog>
    </>
  );
}

function Benefit({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="p-5 rounded-lg border border-border bg-surface">
      <div className="flex items-center gap-2 mb-2 text-accent [&>svg]:size-4">{icon}</div>
      <h3 className="text-[15px] font-semibold text-fg">{title}</h3>
      <p className="text-[14px] text-fg-muted mt-1.5 leading-relaxed">{body}</p>
    </div>
  );
}
