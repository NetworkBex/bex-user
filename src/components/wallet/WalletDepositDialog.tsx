'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, ExternalLink, KeyRound } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { useToast } from '@/components/ToastProvider';
import { useWallet } from './WalletProvider';
import { transactionAPI, parseApiError } from '@/lib/api';
import {
  decryptKeystore, loadStoredKeystore, sendNative, shortAddress, TREASURY_ADDRESS,
} from '@/lib/wallet';

/**
 * Deposit native tokens from the user's BEX wallet INTO the BEX treasury.
 * Two-step:
 *   1. Sign + broadcast the on-chain transfer.
 *   2. Notify the backend so it can credit the user once the tx confirms.
 */
export function WalletDepositDialog({
  open, onClose, currencyId,
}: {
  open: boolean; onClose: () => void; currencyId?: number;
}) {
  const { toast } = useToast() || { toast: (() => {}) as any };
  const { address, chain, balance, refreshBalance } = useWallet();
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ hash: string; explorerUrl: string } | null>(null);

  useEffect(() => {
    if (open) { setAmount(''); setPassword(''); setResult(null); }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !password) return;
    const json = loadStoredKeystore();
    if (!json) { toast('No wallet on this device', 'error'); return; }
    setSubmitting(true);
    try {
      const wallet = await decryptKeystore(json, password);
      const tx = await sendNative({
        privateKey: wallet.privateKey,
        to: TREASURY_ADDRESS,
        amountEth: amount,
        chainId: chain.id,
      });
      setResult(tx);
      toast('Transaction broadcast');
      // Notify backend so it can match the deposit to this user.
      try {
        await transactionAPI.deposit({
          amount,
          currency: currencyId ?? 1,
          method: 'wallet',
          tx_hash: tx.hash,
          chain_id: chain.id,
        });
        toast('Deposit recorded — awaiting confirmations');
      } catch (err: any) {
        // The on-chain tx still went through; surface but don't roll back.
        toast(parseApiError(err, 'Recorded on-chain — backend notification failed'), 'error');
      }
      refreshBalance();
    } catch (err: any) {
      const m = err?.message?.toLowerCase() ?? '';
      toast(
        m.includes('password') ? 'Wrong password' :
        m.includes('insufficient') ? 'Insufficient balance for amount + gas' :
        err?.shortMessage ?? err?.message ?? 'Transaction failed',
        'error'
      );
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Deposit from BEX wallet`}
      description={`Transfer ${chain.symbol} from your BEX wallet to the BEX treasury on ${chain.name}.`}
      maxWidth="max-w-lg"
    >
      {result ? (
        <div className="space-y-4">
          <div className="p-4 rounded-lg border border-success/30 bg-success-soft">
            <p className="text-sm font-semibold text-fg">Transaction broadcast</p>
            <p className="text-xs text-fg-muted mt-1">
              Your funds will be credited once the network confirms the transaction (usually 1–2 minutes).
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-sunk p-3 space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">Tx hash</div>
            <code className="block font-mono text-xs text-fg break-all">{result.hash}</code>
          </div>
          <div className="flex justify-between">
            <a href={result.explorerUrl} target="_blank" rel="noreferrer">
              <Button variant="secondary" leadingIcon={<ExternalLink className="size-4" />}>View on explorer</Button>
            </a>
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="flex gap-3 p-3 rounded-lg border border-info/30 bg-info-soft text-xs text-fg">
            <ArrowDownToLine className="size-4 text-info shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-0.5">Network: {chain.name}</p>
              <p className="text-fg-muted">Available: <span className="font-mono">{balance ?? '0'} {chain.symbol}</span></p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface-sunk p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-fg-subtle">From</span>
              <span className="font-mono text-fg">{shortAddress(address)}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-fg-subtle">To (BEX treasury)</span>
              <span className="font-mono text-fg">{shortAddress(TREASURY_ADDRESS)}</span>
            </div>
          </div>

          <Field label={`Amount (${chain.symbol})`} required hint={balance ? `max ${balance}` : undefined}>
            <Input
              type="number" step="0.000001" min="0"
              value={amount} onChange={(e) => setAmount(e.target.value)}
              autoFocus required
            />
          </Field>

          <Field label="Wallet password" required>
            <Input
              type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              leadingIcon={<KeyRound />} required
            />
          </Field>

          <div className="flex gap-3 p-3 rounded-lg border border-warning/30 bg-warning-soft text-xs text-fg">
            <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
            <span>
              Gas fees on {chain.name} apply. Make sure you have a small buffer of {chain.symbol} for the transaction cost.
            </span>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={submitting}>Sign & send</Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
