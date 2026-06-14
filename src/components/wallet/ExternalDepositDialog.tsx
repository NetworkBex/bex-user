'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Hash, AlertTriangle, ArrowRight } from 'lucide-react';
import { transactionAPI } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';

export interface ExternalDepositDialogProps {
  open: boolean;
  onClose: () => void;
  amount: string;
  currency?: { id: string; symbol: string; name: string };
  chainName: string;
  depositAddress: string;
  onSubmitted?: () => void;
}

/**
 * External-wallet deposit flow: show exactly where to send, then require the
 * on-chain transaction hash so an admin can verify the transfer before it's
 * credited.
 */
export function ExternalDepositDialog({
  open, onClose, amount, currency, chainName, depositAddress, onSubmitted,
}: ExternalDepositDialogProps) {
  const { toast } = useToast() || { toast: (() => {}) as any };
  const [txHash, setTxHash] = useState('');
  const [sender, setSender] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) { setTxHash(''); setSender(''); setCopied(false); }
  }, [open]);

  const sym = currency?.symbol ?? '';
  const hasAddress = !!depositAddress;

  const copyAddr = async () => {
    if (!depositAddress) return;
    await navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    toast('Address copied');
    setTimeout(() => setCopied(false), 1500);
  };

  const submit = async () => {
    if (!currency) return;
    if (!txHash.trim()) { toast('Transaction hash is required', 'error'); return; }
    setLoading(true);
    try {
      await transactionAPI.deposit({
        amount,
        currency: currency.id,
        currency_symbol: currency.symbol,
        method: 'wallet',
        tx_hash: txHash.trim(),
        address: sender.trim() || undefined,
      });
      toast('Deposit submitted — pending verification');
      onClose();
      onSubmitted?.();
    } catch (err: any) {
      toast(err?.response?.data?.error || 'Deposit failed', 'error');
    } finally { setLoading(false); }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Deposit from an external wallet"
      description="Send the funds, then confirm with your transaction hash."
      maxWidth="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={submit} loading={loading} disabled={!txHash.trim()} leadingIcon={<ArrowRight className="size-4" />}>
            Submit deposit
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Step 1 — send */}
        <div>
          <StepLabel n={1} title="Send your deposit" />
          <p className="text-[13px] text-fg-muted mt-1.5">
            Send exactly <span className="text-fg font-semibold tabular">{amount || '0'} {sym}</span> on the{' '}
            <span className="text-fg font-medium">{chainName}</span> network to the address below.
          </p>

          {hasAddress ? (
            <div className="mt-3 flex flex-col sm:flex-row gap-3 items-center">
              <div className="rounded-xl border border-border bg-white p-2 shrink-0">
                <QRCodeSVG value={depositAddress} size={108} level="M" marginSize={1} />
              </div>
              <div className="min-w-0 w-full">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-fg-muted mb-1">
                  {sym} deposit address · {chainName}
                </div>
                <div className="rounded-lg border border-dashed border-border-strong bg-surface-sunk/40 p-2.5 font-mono text-[11.5px] break-all">
                  {depositAddress}
                </div>
                <Button variant="secondary" size="sm" className="mt-2" onClick={copyAddr}
                  leadingIcon={copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}>
                  {copied ? 'Copied' : 'Copy address'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex gap-2 p-3 rounded-lg border border-warning/30 bg-warning-soft text-xs text-fg">
              <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
              No deposit address is configured for {sym || 'this asset'} yet. Please contact support before sending.
            </div>
          )}

          <div className="mt-3 flex gap-2 p-3 rounded-lg border border-warning/30 bg-warning-soft text-xs text-fg">
            <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
            Send only <span className="font-semibold">{sym}</span> on the <span className="font-semibold">{chainName}</span> network.
            Sending a different asset or using the wrong network may result in permanent loss.
          </div>
        </div>

        {/* Step 2 — confirm */}
        <div>
          <StepLabel n={2} title="Confirm your transfer" />
          <div className="mt-2 space-y-3">
            <Field label="Transaction hash (tx hash)" required>
              <Input
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x… the hash from your wallet/explorer"
                className="font-mono text-xs"
                leadingIcon={<Hash className="size-4" />}
                required
              />
            </Field>
            <Field label="Your sending address" hint="optional">
              <Input
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder="0x… the wallet you sent from"
                className="font-mono text-xs"
              />
            </Field>
            <p className="text-[11.5px] text-fg-subtle">
              Your deposit is credited once we verify the transaction on-chain — usually within minutes of network confirmation.
            </p>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function StepLabel({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid place-items-center size-5 rounded-full bg-accent text-accent-fg text-[11px] font-bold">{n}</span>
      <span className="text-[13px] font-semibold text-fg">{title}</span>
    </div>
  );
}
