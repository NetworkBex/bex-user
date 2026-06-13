'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, Coins, CreditCard, Wallet, Copy, Info, Sparkles } from 'lucide-react';
import { transactionAPI, paymentAPI } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader, CardDivider } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useWallet } from '@/components/wallet/WalletProvider';
import { WalletDepositDialog } from '@/components/wallet/WalletDepositDialog';
import { CHAINS, currenciesForChain, currencyById } from '@/lib/wallet';
import { formatMoney } from '@/lib/ui';

const METHODS = [
  { id: 'bex_wallet', label: 'BEX wallet',       desc: 'Send instantly from your in-browser wallet.', icon: <Wallet className="size-4" /> },
  { id: 'wallet',     label: 'External wallet',  desc: 'Send from any external Web3 wallet.',         icon: <Wallet className="size-4" /> },
  { id: 'nowpayments',label: 'NOWPayments',      desc: 'Hosted checkout, 40+ assets.',                icon: <CreditCard className="size-4" /> },
];

const QUICK = [100, 500, 1_000, 5_000, 10_000];

export default function DepositPage() {
  const { toast } = useToast() || { toast: (() => {}) as any };
  const { hasWallet, chain, chainId, setChainId, balance } = useWallet();

  const [amount, setAmount] = useState('');
  const [networkId, setNetworkId] = useState<number>(chainId);
  const [currencyId, setCurrencyId] = useState<string>('');
  const [method, setMethod] = useState('bex_wallet');
  const [loading, setLoading] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Keep local network in sync if the user changes it in the wallet provider.
  useEffect(() => { setNetworkId(chainId); }, [chainId]);

  // Currency list is fully derived from the chosen network — no backend needed.
  const currencies = useMemo(() => currenciesForChain(networkId), [networkId]);

  // Whenever the network changes (or currencies populate), pick the first stable
  // (USDC/USDT) by default, else the native asset.
  useEffect(() => {
    if (currencies.length === 0) { setCurrencyId(''); return; }
    if (!currencies.find((c) => c.id === currencyId)) {
      const stable = currencies.find((c) => c.symbol === 'USDC') ?? currencies.find((c) => !c.native) ?? currencies[0];
      setCurrencyId(stable.id);
    }
  }, [currencies, currencyId]);

  const chosenCurrency = currencyById(currencyId);
  const chosenChain = CHAINS[networkId] ?? chain;

  const handleNetwork = (id: number) => {
    setNetworkId(id);
    // Propagate to the wallet provider so the BEX wallet operates on the
    // matching chain when the user uses that deposit method.
    if (method === 'bex_wallet') setChainId(id);
  };

  // Step 1 — validate the form, then ask the user to reconfirm.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !chosenCurrency) return;
    setConfirmOpen(true);
  };

  // Step 2 — route to the chosen method, only after explicit confirmation.
  const executeDeposit = async () => {
    if (!amount || !chosenCurrency) return;

    // BEX wallet → in-browser signing flow
    if (method === 'bex_wallet') { setConfirmOpen(false); setWalletDialogOpen(true); return; }

    // NOWPayments → backend creates a hosted invoice, we redirect
    if (method === 'nowpayments') {
      setLoading(true);
      try {
        const res = await paymentAPI.createInvoice({
          amount,
          currency: 'usd',
          // If the user picked a stable, ask NOWPayments to charge in it.
          // Otherwise leave blank to let the hosted invoice show all coins.
          pay_currency: chosenCurrency.symbol.toLowerCase(),
        });
        const url = res.data?.invoice_url;
        if (!url) {
          toast('Could not open NOWPayments checkout', 'error');
          return;
        }
        // Hand off to NOWPayments. The hosted invoice will redirect back to
        // /dashboard/payments/<id> on success/cancel.
        window.location.href = url;
        return;
      } catch (err: any) {
        toast(err?.response?.data?.error || 'NOWPayments invoice failed', 'error');
        return;
      } finally { setLoading(false); }
    }

    // External wallet → request-only flow (admin approves later)
    setLoading(true);
    try {
      await transactionAPI.deposit({
        amount,
        currency: chosenCurrency.id,
        currency_symbol: chosenCurrency.symbol,
        chain_id: chosenChain.id,
        method,
      });
      toast('Deposit request submitted');
      setAmount('');
      setConfirmOpen(false);
    } catch (err: any) {
      toast(err?.response?.data?.error || 'Deposit failed', 'error');
    } finally { setLoading(false); }
  };

  const methodMeta = METHODS.find((m) => m.id === method);
  const confirmNote =
    method === 'bex_wallet'   ? "You'll sign this transfer with your BEX wallet in the next step."
    : method === 'nowpayments' ? "You'll be redirected to the NOWPayments hosted checkout to complete payment."
    : 'This submits a deposit request — your balance is credited after confirmation.';

  return (
    <>
      <PageHeader
        title="Deposit"
        description="Fund your BEX wallet. Receipts post on confirmation."
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Deposit' }]}
      />

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
        <Card>
          <CardHeader title="New deposit" icon={<ArrowDownToLine className="size-4" />} />
          <CardDivider />
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Field label="Amount" hint={chosenCurrency?.symbol ?? 'USD'} required>
                <Input
                  type="number"
                  step="0.000001"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  leadingIcon={<span className="text-fg-muted text-sm font-medium">{chosenCurrency?.native ? chosenCurrency.symbol : '$'}</span>}
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {QUICK.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmount(String(v))}
                      className="px-2 py-1 text-xs rounded-md border border-border bg-surface-sunk text-fg-muted hover:text-fg hover:border-border-strong transition-colors tabular"
                    >
                      {formatMoney(v, { decimals: 0 })}
                    </button>
                  ))}
                </div>
              </Field>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Network" required>
                  <Select value={networkId} onChange={(e) => handleNetwork(Number(e.target.value))} required>
                    {Object.values(CHAINS).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.testnet ? ' · testnet' : ''}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Currency" required>
                  <Select value={currencyId} onChange={(e) => setCurrencyId(e.target.value)} required>
                    {currencies.length === 0 && <option value="">No assets on this network</option>}
                    {currencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.symbol} · {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div>
                <div className="text-xs font-medium text-fg-muted mb-2">Method</div>
                <div className="grid sm:grid-cols-3 gap-2">
                  {METHODS.map((m) => {
                    const disabled = m.id === 'bex_wallet' && !hasWallet;
                    return (
                      <label
                        key={m.id}
                        className={`relative flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                          disabled
                            ? 'border-border bg-surface-sunk/40 opacity-60 cursor-not-allowed'
                            : method === m.id
                              ? 'border-accent bg-accent-soft/40 cursor-pointer'
                              : 'border-border bg-surface-sunk/40 hover:border-border-strong cursor-pointer'
                        }`}
                      >
                        <input
                          type="radio" name="method" value={m.id} checked={method === m.id}
                          onChange={() => setMethod(m.id)} disabled={disabled} className="sr-only"
                        />
                        <span className="text-accent shrink-0 mt-0.5">{m.icon}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-fg">{m.label}</span>
                          <span className="block text-xs text-fg-muted">{m.desc}</span>
                          {m.id === 'bex_wallet' && !hasWallet && (
                            <Badge tone="warning" className="mt-1.5">No wallet yet</Badge>
                          )}
                          {m.id === 'bex_wallet' && hasWallet && (
                            <Badge tone="accent" className="mt-1.5">
                              {Number(balance ?? 0).toFixed(4)} {chain.symbol}
                            </Badge>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <Button
                type="submit"
                loading={loading}
                className="w-full"
                size="lg"
                leadingIcon={!loading ? <ArrowDownToLine className="size-4" /> : undefined}
                disabled={!chosenCurrency || (method === 'bex_wallet' && !hasWallet)}
              >
                {loading ? 'Processing…' :
                 method === 'bex_wallet'  ? 'Continue with BEX wallet' :
                 method === 'nowpayments' ? 'Continue to NOWPayments' :
                                            'Submit deposit request'}
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="space-y-4">
          {/* Selection summary */}
          <Card variant="sunk">
            <CardBody className="p-4 space-y-2 text-[13px]">
              <Row label="Network"   value={`${chosenChain.name}${chosenChain.testnet ? ' · testnet' : ''}`} />
              <Row label="Asset"     value={chosenCurrency ? `${chosenCurrency.symbol} (${chosenCurrency.name})` : '—'} />
              {chosenCurrency?.contract && (
                <Row label="Contract" mono value={`${chosenCurrency.contract.slice(0, 10)}…${chosenCurrency.contract.slice(-4)}`} />
              )}
              {chosenCurrency?.native && <Row label="Asset type" value="Native" />}
            </CardBody>
          </Card>

          {method === 'bex_wallet' && (
            <Card>
              <CardHeader title="BEX wallet" icon={<Sparkles className="size-4" />} description={hasWallet ? `${chain.name} · ready to sign` : 'Create one to use this method'} />
              <CardBody className="pt-1 text-xs text-fg-muted">
                The transaction is signed on your device and broadcast directly to the network.
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Wallet address" icon={<Coins className="size-4" />} description={`BEX-controlled address on ${chosenChain.name}.`} />
            <CardBody className="pt-1 space-y-3">
              <div className="p-3 rounded-lg border border-dashed border-border-strong bg-surface-sunk/40 font-mono text-xs break-all">
                0x9a2c1f4d8e6b3a91c5d72f8e6b3a91c5d72f6b1f
              </div>
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<Copy className="size-3.5" />}
                onClick={() => { navigator.clipboard.writeText('0x9a2c1f4d8e6b3a91c5d72f8e6b3a91c5d72f6b1f'); toast('Address copied'); }}
              >
                Copy address
              </Button>
              <p className="text-[12px] text-fg-muted">
                Make sure you're sending on the <span className="text-fg font-medium">{chosenChain.name}</span> network — funds sent on the wrong chain may be lost.
              </p>
            </CardBody>
          </Card>

          <Card variant="sunk">
            <CardBody className="p-4 flex gap-3">
              <Info className="size-4 text-accent mt-0.5 shrink-0" />
              <div className="text-xs text-fg-muted">
                <p className="text-fg font-medium mb-1">A note on confirmations</p>
                Deposits clear after the network confirms your transaction. ETH typically settles in 1–2 minutes; BTC up to 30. You'll see <Badge tone="success" className="mx-1">Completed</Badge> here when receipts post.
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <WalletDepositDialog
        open={walletDialogOpen}
        onClose={() => setWalletDialogOpen(false)}
        currencyId={chosenCurrency?.id ? undefined : undefined}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={executeDeposit}
        loading={loading}
        title="Confirm deposit"
        confirmLabel="Confirm deposit"
        rows={[
          { label: 'Amount', value: chosenCurrency?.native ? `${amount} ${chosenCurrency.symbol}` : formatMoney(parseFloat(amount) || 0, { decimals: 2 }) },
          { label: 'Asset', value: chosenCurrency ? `${chosenCurrency.symbol} · ${chosenCurrency.name}` : '—' },
          { label: 'Network', value: chosenChain.name },
          { label: 'Method', value: methodMeta?.label ?? method },
        ]}
        note={confirmNote}
      />
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-fg-muted">{label}</span>
      <span className={`${mono ? 'font-mono text-xs' : ''} text-fg`}>{value}</span>
    </div>
  );
}
