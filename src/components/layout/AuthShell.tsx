'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { Logo, Mark } from '@/components/Logo';
import { PulseDot } from '@/components/ui/Badge';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1.05fr] bg-canvas text-fg">
      {/* Form pane */}
      <div className="flex flex-col px-6 py-8 lg:px-12 lg:py-10">
        <Link href="/" className="inline-flex w-fit"><Logo /></Link>

        <div className="flex-1 flex items-center">
          <div className="w-full max-w-sm mx-auto animate-rise-in">
            <h1 className="text-2xl font-semibold tracking-tight text-fg leading-tight">{title}</h1>
            {subtitle && <p className="text-sm text-fg-muted mt-2">{subtitle}</p>}
            <div className="mt-7">{children}</div>
            {footer && <div className="mt-6 text-center text-sm text-fg-muted">{footer}</div>}
          </div>
        </div>

        <div className="text-[11px] text-fg-subtle flex items-center justify-between">
          <span>© {new Date().getFullYear()} BEX Network</span>
          <Link href="/" className="hover:text-fg-muted transition-colors">← Back to home</Link>
        </div>
      </div>

      {/* Brand pane */}
      <BrandPane />
    </div>
  );
}

function BrandPane() {
  return (
    <div className="hidden lg:flex relative overflow-hidden bg-surface-sunk border-l border-hairline">
      <div className="absolute inset-0 grid-bg opacity-50 mask-radial-fade" />
      <div className="absolute -top-32 -right-32 size-96 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative w-full flex flex-col p-12 justify-between">
        <div className="flex items-center gap-2 text-xs text-fg-muted">
          <PulseDot tone="success" />
          <span>Mainnet · all systems operational</span>
        </div>

        <div className="space-y-7">
          <h2 className="text-4xl font-semibold tracking-tight text-fg leading-[1.1]">
            Execution you can <span className="text-gradient">prove</span>.
          </h2>
          <p className="text-base text-fg-muted max-w-md">
            Every BEX cycle is run by AI, signed by the protocol, and receipted on a public chain.
            Verify your own activity from any block explorer.
          </p>

          <div className="space-y-3 max-w-md">
            {[
              { i: <ShieldCheck className="size-4" />, t: 'Verification-first', d: 'Independently auditable on-chain receipts.' },
              { i: <Zap className="size-4" />,         t: 'Milestone cycles',   d: 'Structured access with hard ceilings.' },
              { i: <Sparkles className="size-4" />,    t: 'AI-routed',          d: 'Execution sized to your risk envelope.' },
            ].map((f) => (
              <div key={f.t} className="flex items-start gap-3 py-2.5">
                <span className="text-accent shrink-0 mt-0.5">{f.i}</span>
                <div>
                  <div className="text-sm font-semibold text-fg">{f.t}</div>
                  <div className="text-xs text-fg-muted">{f.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-fg-subtle font-mono">
          <Mark size={20} accent />
          <span>cycle 28,401 · block 19,283,114</span>
        </div>
      </div>
    </div>
  );
}
