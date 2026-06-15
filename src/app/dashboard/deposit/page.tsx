'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, Coins, CreditCard, Wallet, Copy, Info, Sparkles } from 'lucide-react';
import { transactionAPI, paymentAPI, coreAPI } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader, CardDivider } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { TokenIcon } from '@/components/ui/TokenIcon';
import { IconSelect } from '@/components/ui/IconSelect';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useWallet } from '@/components/wallet/WalletProvider';
import { WalletDepositDialog } from '@/components/wallet/WalletDepositDialog';
import { ExternalDepositDialog } from '@/components/wallet/ExternalDepositDialog';
import { CHAINS, currenciesForChain, currencyById } from '@/lib/wallet';
import { formatMoney } from '@/lib/ui';

// NOWPayments is the primary method (shown first, default-selected) and is
// presented generically — the gateway brand is never surfaced to users.
const METHODS = [
  { id: 'nowpayments',label: 'Instant deposit',  desc: 'Pay by card or 40+ cryptocurrencies — auto-credited on confirmation.', icon: <CreditCard className="size-4" /> },
  { id: 'bex_wallet', label: 'BEX wallet',       desc: 'Send instantly from your in-browser wallet.', icon: <Wallet className="size-4" /> },
  { id: 'wallet',     label: 'External wallet',  desc: 'Send from any external Web3 wallet.',         icon: <Wallet className="size-4" /> },
];

const QUICK = [100, 500, 1_000, 5_000, 10_000];

