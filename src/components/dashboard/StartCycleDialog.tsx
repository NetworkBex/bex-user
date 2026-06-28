'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { investmentAPI } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CycleExplainer } from '@/components/dashboard/CycleExplainer';
import { formatMoney } from '@/lib/ui';

const MIN_CYCLE_DAYS = 7;

export interface StartCycleDialogProps {
  open: boolean;
  onClose: () => void;
  plans: any[];
  currencies: any[];
  /** Preselect this plan when the dialog opens (e.g. from a plan card). */
  initialPlanId?: number | string | null;
  onSuccess?: () => void;
}

/** Shared "Start a new cycle" dialog — used by the investments page and
 *  the plan tier cards on the live trades page. */
export function StartCycleDialog({ open, onClose, plans, currencies, initialPlanId, onSuccess }: StartCycleDialogProps) {
  const [amount, setAmount] = useState('');
  const [packageId, setPackageId] = useState('');
  const [currency, setCurrency] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { toast } = useToast() || { toast: (() => {}) as any };

  // Re-sync the preselected plan each time the dialog opens.
  useEffect(() => {
    if (open) setPackageId(initialPlanId != null ? String(initialPlanId) : '');
  }, [open, initialPlanId]);

  /** Sort plans by duration DESC, percentage ASC — visually enforces
   *  the "lower plan → higher duration" rule. Lower-tier plans appear
   *  first because they're longer. */
  const sortedPlans = useMemo(
    () => [...plans].sort((a: any, b: any) => {
      const da = parseInt(a.duration) || 0;
      const db = parseInt(b.duration) || 0;
      if (da !== db) return db - da;
      return parseFloat(a.percentage) - parseFloat(b.percentage);
    }),
    [plans],
  );

  const selectedPlan = sortedPlans.find((p: any) => String(p.invest_plan_id || p.id) === packageId);
  const durationTooShort = selectedPlan && parseInt(selectedPlan.duration) < MIN_CYCLE_DAYS;

  // Client-side range check against the selected plan (server re-validates).
  const amountNum = parseFloat(amount);
  const outOfRange = !!selectedPlan && !!amount && !Number.isNaN(amountNum) &&
    (amountNum < parseFloat(selectedPlan.min_amount) || amountNum > parseFloat(selectedPlan.max_amount));

  // Step 1 — validate the form, then ask the user to reconfirm.
  const handleInvest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !packageId || !currency) return;
    if (outOfRange) {
      toast('Amount outside plan limits', 'error');
      return;
    }
    setConfirmOpen(true);
  };

  // Step 2 — open the cycle, only after explicit confirmation.
  const executeInvest = async () => {
    setLoading(true);
    try {
      await investmentAPI.create({ amount, package: parseInt(packageId), currency: parseInt(currency) });
      toast('Cycle started');
      setAmount('');
      setConfirmOpen(false);
      onClose();
      onSuccess?.();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Investment failed', 'error');
    } finally { setLoading(false); }
  };

  const selectedCurrency = currencies.find((c: any) => String(c.currency_id || c.id) === currency);
  const projectedProfit = selectedPlan && !Number.isNaN(amountNum)
    ? (parseFloat(selectedPlan.percentage) / 100) * (parseInt(selectedPlan.duration) || 0) * (amountNum || 0)
    : 0;

  return (
    <>
    <Dialog
      open={open}
      onClose={onClose}
      title="Start a new cycle"
      description="Configure your stake, plan, and funding currency. Earnings credit daily."
      maxWidth="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button form="invest-form" type="submit" loading={loading}>Start cycle</Button>
        </div>
      }
    >
      <form id="invest-form" onSubmit={handleInvest} className="space-y-4">
        <CycleExplainer />
        <Field label="Amount" hint="USD" required>
          <Input
            type="number" step="0.01" min="0"
            value={amount} onChange={(e) => setAmount(e.target.value)} required
            leadingIcon={<span className="text-fg-muted text-sm font-medium">$</span>}
          />
          {outOfRange && (
            <div className="mt-2 text-[11px] text-danger inline-flex items-center gap-1">
              <AlertTriangle className="size-3" />
              This plan accepts ${selectedPlan.min_amount}–${selectedPlan.max_amount}
            </div>
          )}
        </Field>
        <Field label="Plan" required>
          <Select value={packageId} onChange={(e) => setPackageId(e.target.value)} required>
            <option value="">Select plan</option>
            {sortedPlans.map((p: any) => (
              <option key={p.invest_plan_id || p.id} value={p.invest_plan_id || p.id}>
                {p.name} · ${p.min_amount}–${p.max_amount} · {p.percentage}% / {p.duration}d
              </option>
            ))}
          </Select>
          {selectedPlan && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-fg-muted">
              <span className="inline-flex items-center gap-1">
                <Info className="size-3" />
                Min 7d · 0.16%–0.33% daily · {selectedPlan.duration} day cycle · locked until maturity
              </span>
              {durationTooShort && (
                <Badge tone="danger">
                  <AlertTriangle className="size-3" /> Below 7d
                </Badge>
              )}
            </div>
          )}
        </Field>
        <Field label="Funding currency" required>
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)} required>
            <option value="">Select currency</option>
            {currencies.map((c: any) => (
              <option key={c.currency_id || c.id} value={c.currency_id || c.id}>{c.currency}</option>
            ))}
          </Select>
        </Field>
      </form>
    </Dialog>

    <ConfirmDialog
      open={confirmOpen}
      onClose={() => setConfirmOpen(false)}
      onConfirm={executeInvest}
      loading={loading}
      title="Confirm investment"
      confirmLabel="Confirm & start"
      rows={[
        { label: 'Plan', value: selectedPlan?.name ?? '—' },
        { label: 'Stake', value: formatMoney(amountNum || 0, { decimals: 2 }) },
        { label: 'Duration', value: selectedPlan ? `${selectedPlan.duration}-day cycle` : '—' },
        { label: 'Daily rate', value: selectedPlan ? `${selectedPlan.percentage}%` : '—' },
        { label: 'Projected profit', value: formatMoney(projectedProfit, { decimals: 2 }) },
        { label: 'Funding currency', value: selectedCurrency?.currency ?? '—' },
      ]}
      note="Your stake is deducted from your balance immediately and stays locked until the cycle matures — early cashout is not available."
    />
    </>
  );
}
