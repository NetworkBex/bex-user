'use client';

import Link from 'next/link';
import {
  ArrowDownToLine, ArrowRight, Copy, Plus, RefreshCw, Wallet as WalletIcon,
  CloudOff, CloudUpload, CheckCircle2,
} from 'lucide-react';
import { useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ToastProvider';
import { useWallet } from './WalletProvider';
import { WalletCreateDialog } from './WalletCreateDialog';
import { WalletDepositDialog } from './WalletDepositDialog';
import { shortAddress } from '@/lib/wallet';

/** Compact wallet summary surfaced on the main dashboard. */
export function WalletPanel() {
  const {
    address, hasWallet, chain, balance, loadingBalance, refreshBalance,
    syncedToServer, syncError, resyncToServer,
  } = useWallet();
  const { toast } = useToast() || { toast: (() => {}) as any };
  const [createOpen, setCreateOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [resyncing, setResyncing] = useState(false);

  if (!hasWallet) {
    return (
      <>
        <Card className="overflow-hidden">
          <CardBody className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <WalletIcon className="size-7 text-accent shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-fg">Create your BEX wallet</h3>
              <p className="text-sm text-fg-muted">
                Custodial recovery — keys generated in your browser, encrypted copy held by BEX.
              </p>
            </div>
            <Button leadingIcon={<Plus className="size-4" />} onClick={() => setCreateOpen(true)}>
              Create wallet
            </Button>
          </CardBody>
        </Card>
        <WalletCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      </>
    );
  }

  const copy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    toast('Address copied');
  };

  const handleResync = async () => {
    setResyncing(true);
    try {
      const ok = await resyncToServer();
      if (ok) toast('Wallet synced — admin can see it now');
      else if (syncError) toast(syncError, 'error');
    } finally {
      setResyncing(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader
          title="BEX wallet"
          description={chain.name}
          icon={<WalletIcon className="size-4" />}
          action={
            <Link href="/dashboard/wallet">
              <Button variant="ghost" size="sm" trailingIcon={<ArrowRight className="size-3.5" />}>Manage</Button>
            </Link>
          }
        />
        <CardBody className="pt-1 space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">Balance</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-semibold tabular text-fg">
                {balance != null ? Number(balance).toFixed(4) : '—'}
              </span>
              <span className="text-sm text-fg-muted font-medium">{chain.symbol}</span>
              <button
                onClick={refreshBalance}
                aria-label="Refresh balance"
                className="ml-auto text-fg-subtle hover:text-fg transition-colors"
              >
                <RefreshCw className={`size-3.5 ${loadingBalance ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {chain.testnet && <Badge tone="warning" className="mt-2">{chain.name} testnet</Badge>}
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-md bg-surface-sunk border border-hairline">
            <span className="font-mono text-xs text-fg-muted flex-1 truncate">{shortAddress(address, 10, 8)}</span>
            <button
              onClick={copy}
              aria-label="Copy address"
              className="text-fg-subtle hover:text-fg transition-colors"
            >
              <Copy className="size-3.5" />
            </button>
          </div>

          {/* Sync status — surfaces whether the admin can see this wallet. */}
          {syncedToServer ? (
            <div className="flex items-center gap-2 px-2.5 py-2 rounded-md border border-success/30 bg-success-soft text-xs text-success">
              <CheckCircle2 className="size-3.5 shrink-0" />
              <span>Synced to your BEX account — admin can see this wallet.</span>
            </div>
          ) : (
            <div className="flex items-start gap-2 px-2.5 py-2 rounded-md border border-warning/30 bg-warning-soft text-xs text-warning">
              <CloudOff className="size-3.5 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold">Local-only — admin can&apos;t see this wallet yet.</div>
                {syncError && <div className="mt-0.5 text-warning/90">{syncError}</div>}
              </div>
              <Button
                size="sm"
                variant="secondary"
                leadingIcon={<CloudUpload className="size-3.5" />}
                loading={resyncing}
                onClick={handleResync}
              >
                Sync
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" leadingIcon={<ArrowDownToLine className="size-4" />} onClick={() => setDepositOpen(true)}>
              Deposit to BEX
            </Button>
            <Link href="/dashboard/wallet" className="contents">
              <Button>Open wallet</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
      <WalletDepositDialog open={depositOpen} onClose={() => setDepositOpen(false)} />
    </>
  );
}
