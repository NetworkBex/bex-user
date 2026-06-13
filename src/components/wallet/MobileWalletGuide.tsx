'use client';

import { useState, type ReactElement } from 'react';
import { Smartphone, Apple, ChevronDown, ExternalLink, KeyRound } from 'lucide-react';
import { cn } from '@/lib/ui';
import {
  AppStoreBadge, CoinbaseWalletIcon, MetaMaskIcon, PlayStoreBadge,
  RainbowIcon, TrustWalletIcon,
} from './BrandIcons';

interface WalletApp {
  id: string;
  name: string;
  Icon: (props: { className?: string }) => ReactElement;
  tagline: string;
  ios: string;
  android: string;
  /** Step-by-step import instructions. Use {WORDS} to mean "your 12-word phrase". */
  steps: string[];
}

const APPS: WalletApp[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    Icon: ({ className }) => <MetaMaskIcon className={className} />,
    tagline: 'Most popular Ethereum wallet.',
    ios: 'https://apps.apple.com/app/metamask-blockchain-wallet/id1438144202',
    android: 'https://play.google.com/store/apps/details?id=io.metamask',
    steps: [
      'Install MetaMask from the App Store or Google Play, then open the app.',
      'Tap "Get started" → "Import an existing wallet".',
      'Skip the analytics prompt if shown.',
      'Enter your 12-word BEX recovery phrase in the exact order shown.',
      'Create an app password (this protects access on this device — it is NOT your recovery phrase).',
      'Your BEX wallet address will appear on the home screen. Done.',
    ],
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    Icon: ({ className }) => <TrustWalletIcon className={className} />,
    tagline: 'Multi-chain mobile wallet.',
    ios: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
    android: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
    steps: [
      'Install Trust Wallet and open it.',
      'Tap "I already have a wallet" → "Multi-Coin Wallet".',
      'Paste or type your 12-word BEX recovery phrase.',
      'Set a passcode. Your BEX address will appear under the Ethereum asset.',
    ],
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    Icon: ({ className }) => <CoinbaseWalletIcon className={className} />,
    tagline: 'Self-custody wallet by Coinbase.',
    ios: 'https://apps.apple.com/app/coinbase-wallet/id1278383455',
    android: 'https://play.google.com/store/apps/details?id=org.toshi',
    steps: [
      'Install Coinbase Wallet (self-custody — different from the Coinbase exchange app).',
      'Tap "Import wallet" → "Recovery phrase".',
      'Enter your 12-word BEX recovery phrase, then a device passcode.',
      'Your BEX address is now accessible across all supported chains.',
    ],
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    Icon: ({ className }) => <RainbowIcon className={className} />,
    tagline: 'Polished Ethereum wallet.',
    ios: 'https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021',
    android: 'https://play.google.com/store/apps/details?id=me.rainbow',
    steps: [
      'Install Rainbow and open it.',
      'Tap "I already have one" → "Restore with a recovery phrase".',
      'Enter your 12-word BEX recovery phrase.',
      'Set a device PIN. Your BEX address loads immediately.',
    ],
  },
];

export function MobileWalletGuide({ className }: { className?: string }) {
  const [openId, setOpenId] = useState<string>('metamask');

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-info-soft border border-info/20 text-xs text-fg-muted">
        <KeyRound className="size-3.5 text-info mt-0.5 shrink-0" />
        <span>
          Your <span className="font-medium text-fg">12-word recovery phrase</span> works in every wallet below.
          The app password you set during import is separate — it only protects access on that device.
        </span>
      </div>

      {APPS.map((app) => {
        const open = openId === app.id;
        return (
          <div key={app.id} className="rounded-lg border border-border bg-surface overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenId(open ? '' : app.id)}
              className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-surface-sunk/60 transition-colors"
            >
              <app.Icon className="size-8 rounded-md shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-fg">{app.name}</div>
                <div className="text-xs text-fg-muted truncate">{app.tagline}</div>
              </div>
              <ChevronDown className={cn('size-4 text-fg-subtle transition-transform shrink-0', open && 'rotate-180')} />
            </button>

            {open && (
              <div className="border-t border-hairline p-4 space-y-4 animate-fade-in">
                <ol className="space-y-2.5">
                  {app.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-fg">
                      <span className="text-accent font-semibold tabular w-5 shrink-0">{i + 1}.</span>
                      <span className="text-fg-muted">{step}</span>
                    </li>
                  ))}
                </ol>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a href={app.ios} target="_blank" rel="noreferrer"><AppStoreBadge /></a>
                  <a href={app.android} target="_blank" rel="noreferrer"><PlayStoreBadge /></a>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export const WALLET_APPS = APPS;
