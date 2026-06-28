'use client';

import Link from 'next/link';
import { CheckCircle2, Wallet, ArrowDownToLine, TrendingUp, ArrowRight, Rocket } from 'lucide-react';
import { useWallet } from '@/components/wallet/WalletProvider';

/**
 * Persistent 3-step onboarding checklist for new users. Auto-updates as each
 * task completes and hides permanently once all three are done.
 *   1. Create your BEX wallet
 *   2. Make your first deposit
 *   3. Activate your first cycle
 */
export function OnboardingChecklist({ funded, hasCycle }: { funded: boolean; hasCycle: boolean }) {
  const { hasWallet } = useWallet();

  const steps = [
    { done: hasWallet, label: 'Create Your BEX Wallet', desc: 'Generate your secure in-browser wallet.', href: '/dashboard/wallet', cta: 'Create wallet', icon: Wallet },
    { done: funded,    label: 'Make Your First Deposit', desc: 'Fund your account to get started.',       href: '/dashboard/deposit', cta: 'Deposit now', icon: ArrowDownToLine },
    { done: hasCycle,  label: 'Activate Your First Cycle', desc: 'Put your capital to work — earn daily.', href: '/dashboard/investments', cta: 'Start a cycle', icon: TrendingUp },
  ];

  const completed = steps.filter((s) => s.done).length;
  if (completed === steps.length) return null; // hide permanently once finished

  const nextIdx = steps.findIndex((s) => !s.done);

  return (
    <div className="mb-6 rounded-2xl border border-border bg-surface-sunk/40 overflow-hidden">
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-hairline">
        <span className="grid place-items-center size-9 rounded-xl bg-accent text-accent-fg shrink-0">
          <Rocket className="size-4.5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-fg">Get started in 3 steps</div>
          <div className="text-[12px] text-fg-muted">{completed} of {steps.length} complete</div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          {steps.map((s, i) => (
            <span key={i} className={`h-1.5 w-8 rounded-full ${s.done ? 'bg-accent' : 'bg-surface-2'}`} />
          ))}
        </div>
      </div>

      <ul className="divide-y divide-hairline">
        {steps.map((s, i) => {
          const isNext = i === nextIdx;
          return (
            <li key={i} className={`flex items-center gap-3 px-4 sm:px-5 py-3 ${isNext ? 'bg-accent-soft/30' : ''}`}>
              <span className={`grid place-items-center size-7 rounded-full shrink-0 ${s.done ? 'bg-success text-white' : isNext ? 'bg-accent text-accent-fg' : 'border-2 border-border text-fg-subtle'}`}>
                {s.done ? <CheckCircle2 className="size-4" /> : <s.icon className="size-3.5" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block text-[13.5px] font-medium ${s.done ? 'text-fg-muted line-through' : 'text-fg'}`}>
                  Step {i + 1}: {s.label}
                </span>
                {!s.done && <span className="block text-[12px] text-fg-muted">{s.desc}</span>}
              </span>
              {!s.done && isNext && (
                <Link
                  href={s.href}
                  className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-accent text-accent-fg text-[12.5px] font-semibold hover:brightness-110 transition"
                >
                  {s.cta} <ArrowRight className="size-3.5" />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
