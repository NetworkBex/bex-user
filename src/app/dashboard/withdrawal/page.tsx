'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpFromLine, Wallet, ShieldAlert } from 'lucide-react';
import { transactionAPI, authAPI } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader, CardDivider } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Input';
import { TokenIcon } from '@/components/ui/TokenIcon';
import { IconSelect } from '@/components/ui/IconSelect';
import { networkIcon } from '@/lib/tokenIcons';
import { WITHDRAW_ASSETS } from '@/lib/withdrawAssets';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatMoney } from '@/lib/ui';

const PCT = [25, 50, 75, 100];

export default function WithdrawalPage() {
  const { toast } = useToast() || { toast: (() => {}) as any };
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState('USDT');
  const [network, setNetwork] = useState('');
  const [address, setAddress] = useState('');
  const [method, setMethod] = useState('wallet');
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [balance, setBalance] = useState(0);
  const [cfg, setCfg] = useState<{ enabled: boolean; minUsd: number; maxUsd: number; feePercent: number; feeFlatUsd: number }>({
    enabled: true, minUsd: 0, maxUsd: 0, feePercent: 0, feeFlatUsd: 0,
  });

  useEffect(() => {
    authAPI.me().then((r) => setBalance(Number(r.data?.customer?.acc_balance ?? 0))).catch(() => {});
    transactionAPI.withdrawConfig().then((r) => setCfg(r.data)).catch(() => {});
  }, []);

  const assets = WITHDRAW_ASSETS;
  const networks = useMemo(
    () => WITHDRAW_ASSETS.find((a) => a.symbol === asset)?.networks ?? [],
    [asset],
  );

  // Keep the selected network valid for the chosen asset.
  useEffect(() => {
    if (networks.length === 0) { setNetwork(''); return; }
    if (!networks.includes(network)) setNetwork(networks[0]);
  }, [networks]); // eslint-disable-line react-hooks/exhaustive-deps

  const amt = parseFloat(amount) || 0;
  const fee = useMemo(() => {
    if (amt <= 0) return 0;
    return Math.round((cfg.feeFlatUsd + amt * (cfg.feePercent / 100)) * 100) / 100;
  }, [amt, cfg]);
  const net = Math.max(0, amt - fee);

  const error = (() => {
    if (amt <= 0) return null;
    if (cfg.minUsd && amt < cfg.minUsd) return `Minimum is ${formatMoney(cfg.minUsd)}`;
    if (cfg.maxUsd && amt > cfg.maxUsd) return `Maximum is ${formatMoney(cfg.maxUsd)}`;
    if (amt > balance) return 'Exceeds your available balance';
    if (fee >= amt) return 'Amount is too small to cover the fee';
    return null;
  })();

  const setPct = (p: number) => {
    const v = Math.floor((balance * p / 100) * 100) / 100;
    setAmount(String(v));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !asset || !network || !address) { toast('Fill in every field', 'error'); return; }
    if (error) { toast(error, 'error'); return; }
    setConfirmOpen(true);
  };

  const executeWithdraw = async () => {
    setLoading(true);
    try {
      await transactionAPI.withdraw({
        amount, currency: asset, currency_symbol: asset, network, method, address,
      });
      toast('Withdrawal request submitted');
      setAmount(''); setAddress('');
      setConfirmOpen(false);
      authAPI.me().then((r) => setBalance(Number(r.data?.customer?.acc_balance ?? 0))).catch(() => {});
    } catch (err: any) {
      toast(err?.response?.data?.error || 'Withdrawal failed', 'error');
    } finally { setLoading(false); }
  };

  return (
    <>
      <PageHeader
        title="Withdraw"
        description="Send funds from your BEX balance to any external address."
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Withdraw' }]}
      />

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
        <Card>
          <CardHeader title="New withdrawal" icon={<ArrowUpFromLine className="size-4" />}
            description={`Available balance: ${formatMoney(balance)}`} />
          <CardDivider />
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Field label="Amount" hint={error ? <span className="text-danger">{error}</span> : `USD · max ${formatMoney(balance)}`} required>
                <Input
                  type="number" step="0.01" min="0" placeholder="0.00"
                  value={amount} onChange={(e) => setAmount(e.target.value)} required
                  leadingIcon={<span className="text-fg-muted text-sm font-medium">$</span>}
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {PCT.map((p) => (
                    <button key={p} type="button" onClick={() => setPct(p)}
                      className="px-2 py-1 text-xs rounded-md border border-border bg-surface-sunk text-fg-muted hover:text-fg hover:border-border-strong transition-colors tabular">
                      {p === 100 ? 'Max' : `${p}%`}
                    </button>
                  ))}
                </div>
              </Field>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Asset" required>
                  <IconSelect
                    value={asset}
                    placeholder="Select asset"
                    onChange={setAsset}
                    options={assets.map((a) => ({ value: a.symbol, label: a.symbol, sublabel: a.name, icon: <TokenIcon symbol={a.symbol} size={20} /> }))}
                  />
                </Field>
                <Field label="Network" required>
                  <IconSelect
                    value={network}
                    placeholder={networks.length === 0 ? 'No networks for this asset' : 'Select network'}
                    onChange={setNetwork}
                    options={networks.map((n) => ({ value: n, label: n, icon: <TokenIcon symbol={n} src={networkIcon(n)} size={20} /> }))}
                  />
                </Field>
              </div>

              <Field label="Destination wallet" required>
                <Input
                  type="text" value={address} onChange={(e) => setAddress(e.target.value)} required
                  placeholder="Your external wallet address"
                  leadingIcon={<Wallet />} className="font-mono text-xs"
                />
              </Field>

              <Field label="Method">
                <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="wallet">Crypto wallet</option>
                  <option value="bank">Bank transfer</option>
                </Select>
              </Field>

              {/* Fee + net summary */}
              <div className="rounded-lg border border-border bg-surface-sunk/50 p-3 space-y-1.5 text-[13px]">
                <SumRow label="Amount" value={formatMoney(amt)} />
                <SumRow label={`Fee${cfg.feePercent ? ` (${cfg.feePercent}%${cfg.feeFlatUsd ? ' + ' + formatMoney(cfg.feeFlatUsd) : ''})` : cfg.feeFlatUsd ? ' (flat)' : ''}`} value={`− ${formatMoney(fee)}`} muted />
                <div className="h-px bg-hairline my-1" />
                <SumRow label="You'll receive" value={formatMoney(net)} strong />
              </div>

              <Button type="submit" loading={loading} className="w-full" size="lg"
                disabled={!asset || !network || !!error || amt <= 0 || !cfg.enabled}>
                {!cfg.enabled ? 'Withdrawals disabled' : loading ? 'Processing…' : 'Request withdrawal'}
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card variant="sunk">
          <CardHeader title="Before you send" icon={<ShieldAlert className="size-4" />} />
          <CardBody className="text-sm text-fg-muted space-y-2.5 pt-1">
            <p><span className="text-fg font-medium">Double-check the address.</span> Crypto transactions are irreversible — if the address is wrong, the funds are gone.</p>
            <p><span className="text-fg font-medium">Match the network.</span> Your destination must support <span className="text-fg">{asset}</span> on <span className="text-fg">{network || 'the chosen network'}</span>.</p>
            <p><span className="text-fg font-medium">Limits.</span> Min {formatMoney(cfg.minUsd)}{cfg.maxUsd ? ` · max ${formatMoney(cfg.maxUsd)}` : ''}{(cfg.feePercent || cfg.feeFlatUsd) ? ` · fee ${cfg.feePercent ? cfg.feePercent + '%' : ''}${cfg.feeFlatUsd ? (cfg.feePercent ? ' + ' : '') + formatMoney(cfg.feeFlatUsd) : ''}` : ' · no fee'}.</p>
            <p><span className="text-fg font-medium">Approval window.</span> Withdrawals are reviewed and typically settle within 1 business day.</p>
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={executeWithdraw}
        loading={loading}
        title="Confirm withdrawal"
        confirmLabel="Confirm withdrawal"
        rows={[
          { label: 'Amount', value: formatMoney(amt) },
          { label: 'Fee', value: `− ${formatMoney(fee)}` },
          { label: "You'll receive", value: formatMoney(net) },
          { label: 'Asset', value: `${asset} · ${network}` },
          { label: 'Destination', value: <span className="font-mono text-xs">{address}</span> },
          { label: 'Method', value: method === 'bank' ? 'Bank transfer' : 'Crypto wallet' },
        ]}
      />
    </>
  );
}

function SumRow({ label, value, muted, strong }: { label: string; value: string; muted?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? 'text-fg-subtle' : 'text-fg-muted'}>{label}</span>
      <span className={`tabular ${strong ? 'text-fg font-semibold' : muted ? 'text-fg-muted' : 'text-fg'}`}>{value}</span>
    </div>
  );
}
