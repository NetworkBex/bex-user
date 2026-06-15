'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpFromLine, Wallet, ShieldAlert } from 'lucide-react';
import { transactionAPI } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader, CardDivider } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Input';
import { TokenIcon } from '@/components/ui/TokenIcon';
import { IconSelect } from '@/components/ui/IconSelect';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useWallet } from '@/components/wallet/WalletProvider';
import { CHAINS, currenciesForChain, currencyById } from '@/lib/wallet';
import { formatMoney } from '@/lib/ui';

export default function WithdrawalPage() {
  const { toast } = useToast() || { toast: (() => {}) as any };
  const { chainId, setChainId, chain } = useWallet();
  const [amount, setAmount] = useState('');
  const [networkId, setNetworkId] = useState<number>(chainId);
  const [currencyId, setCurrencyId] = useState<string>('');
  const [address, setAddress] = useState('');
  const [method, setMethod] = useState('wallet');
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => { setNetworkId(chainId); }, [chainId]);

  const currencies = useMemo(() => currenciesForChain(networkId), [networkId]);

  useEffect(() => {
    if (currencies.length === 0) { setCurrencyId(''); return; }
    if (!currencies.find((c) => c.id === currencyId)) {
      const stable = currencies.find((c) => c.symbol === 'USDC') ?? currencies.find((c) => !c.native) ?? currencies[0];
      setCurrencyId(stable.id);
    }
  }, [currencies, currencyId]);

  const chosenCurrency = currencyById(currencyId);
  const chosenChain = CHAINS[networkId] ?? chain;

  const handleNetwork = (id: number) => { setNetworkId(id); setChainId(id); };

  // Step 1 — validate the form, then ask the user to reconfirm.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !chosenCurrency || !address) return;
    setConfirmOpen(true);
  };

  // Step 2 — actually submit, only after explicit confirmation.
  const executeWithdraw = async () => {
    if (!chosenCurrency) return;
    setLoading(true);
    try {
      await transactionAPI.withdraw({
        amount,
        currency: chosenCurrency.id,
        currency_symbol: chosenCurrency.symbol,
        chain_id: chosenChain.id,
        method,
        address,
      });
      toast('Withdrawal request submitted');
      setAmount(''); setAddress('');
      setConfirmOpen(false);
    } catch (err: any) {
      toast(err?.response?.data?.error || 'Withdrawal failed', 'error');
    } finally { setLoading(false); }
  };

  return (
    <>
      <PageHeader
        title="Withdraw"
        description="Send funds from your BEX wallet to any external address."
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Withdraw' }]}
      />

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
        <Card>
          <CardHeader title="New withdrawal" icon={<ArrowUpFromLine className="size-4" />} />
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

              <Field label="Destination wallet" required>
                <Input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  placeholder="0x… or your wallet identifier"
                  leadingIcon={<Wallet />}
                  className="font-mono text-xs"
                />
              </Field>

              <Field label="Method">
                <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="wallet">Wallet</option>
                  <option value="bank">Bank transfer</option>
                </Select>
              </Field>

              <Button
                type="submit"
                loading={loading}
                className="w-full"
                size="lg"
                disabled={!chosenCurrency}
              >
                {loading ? 'Processing…' : 'Request withdrawal'}
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card variant="sunk">
          <CardHeader title="Before you send" icon={<ShieldAlert className="size-4" />} />
          <CardBody className="text-sm text-fg-muted space-y-2.5 pt-1">
            <p><span className="text-fg font-medium">Double-check the address.</span> Crypto transactions are irreversible — if the network address is wrong, the funds are gone.</p>
            <p><span className="text-fg font-medium">Match the network.</span> Your destination must support <span className="text-fg">{chosenChain.name}</span> for {chosenCurrency?.symbol ?? 'the chosen asset'}.</p>
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
          { label: 'Amount', value: chosenCurrency?.native ? `${amount} ${chosenCurrency.symbol}` : formatMoney(parseFloat(amount) || 0, { decimals: 2 }) },
          { label: 'Asset', value: chosenCurrency ? `${chosenCurrency.symbol} · ${chosenCurrency.name}` : '—' },
          { label: 'Network', value: chosenChain.name },
          { label: 'Destination', value: <span className="font-mono text-xs">{address}</span> },
          { label: 'Method', value: method === 'bank' ? 'Bank transfer' : 'Wallet' },
        ]}
        note="Crypto withdrawals are irreversible — double-check the destination address before confirming."
      />
    </>
  );
}