export default function DepositPage() {
  const { toast } = useToast() || { toast: (() => {}) as any };
  const { hasWallet, chain, chainId, setChainId, balance } = useWallet();

  const [amount, setAmount] = useState('');
  const [networkId, setNetworkId] = useState<number>(chainId);
  const [currencyId, setCurrencyId] = useState<string>('');
  const [method, setMethod] = useState('nowpayments');
  const [loading, setLoading] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [extDepositOpen, setExtDepositOpen] = useState(false);
  // Backend-managed deposit addresses keyed by asset symbol.
  const [depositAddrs, setDepositAddrs] = useState<Record<string, string>>({});

  // Keep local network in sync if the user changes it in the wallet provider.
  useEffect(() => { setNetworkId(chainId); }, [chainId]);

  // Load the BEX-controlled deposit addresses (per currency) from the backend.
  useEffect(() => {
    coreAPI.currencies().then((rows: any[]) => {
      // Admin-managed deposit addresses (Content → Currencies), keyed by
      // ticker so the External-wallet flow always uses what the admin saved.
      const m: Record<string, string> = {};
      for (const c of rows) {
        const ticker = String(c.currency ?? '').trim().toUpperCase();
        const addr = String(c.address ?? '').trim();
        if (ticker && addr) m[ticker] = addr;
      }
      setDepositAddrs(m);
    }).catch(() => {});
  }, []);

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
  const depositAddress = chosenCurrency ? (depositAddrs[chosenCurrency.symbol.toUpperCase()] || '') : '';

  const handleNetwork = (id: number) => {
    setNetworkId(id);
    // Propagate to the wallet provider so the BEX wallet operates on the
    // matching chain when the user uses that deposit method.
    if (method === 'bex_wallet') setChainId(id);
  };

  // Step 1 — validate, then route. External wallet opens a dedicated
  // instructions + tx-hash dialog; the rest go through the confirm step.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !chosenCurrency) return;
    if (method === 'wallet') { setExtDepositOpen(true); return; }
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
          toast('Could not open the checkout', 'error');
          return;
        }
        // Hand off to NOWPayments. The hosted invoice will redirect back to
        // /dashboard/payments/<id> on success/cancel.
        window.location.href = url;
        return;
      } catch (err: any) {
        toast(err?.response?.data?.error || 'Could not start the deposit', 'error');
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
    : method === 'nowpayments' ? "You'll be redirected to our secure checkout to complete payment."
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
                  <IconSelect
                    value={String(networkId)}
                    onChange={(v) => handleNetwork(Number(v))}
                    options={Object.values(CHAINS).map((c) => ({
                      value: String(c.id),
                      label: c.name + (c.testnet ? ' · testnet' : ''),
                      icon: <TokenIcon chainId={c.id} symbol={c.symbol} size={20} />,
                    }))}
                  />
                </Field>
                <Field label="Currency" required>
                  <IconSelect
                    value={currencyId}
                    placeholder={currencies.length === 0 ? 'No assets on this network' : 'Select asset'}
                    onChange={(v) => setCurrencyId(v)}
                    options={currencies.map((c) => ({
                      value: c.id,
                      label: c.symbol,
                      sublabel: c.name,
                      icon: <TokenIcon symbol={c.symbol} chainId={c.chainId} size={20} />,
                    }))}
                  />
                </Field>
              </div>

              <div>
                <div className="text-xs font-medium text-fg-muted mb-2">Method</div>

                {/* Featured — Instant deposit (primary) */}
                {(() => {
                  const m = METHODS.find((x) => x.id === 'nowpayments')!;
                  const active = method === m.id;
                  return (
                    <label className={`relative flex items-center gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      active ? 'border-accent bg-accent-soft/40' : 'border-border hover:border-border-strong'
                    }`}>
                      <input type="radio" name="method" value={m.id} checked={active} onChange={() => setMethod(m.id)} className="sr-only" />
                      <span className="grid place-items-center size-10 rounded-lg bg-accent text-accent-fg shrink-0">{m.icon}</span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="text-[15px] font-semibold text-fg">{m.label}</span>
                          <Badge tone="accent">Recommended</Badge>
                        </span>
                        <span className="block text-[12.5px] text-fg-muted mt-0.5">{m.desc}</span>
                      </span>
                      <span className={`size-4 rounded-full border-2 shrink-0 ${active ? 'border-accent bg-accent' : 'border-border'}`} />
                    </label>
                  );
                })()}

                {/* Divider */}
                <div className="my-3 flex items-center gap-3 text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">
                  <span className="h-px flex-1 bg-hairline" /> or deposit from a crypto wallet <span className="h-px flex-1 bg-hairline" />
                </div>

                {/* Secondary — wallet methods */}
                <div className="grid sm:grid-cols-2 gap-2">
                  {METHODS.filter((x) => x.id !== 'nowpayments').map((m) => {
                    const disabled = m.id === 'bex_wallet' && !hasWallet;
                    const active = method === m.id;
                    return (
                      <label
                        key={m.id}
                        className={`relative flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                          disabled
                            ? 'border-border bg-surface-sunk/40 opacity-60 cursor-not-allowed'
                            : active
                              ? 'border-accent bg-accent-soft/40 cursor-pointer'
                              : 'border-border bg-surface-sunk/40 hover:border-border-strong cursor-pointer'
                        }`}
                      >
                        <input
                          type="radio" name="method" value={m.id} checked={active}
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
                 method === 'nowpayments' ? 'Continue to checkout' :
                                            'Continue to deposit'}
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
            <CardHeader title={`${chosenCurrency?.symbol ?? 'Deposit'} address`} icon={<Coins className="size-4" />} description={`BEX-controlled address on ${chosenChain.name}.`} />
            <CardBody className="pt-1 space-y-3">
              {depositAddress ? (
                <>
                  <div className="p-3 rounded-lg border border-dashed border-border-strong bg-surface-sunk/40 font-mono text-xs break-all">
                    {depositAddress}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    leadingIcon={<Copy className="size-3.5" />}
                    onClick={() => { navigator.clipboard.writeText(depositAddress); toast('Address copied'); }}
                  >
                    Copy address
                  </Button>
                  <p className="text-[12px] text-fg-muted">
                    Make sure you're sending on the <span className="text-fg font-medium">{chosenChain.name}</span> network — funds sent on the wrong chain may be lost.
                  </p>
                </>
              ) : (
                <p className="text-[12px] text-fg-muted">
                  No deposit address is configured for {chosenCurrency?.symbol ?? 'this asset'} yet. Use <span className="text-fg font-medium">Instant deposit</span>, or contact support.
                </p>
              )}
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

      <ExternalDepositDialog
        open={extDepositOpen}
        onClose={() => setExtDepositOpen(false)}
        amount={amount}
        currency={chosenCurrency ? { id: chosenCurrency.id, symbol: chosenCurrency.symbol, name: chosenCurrency.name } : undefined}
        chainId={chosenChain.id}
        chainName={chosenChain.name}
        depositAddress={depositAddress}
        onSubmitted={() => setAmount('')}
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
