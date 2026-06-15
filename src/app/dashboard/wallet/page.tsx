'use client';

import { useState } from 'react';
import {
  ArrowDownToLine, Copy, ExternalLink, KeyRound, Plus, RefreshCw,
  ShieldCheck, Smartphone, UploadCloud, Wallet as WalletIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader, CardDivider } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TokenIcon } from '@/components/ui/TokenIcon';
import { IconSelect } from '@/components/ui/IconSelect';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ToastProvider';
import { useWallet } from '@/components/wallet/WalletProvider';
import { WalletCreateDialog } from '@/components/wallet/WalletCreateDialog';
import { WalletDepositDialog } from '@/components/wallet/WalletDepositDialog';
import { WalletImportDialog } from '@/components/wallet/WalletImportDialog';
import { WalletRevealDialog } from '@/components/wallet/WalletRevealDialog';
import { MobileWalletGuide } from '@/components/wallet/MobileWalletGuide';
import { CHAINS, shortAddress } from '@/lib/wallet';
import { relativeTime } from '@/lib/ui';

export default function WalletPage() {
  const { address, hasWallet, chain, chainId, setChainId, balance, loadingBalance, refreshBalance, lastUpdated } = useWallet();
  const { toast } = useToast() || { toast: (() => {}) as any };
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    toast('Address copied');
  };

  return (
    <>
      <PageHeader
        title="Wallet"
        description="Your non-custodial BEX wallet. Keys live on this device only."
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Wallet' }]}
        actions={hasWallet ? (
          <Button leadingIcon={<ArrowDownToLine className="size-4" />} onClick={() => setDepositOpen(true)}>
            Deposit to BEX
          </Button>
        ) : (
          <>
            <Button variant="secondary" leadingIcon={<UploadCloud className="size-4" />} onClick={() => setImportOpen(true)}>
              Import existing
            </Button>
            <Button leadingIcon={<Plus className="size-4" />} onClick={() => setCreateOpen(true)}>
              Create wallet
            </Button>
          </>
        )}
      />

      {!hasWallet ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<WalletIcon />}
              title="No wallet on this device"
              description="Create a new wallet or import one from a 12-word recovery phrase. Keys are generated and encrypted locally on your device."
              action={
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button onClick={() => setCreateOpen(true)} leadingIcon={<Plus className="size-4" />}>Create wallet</Button>
                  <Button variant="secondary" onClick={() => setImportOpen(true)} leadingIcon={<UploadCloud className="size-4" />}>Import</Button>
                </div>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
          <div className="space-y-6">
            {/* Balance hero */}
            <Card className="overflow-hidden">
              <div className="p-5 sm:p-6 grid sm:grid-cols-[1fr_auto] gap-4 items-center">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold flex items-center gap-2">
                    Balance · {chain.name}
                    {chain.testnet && <Badge tone="warning">testnet</Badge>}
                  </div>
                  <div className="mt-1 flex items-center gap-2.5">
                    <TokenIcon chainId={chain.id} symbol={chain.symbol} size={36} />
                    <span className="text-5xl font-semibold tracking-tight tabular text-fg">
                      {balance != null ? Number(balance).toFixed(6) : '—'}
                    </span>
                    <span className="text-lg text-fg-muted font-semibold">{chain.symbol}</span>
                  </div>
                  <div className="mt-1 text-xs text-fg-subtle flex items-center gap-2">
                    {lastUpdated ? `Updated ${relativeTime(new Date(lastUpdated).toISOString())}` : 'Awaiting update…'}
                    <button onClick={refreshBalance} className="text-fg-subtle hover:text-fg transition-colors">
                      <RefreshCw className={`size-3 ${loadingBalance ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
                <div className="sm:w-48">
                  <label className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">Network</label>
                  <IconSelect
                    className="mt-1"
                    value={String(chainId)}
                    onChange={(v) => setChainId(Number(v))}
                    options={Object.values(CHAINS).map((c) => ({
                      value: String(c.id),
                      label: c.name + (c.testnet ? ' (testnet)' : ''),
                      icon: <TokenIcon chainId={c.id} symbol={c.symbol} size={20} />,
                    }))}
                  />
                </div>
              </div>
              <CardDivider />
              <div className="p-5 flex flex-col sm:flex-row gap-2">
                <Button onClick={() => setDepositOpen(true)} leadingIcon={<ArrowDownToLine className="size-4" />}>
                  Deposit to BEX
                </Button>
                <a href={`${chain.explorer}/address/${address}`} target="_blank" rel="noreferrer">
                  <Button variant="secondary" leadingIcon={<ExternalLink className="size-4" />}>View on explorer</Button>
                </a>
                <Button variant="ghost" leadingIcon={<KeyRound className="size-4" />} onClick={() => setRevealOpen(true)} className="ml-auto">
                  Reveal keys
                </Button>
              </div>
            </Card>

            {/* Address card */}
            <Card>
              <CardHeader title="Receive funds" description="Send native tokens or compatible assets to this address." icon={<ArrowDownToLine className="size-4" />} />
              <CardDivider />
              <CardBody>
                <div className="p-3 rounded-lg border border-border bg-surface-sunk font-mono text-xs break-all text-fg select-all">
                  {address}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" leadingIcon={<Copy className="size-4" />} onClick={copyAddress}>Copy address</Button>
                  <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted ml-1">
                    <ShieldCheck className="size-3.5 text-accent" />
                    {shortAddress(address)}
                  </span>
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader
                title="Use this wallet on your phone"
                description="Import your 12-word phrase into any of these apps."
                icon={<Smartphone className="size-4" />}
              />
              <CardBody className="pt-1">
                <MobileWalletGuide />
              </CardBody>
            </Card>

            <Card variant="sunk">
              <CardBody className="p-4 text-xs text-fg-muted leading-relaxed">
                <p className="text-fg font-medium mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-accent" /> A reminder about safety
                </p>
                <ul className="space-y-1.5 list-disc pl-4">
                  <li>Anyone with your 12-word phrase controls this wallet — on any device, in any app.</li>
                  <li>BEX support will <em>never</em> ask for your phrase or private key.</li>
                  <li>If a site asks you to "validate" your phrase, it is a scam. Close the tab.</li>
                  <li>Keep a paper backup somewhere fire- and flood-safe.</li>
                </ul>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      <WalletCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <WalletImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <WalletDepositDialog open={depositOpen} onClose={() => setDepositOpen(false)} />
      <WalletRevealDialog open={revealOpen} onClose={() => setRevealOpen(false)} />
    </>
  );
}
