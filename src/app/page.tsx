'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, ArrowUpRight, ShieldCheck, Cpu, Activity, EyeOff, Network, Wallet,
  ChevronDown, Sparkles, CheckCircle2, Hexagon, Lock, GitBranch,
  FileCheck2, Boxes, Layers, Globe2, Receipt,
  Zap, Building2, Coins, TrendingUp, TrendingDown,
  Quote, Timer, Server, Cable, Plug, BookOpen, Send, Vote, Gavel,
  CircleCheckBig, Hash, Terminal, Users, Star, Trophy,
} from 'lucide-react';
import { Logo, Mark } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Badge, PulseDot, Kbd } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input, Select, Field } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Reveal } from '@/components/landing/Reveal';
import { Counter } from '@/components/landing/Counter';
import { LiveTradesFeed } from '@/components/dashboard/LiveTradesFeed';
import { formatMoney, formatCompact, cn } from '@/lib/ui';

// Mirrors backend/core/migrations/0008_retier_invest_plans.py — smaller
// stake range, longer cycle duration (inverse amount/duration model).
const PACKAGES: Record<string, { label: string; duration: number; suggested: number }> = {
  starter:        { label: 'Starter Access',        duration: 30, suggested: 0.2 },
  advanced:       { label: 'Advanced Access',       duration: 21, suggested: 0.24 },
  professional:   { label: 'Professional Access',   duration: 14, suggested: 0.28 },
  institutional:  { label: 'Institutional Access',  duration: 7,  suggested: 0.33 },
};

const EXECUTION_TICKER_PAIRS = ['ETH/USDC', 'BTC/USDC', 'ARB/USDC', 'SOL/USDC', 'OP/USDC', 'MATIC/USDC'] as const;

export default function HomePage() {
  return (
    <div className="min-h-screen bg-canvas text-fg">
      <MarketingNav />
      <LiveTicker />
      <Hero />
      <TrustStrip />
      <TickerDivider />
      <Services />
      <ExecutionShowcase />
      <TickerDivider />
      <NetworkStatus />
      <Calculator />
      <BusinessModel />
      <PartnerProgramme />
      <Governance />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <MarketingFooter />
    </div>
  );
}

/* ────────────────────────────── Nav ────────────────────────────── */

function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-canvas/70 border-b border-hairline">
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
        <Link href="/"><Logo /></Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-fg-muted">
          <a href="#services"     className="hover:text-fg transition-colors">Services</a>
          <a href="#showcase"     className="hover:text-fg transition-colors">How it works</a>
          <a href="#network"      className="hover:text-fg transition-colors">Network</a>
          <a href="#calculator"   className="hover:text-fg transition-colors">Returns</a>
          <a href="#governance"   className="hover:text-fg transition-colors">Governance</a>
          <a href="#faq"          className="hover:text-fg transition-colors">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-grid" />
          <Link href="/auth/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link href="/auth/register">
            <Button size="sm" trailingIcon={<ArrowRight className="size-3.5" />}>Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ────────────────────────────── Live ticker ────────────────────────────── */

// Deterministic seed of pairs + Δ% used in the marquee strips (avoids SSR drift)
const TAPE_ROWS: { pair: string; delta: number; hash: string }[] = (() => {
  const pairs = [...EXECUTION_TICKER_PAIRS];
  return pairs.map((p, i) => {
    const seed = i * 1.3;
    return {
      pair: p,
      delta: +(Math.sin(seed) * 0.4 + (i % 2 ? 0.6 : -0.2)).toFixed(2),
      hash: `0x${(Math.abs((i * 9973) % 0xfffff)).toString(16).padStart(5, '0')}…${(Math.abs((i * 4231) % 0xfff)).toString(16).padStart(3, '0')}`,
    };
  });
})();

function LiveTicker() {
  const items = [...TAPE_ROWS, ...TAPE_ROWS];
  return (
    <div className="relative border-b border-hairline bg-surface-sunk/40 overflow-hidden">
      {/* Subtle tick lines — mimics a real exchange tape */}
      <div aria-hidden className="absolute inset-y-0 left-1/4 w-px bg-hairline/60" />
      <div aria-hidden className="absolute inset-y-0 left-2/4 w-px bg-hairline/60" />
      <div aria-hidden className="absolute inset-y-0 left-3/4 w-px bg-hairline/60" />
      <div className="max-w-6xl mx-auto px-5 h-9 flex items-center gap-4 text-[11px] font-mono">
        <span className="shrink-0 flex items-center gap-1.5 text-fg-muted">
          <PulseDot tone="success" />
          live
        </span>
        <div className="flex-1 overflow-hidden mask-radial-fade">
          <div className="flex items-center gap-8 whitespace-nowrap animate-marquee">
            {items.map((row, i) => {
              const up = row.delta >= 0;
              return (
                <span key={`${row.pair}-${i}`} className="flex items-center gap-2">
                  <span className="text-fg">{row.pair}</span>
                  <span className={cn('tabular inline-flex items-center gap-0.5', up ? 'text-success' : 'text-danger')}>
                    {up ? '▲' : '▼'}{up ? '+' : ''}{row.delta.toFixed(2)}%
                  </span>
                  <span className="text-fg-subtle">verified · {row.hash}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Thinner tape used as a divider between sections.
function TickerDivider() {
  const items = [...TAPE_ROWS.slice(0, 4), ...TAPE_ROWS.slice(0, 4)];
  return (
    <div className="border-y border-hairline bg-surface-sunk/30 overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 h-8 flex items-center gap-3 text-[10.5px] font-mono text-fg-subtle">
        <Hash className="size-3 text-fg-subtle" />
        <div className="flex-1 overflow-hidden mask-radial-fade">
          <div className="flex items-center gap-6 whitespace-nowrap animate-marquee">
            {items.map((row, i) => (
              <span key={`${row.pair}-${i}`} className="flex items-center gap-2">
                <span className="text-fg-muted">{row.pair}</span>
                <span className="text-fg-subtle">verified</span>
                <span className="text-fg-subtle/60">·</span>
                <span className="text-fg-subtle">{row.hash}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────── Hero ────────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-hairline isolate">
      {/* Layered background: animated fine grid + perspective floor + ambient orbs + beam */}
      <HeroBackdrop />

      <div className="relative max-w-6xl mx-auto px-5 py-20 md:py-28 grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
        <div className="animate-rise-in">
          <Badge tone="accent" className="mb-5">
            <Sparkles className="size-3" />
            Verification-first infrastructure · live on mainnet
          </Badge>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-fg leading-[1.05]">
            Trading operations <br />
            <span className="text-gradient">verified on-chain.</span>
          </h1>
          <p className="mt-5 text-base md:text-lg text-fg-muted max-w-xl leading-relaxed">
            BEX Network is the verification-first Web3 execution platform.
            Every cycle is run by AI, signed by the protocol, and receipted to
            a public blockchain — so you can audit what actually happened.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/auth/register">
              <Button size="lg" trailingIcon={<ArrowRight className="size-4" />}>
                Create your account
              </Button>
            </Link>
            <a href="#showcase">
              <Button size="lg" variant="secondary">See it run</Button>
            </a>
          </div>
          <div className="mt-8 flex items-center gap-5 text-xs text-fg-subtle">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-accent" /> Self-custody</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-accent" /> Public receipts</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-accent" /> AI-driven cycles</span>
          </div>
        </div>

        <HeroPreview />
      </div>

      {/* Ticker strip running across the bottom of the hero */}
      <PriceTickerStrip />
    </section>
  );
}

function HeroBackdrop() {
  return (
    <div aria-hidden className="absolute inset-0 -z-10">
      {/* Base canvas */}
      <div className="absolute inset-0 bg-canvas" />

      {/* Animated fine grid with major lines every 5 cells */}
      <div className="absolute inset-0 grid-bg-fine mask-radial-fade opacity-90" />

      {/* Slow drifting grid (subtle parallax) */}
      <div className="absolute inset-0 grid-bg-drift mask-radial-fade opacity-25" />

      {/* Perspective floor at the bottom — like a trading floor */}
      <div className="absolute inset-x-0 bottom-0 h-[55%] grid-bg-perspective opacity-60" />

      {/* Ambient orbs */}
      <div className="absolute -top-32 -left-24 size-[480px] rounded-full bg-accent/15 blur-3xl animate-orb" />
      <div className="absolute top-1/3 -right-32 size-[420px] rounded-full bg-info/20 blur-3xl animate-orb [animation-delay:-6s]" />
      <div className="absolute bottom-[-160px] left-1/3 size-[520px] rounded-full bg-accent/10 blur-3xl animate-orb [animation-delay:-3s]" />

      {/* Moving beam */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3
                   bg-gradient-to-r from-transparent via-accent/20 to-transparent
                   blur-2xl animate-beam"
      />

      {/* Top hairline accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
    </div>
  );
}

/* Live price ticker — three pairs with animated tick-up / tick-down. */
function PriceTickerStrip() {
  const [series, setSeries] = useState([
    { sym: 'BTC',  price: 64_283.12, change: 1.24 },
    { sym: 'ETH',  price:  3_412.86, change: 0.42 },
    { sym: 'SOL',  price:    148.27, change:-0.83 },
    { sym: 'ARB',  price:      1.083, change: 2.07 },
  ]);

  useEffect(() => {
    const id = setInterval(() => {
      setSeries((prev) =>
        prev.map((row) => {
          const drift = (Math.random() - 0.5) * (row.price * 0.0015);
          const next  = Math.max(0.0001, row.price + drift);
          return { ...row, price: next, change: row.change + (Math.random() - 0.5) * 0.05 };
        })
      );
    }, 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative border-t border-hairline bg-surface-sunk/60 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-5 h-11 flex items-center gap-2 sm:gap-6 overflow-x-auto">
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-fg-muted shrink-0">
          <PulseDot tone="success" /> live
        </span>
        {series.map((row) => {
          const up = row.change >= 0;
          return (
            <div
              key={row.sym}
              className="flex items-center gap-2 text-xs font-mono shrink-0"
            >
              <span className="text-fg-muted">{row.sym}</span>
              <span className={cn(
                'tabular text-fg animate-num-flip',
                up ? 'text-success' : 'text-danger'
              )} key={row.price.toFixed(2)}>
                ${row.price.toLocaleString(undefined, { minimumFractionDigits: row.price < 10 ? 3 : 2, maximumFractionDigits: row.price < 10 ? 3 : 2 })}
              </span>
              <span className={cn('inline-flex items-center gap-0.5 tabular', up ? 'text-success' : 'text-danger')}>
                {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {up ? '+' : ''}{row.change.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="relative animate-rise-in [animation-delay:80ms]">
      {/* Glow */}
      <div className="absolute -inset-8 bg-accent/15 blur-3xl rounded-full pointer-events-none animate-glow" />

      <div className="relative">
        <LiveTradesFeed compact defaultVisible={10} maxHeight={520} />
      </div>
    </div>
  );
}

/* ────────────────────────────── Trust strip ────────────────────────────── */

function TrustStrip() {
  const stats = [
    { to: 900,  prefix: '$', suffix: 'M+', label: 'Volume verified on-chain', icon: <Globe2 className="size-3.5" /> },
    { to: 10000, suffix: '+',  label: 'Execution cycles completed', icon: <Activity className="size-3.5" /> },
    { to: 80000, suffix: '+',  label: 'Receipts published',       icon: <Receipt className="size-3.5" /> },
    { to: 12000, suffix: '+',  label: 'Participants onboarded',   icon: <Wallet className="size-3.5" /> },
  ];
  return (
    <section className="relative border-b border-hairline bg-surface">
      {/* Subtle ambient orb on the right so the strip has depth */}
      <div aria-hidden className="absolute -top-16 right-0 size-64 bg-accent/10 blur-3xl rounded-full pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-5 py-12 grid grid-cols-2 md:grid-cols-4 divide-x divide-hairline">
        {stats.map((s) => (
          <Reveal key={s.label} className="px-5 first:pl-0 last:pr-0">
            <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.16em] text-fg-subtle font-semibold">
              <span className="text-accent">{s.icon}</span>
              {s.label}
            </div>
            <div className="text-3xl md:text-4xl font-semibold tracking-tight text-fg mt-2">
              <Counter to={s.to} prefix={s.prefix} suffix={s.suffix} format={(n) => formatCompact(n)} />
            </div>
            <div className="mt-2 h-1 rounded-full bg-hairline overflow-hidden">
              <div className="h-full w-2/3 bg-gradient-to-r from-accent to-accent-strong rounded-full" />
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────── Services ────────────────────────────── */

type ServiceItem = {
  icon: React.ReactNode;
  title: string;
  body: string;
  tag?: string;
  tone?: 'accent' | 'success' | 'info' | 'neutral';
};

const SERVICE_HERO: ServiceItem = {
  icon: <Cpu className="size-5" />,
  title: 'AI-driven execution',
  body:
    'Milestone-based cycles routed by models trained on realized P&L. ' +
    'Every decision is signed, every fill is receipted — and the receipts ' +
    'are the model\'s audit trail.',
  tag: 'core',
  tone: 'accent',
};

const SERVICE_FEATURED: ServiceItem[] = [
  { icon: <ShieldCheck className="size-5" />, title: 'On-chain verification',
    body: 'Independent confirmation through public block explorers. Every action is a transaction you can audit.',
    tag: 'audited', tone: 'success' },
  { icon: <Activity className="size-5" />, title: 'Execution feed & receipts',
    body: 'A real-time stream of trades, each one tied to a signed receipt on the chain of record.',
    tag: 'real-time', tone: 'info' },
];

const SERVICE_TILES: ServiceItem[] = [
  { icon: <Receipt className="size-4" />,       title: 'Signed audit trail',     body: 'Receipts pinned to a public chain — full history reconstructable.' },
  { icon: <EyeOff className="size-4" />,        title: 'Privacy controls',       body: 'Surface or hide P&L, ranks, and identifiers independently.' },
  { icon: <Network className="size-4" />,       title: 'Access cycles',          body: 'Tiered participation with hard ceilings and clean settlement.' },
  { icon: <Wallet className="size-4" />,        title: 'Crypto-native rails',    body: 'Wallet-based onboarding, native deposit flows, tokenized progress.' },
  { icon: <Layers className="size-4" />,        title: 'Composable strategy',    body: 'Each cycle is discrete. Bundle, rotate, or exit on demand.' },
  { icon: <Zap className="size-4" />,           title: 'Sub-second routing',     body: 'Deterministic ordering, sub-200ms confirmation, no surprises.' },
];

function Services() {
  return (
    <section id="services" className="relative border-b border-hairline bg-surface-sunk/30">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      <div className="max-w-6xl mx-auto px-5 py-24">
        <SectionHeader
          eyebrow="What we do"
          title={<>Infrastructure built around <span className="text-gradient">proof</span>, not promises.</>}
          description="Nine surfaces, one cohesive system. Each piece is independently verifiable and audit-friendly by default."
        />

        {/* Bento: 1 hero card spanning full width */}
        <Reveal>
          <ServiceHeroCard item={SERVICE_HERO} />
        </Reveal>

        {/* Bento: 2 medium feature cards */}
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          {SERVICE_FEATURED.map((s, i) => (
            <Reveal key={s.title} delay={(((i + 1) as 1 | 2 | 3 | 4 | 5))}>
              <ServiceFeaturedCard item={s} />
            </Reveal>
          ))}
        </div>

        {/* Bento: 6 small tiles */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {SERVICE_TILES.map((s, i) => (
            <Reveal key={s.title} delay={(((i + 1) as 1 | 2 | 3 | 4 | 5))}>
              <ServiceTile item={s} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceHeroCard({ item }: { item: ServiceItem }) {
  return (
    <Card className="group relative overflow-hidden h-full transition-colors hover:border-border-strong">
      {/* Accent background — gradient + faint grid */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-accent/12 via-transparent to-info/10" />
      <div aria-hidden className="absolute inset-0 grid-bg opacity-40 mask-radial-fade" />
      <div aria-hidden className="absolute -top-24 -right-24 size-72 bg-accent/20 blur-3xl rounded-full" />
      <CardBody className="relative p-6 md:p-8 grid md:grid-cols-[1.4fr_1fr] gap-8 items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid place-items-center size-9 rounded-md bg-accent text-accent-fg">
              {item.icon}
            </span>
            {item.tag && <ServiceTag label={item.tag} tone="accent" />}
          </div>
          <h3 className="mt-5 text-2xl md:text-3xl font-semibold tracking-tight text-fg leading-tight">
            {item.title}
          </h3>
          <p className="mt-3 text-base text-fg-muted leading-relaxed max-w-xl">{item.body}</p>
          <a href="#showcase"
             className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:gap-2.5 transition-all">
            See how a cycle runs <ArrowUpRight className="size-4" />
          </a>
        </div>
        <div className="relative">
          {/* Mini "decision trace" mock — shows AI steps as signed entries */}
          <div className="rounded-lg border border-border bg-surface/80 backdrop-blur-sm p-4 font-mono text-[11px] space-y-1.5">
            <div className="flex items-center justify-between text-fg-subtle">
              <span>model · cycle #28401</span>
              <span className="inline-flex items-center gap-1 text-success"><CircleCheckBig className="size-3" />signed</span>
            </div>
            {[
              ['00:14:02', 'venue: uniswap-v3/arb',  'in: 0.42 ETH',  'ok'],
              ['00:14:02', 'venue: aerodrome/base',   'in: 312 USDC',  'ok'],
              ['00:14:03', 'route: balanced',         'pnl +0.34%',    'ok'],
              ['00:14:03', 'commit: 0x9a2c…6b1f',     'block 19,283,114','ok'],
            ].map(([t, venue, op, st], i) => (
              <div key={i} className="grid grid-cols-[60px_1fr_auto] gap-2 items-center">
                <span className="text-fg-subtle tabular">{t}</span>
                <span className="text-fg truncate">{venue} <span className="text-fg-subtle">· {op}</span></span>
                <span className="text-success text-[10px] uppercase tracking-wider">{st}</span>
              </div>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function ServiceFeaturedCard({ item }: { item: ServiceItem }) {
  return (
    <Card className="group relative h-full transition-colors hover:border-border-strong overflow-hidden">
      <div aria-hidden className="absolute inset-0 opacity-50">
        <div className="absolute -top-16 -right-10 size-40 rounded-full bg-accent/10 blur-2xl" />
      </div>
      <CardBody className="relative p-6">
        <div className="flex items-center justify-between">
          <span className="grid place-items-center size-9 rounded-md bg-accent-soft text-accent">
            {item.icon}
          </span>
          {item.tag && <ServiceTag label={item.tag} tone={item.tone ?? 'neutral'} />}
        </div>
        <h3 className="mt-5 text-lg font-semibold text-fg">{item.title}</h3>
        <p className="text-sm text-fg-muted mt-2 leading-relaxed">{item.body}</p>
        <a href="#showcase"
           className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-fg-muted hover:text-accent transition-colors">
          Learn more <ArrowUpRight className="size-3.5" />
        </a>
      </CardBody>
    </Card>
  );
}

function ServiceTile({ item }: { item: ServiceItem }) {
  return (
    <Card className="group h-full transition-colors hover:border-border-strong">
      <CardBody className="p-5">
        <div className="flex items-center justify-between">
          <span className="grid place-items-center size-8 rounded-md bg-surface-2 text-accent">
            {item.icon}
          </span>
          <ArrowUpRight className="size-3.5 text-fg-subtle opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-fg">{item.title}</h3>
        <p className="text-[13px] text-fg-muted mt-1.5 leading-relaxed">{item.body}</p>
      </CardBody>
    </Card>
  );
}

function ServiceTag({ label, tone = 'neutral' }: { label: string; tone?: 'accent' | 'success' | 'info' | 'neutral' }) {
  const tones: Record<string, string> = {
    accent:  'bg-accent text-accent-fg',
    success: 'bg-success-soft text-success',
    info:    'bg-info-soft text-info',
    neutral: 'bg-surface-2 text-fg-muted',
  };
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.14em] font-semibold',
      tones[tone]
    )}>
      {label}
    </span>
  );
}

/* ────────────────────────────── How it works ────────────────────────────── */

function ExecutionShowcase() {
  const steps = [
    { n: '01', t: 'Connect & fund', d: 'Spin up an account, pick a tier, deposit in crypto or fiat rails.',
      meta: ['wallet', 'fiat on-ramp'] },
    { n: '02', t: 'Activate a cycle', d: 'Choose a structured access cycle that matches your risk envelope.',
      meta: ['7d · 30d', 'fixed APY'] },
    { n: '03', t: 'Execution runs',   d: 'AI routes orders to venues. Each fill emits a signed receipt.',
      meta: ['0x9a2c…6b1f', 'block 19,283,114'] },
    { n: '04', t: 'Audit & cash out',d: 'Inspect on-chain proofs. Cash out earnings any time after the cycle.',
      meta: ['signed payout', 'instant'] },
  ];
  return (
    <section id="showcase" className="relative border-b border-hairline">
      <div className="max-w-6xl mx-auto px-5 py-24 grid lg:grid-cols-[1fr_1.2fr] gap-12 items-start">
        <Reveal>
          <div>
            <SectionHeader
              align="left"
              eyebrow="How it works"
              title={<>A trading workflow that <br />survives an audit.</>}
              description="Each step produces a verifiable artifact. There is nothing in BEX that you cannot independently confirm from a public explorer."
            />
            <div className="mt-8 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-fg-muted">
                <Hexagon className="size-3.5 text-accent" />
                <span className="font-mono">bayes-euler/protocol v3.2</span>
              </span>
              <Badge tone="success" dot>audited</Badge>
              <Badge tone="info" dot>open-source</Badge>
            </div>
            {/* Mock callout — a real-looking audit reference */}
            <div className="mt-6 rounded-lg border border-hairline bg-surface p-4 font-mono text-[11px] text-fg-muted">
              <div className="flex items-center justify-between">
                <span>commit · HEAD</span>
                <span className="text-fg-subtle">v3.2.1</span>
              </div>
              <div className="mt-1.5 text-fg">7d2f…a91c</div>
              <div className="mt-1 text-fg-subtle">last verified · 2 hours ago by 4 attesters</div>
            </div>
          </div>
        </Reveal>

        <ol className="relative pl-8">
          {/* Vertical rail */}
          <div aria-hidden className="absolute left-3 top-3 bottom-3 w-px bg-gradient-to-b from-accent/60 via-border-strong to-transparent" />
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={(((i + 1) as 1 | 2 | 3 | 4 | 5))}>
              <li className="relative pb-6 last:pb-0">
                {/* Node */}
                <span className="absolute -left-8 top-3 grid place-items-center size-6 rounded-full bg-surface border-2 border-accent text-accent text-[10px] font-mono font-semibold">
                  {s.n}
                </span>
                <Card className="transition-colors hover:border-border-strong">
                  <CardBody className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-sm font-semibold text-fg">{s.t}</h4>
                      <div className="flex flex-wrap gap-1.5 justify-end shrink-0">
                        {s.meta.map((m) => (
                          <span key={m} className="text-[10px] font-mono text-fg-subtle px-1.5 py-0.5 rounded bg-surface-sunk/60 border border-hairline">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-fg-muted mt-2 leading-relaxed">{s.d}</p>
                  </CardBody>
                </Card>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ────────────────────────────── Network status ────────────────────────────── */

function NetworkStatus() {
  const venues = [
    { name: 'Uniswap v3',  region: 'Ethereum',  latency: 142, series: [120,135,160,142,128,150,142] },
    { name: 'Uniswap v3',  region: 'Arbitrum',  latency: 38,  series: [42,38,55,40,38,36,38] },
    { name: 'Curve',       region: 'Ethereum',  latency: 168, series: [150,165,180,170,168,175,168] },
    { name: 'Raydium',     region: 'Solana',    latency: 22,  series: [25,22,28,24,22,21,22] },
    { name: 'PancakeSwap', region: 'BNB Chain', latency: 54,  series: [60,55,58,52,54,57,54] },
    { name: 'Aerodrome',   region: 'Base',      latency: 31,  series: [34,32,35,30,31,33,31] },
  ];

  // Live "next cycle" countdown
  const [secs, setSecs] = useState(8420);
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 86400)), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  const hh = String(Math.floor(secs / 3600)).padStart(2, '0');

  return (
    <section id="network" className="relative border-b border-hairline bg-surface-sunk/30">
      <div className="max-w-6xl mx-auto px-5 py-24">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12 items-start">
          <div>
            <SectionHeader
              align="left"
              eyebrow="Network status"
              title="Receipts land in seconds, not days."
              description="BEX routes across a federated set of on-chain venues. Every fill is published as a signed receipt on the chain of record within the same block."
            />

            {/* Node-graph motif */}
            <Reveal className="mt-8">
              <div className="relative rounded-xl border border-hairline bg-surface overflow-hidden h-56">
                <div aria-hidden className="absolute inset-0 grid-bg opacity-50 mask-radial-fade" />
                <NodeGraph />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10.5px] font-mono text-fg-subtle">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-accent" /> 6 venues
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Cable className="size-3" /> mesh · optimistic
                  </span>
                </div>
              </div>
            </Reveal>

            {/* Next cycle countdown */}
            <div className="mt-4 flex items-center justify-between rounded-xl border border-hairline bg-surface px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-fg-muted">
                <Timer className="size-3.5 text-accent" />
                <span>next cycle begins in</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-fg">
                <span className="rounded-md bg-surface-sunk px-1.5 py-0.5 tabular">{hh}</span>
                <span className="text-fg-subtle">:</span>
                <span className="rounded-md bg-surface-sunk px-1.5 py-0.5 tabular">{mm}</span>
                <span className="text-fg-subtle">:</span>
                <span className="rounded-md bg-surface-sunk px-1.5 py-0.5 tabular">{ss}</span>
              </div>
            </div>
          </div>

          <Card>
            <div className="flex items-center justify-between px-5 h-11 border-b border-hairline">
              <div className="flex items-center gap-2 text-xs text-fg-muted">
                <Globe2 className="size-3.5" />
                <span className="font-mono">venues · live</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-success font-medium">
                <PulseDot tone="success" /> 6 / 6 healthy
              </div>
            </div>
            <div className="divide-y divide-hairline">
              {venues.map((v) => (
                <div key={v.name + v.region} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="size-1.5 rounded-full bg-success" />
                    <span className="font-medium text-fg truncate">{v.name}</span>
                    <span className="text-fg-subtle text-xs">on {v.region}</span>
                  </div>
                  <LatencySparkline series={v.series} />
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-mono tabular text-fg-muted">{v.latency} ms</span>
                    <Badge tone="success" dot>live</Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-5 h-10 border-t border-hairline text-[11px] font-mono text-fg-subtle">
              <span>last block 19,283,114</span>
              <span>0x9a2c…6b1f</span>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

function LatencySparkline({ series }: { series: number[] }) {
  const max = Math.max(...series);
  const min = Math.min(...series);
  const range = Math.max(1, max - min);
  const w = 64, h = 18;
  const step = w / (series.length - 1);
  const points = series.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="text-accent">
      <polyline
        points={points.join(' ')}
        fill="none" stroke="currentColor" strokeWidth="1.2"
        strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function NodeGraph() {
  // Hand-placed nodes for visual rhythm, not a real layout.
  const nodes = [
    { x: 50, y: 30, label: 'BEX' },
    { x: 18, y: 50, label: 'uni' },
    { x: 82, y: 50, label: 'aero' },
    { x: 30, y: 80, label: 'crv' },
    { x: 70, y: 80, label: 'rady' },
    { x: 50, y: 110, label: 'panc' },
  ];
  const edges: [number, number][] = [[0,1],[0,2],[0,3],[0,4],[1,3],[2,4],[3,5],[4,5]];
  return (
    <svg viewBox="0 0 100 130" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
      <g>
        {edges.map(([a, b], i) => (
          <line key={i}
            x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
            stroke="var(--border-strong)" strokeWidth="0.6" vectorEffect="non-scaling-stroke"
            strokeDasharray="2 2"
          />
        ))}
        {nodes.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r="3.2" fill={i === 0 ? 'var(--accent)' : 'var(--surface)'} stroke="var(--accent)" strokeWidth="0.9" vectorEffect="non-scaling-stroke" />
            <text x={n.x} y={n.y - 6} textAnchor="middle" fontSize="3.4" fontFamily="var(--font-mono)" fill="var(--fg-muted)">{n.label}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

/* ────────────────────────────── Calculator ────────────────────────────── */

function Calculator() {
  const [pkg, setPkg] = useState<keyof typeof PACKAGES | ''>('');
  const [amount, setAmount] = useState('1000');
  const [percent, setPercent] = useState('1');
  const duration = pkg ? PACKAGES[pkg].duration : 0;

  const { profit, total, apy } = useMemo(() => {
    const a = parseFloat(amount) || 0;
    const p = parseFloat(percent) || 0;
    const profit = (p / 100) * a * duration;
    return { profit, total: a + profit, apy: duration ? p * 365 : 0 };
  }, [amount, percent, duration]);

  return (
    <section id="calculator" className="relative border-b border-hairline">
      <div className="max-w-6xl mx-auto px-5 py-24 grid lg:grid-cols-2 gap-12 items-center">
        <Reveal>
          <div>
            <SectionHeader
              align="left"
              eyebrow="Returns calculator"
              title="Model a cycle before you commit."
              description="Pick a structured access cycle and dial in your numbers. This is illustrative — actual yields are governed by your selected protocol parameters."
            />

            {/* Tier comparison row */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(PACKAGES).map(([k, v]) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => { setPkg(k as keyof typeof PACKAGES); setPercent(String(v.suggested)); }}
                  className={cn(
                    'group rounded-lg border bg-surface px-3 py-2.5 text-left transition-colors',
                    pkg === k ? 'border-accent ring-1 ring-accent/40' : 'border-border hover:border-border-strong'
                  )}
                >
                  <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">{v.duration}d</div>
                  <div className="text-sm font-semibold text-fg mt-0.5 truncate">{v.label.split(' ')[0]}</div>
                  <div className="text-[11px] font-mono text-accent mt-0.5">{v.suggested.toFixed(1)}%/d</div>
                </button>
              ))}
            </div>

            <p className="mt-4 text-[11px] text-fg-subtle inline-flex items-center gap-1.5">
              <Plug className="size-3" /> tap a tier to pre-fill the estimator
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div className="relative">
            {/* Glowing ring */}
            <div aria-hidden className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-accent/30 via-info/15 to-transparent blur-2xl" />
            <Card variant="elevated" className="relative">
              <CardHeader
                title="Profit estimator"
                description="Returns are illustrative, not guaranteed."
                action={<Badge tone="accent" dot>live</Badge>}
              />
              <CardBody className="space-y-4">
                <Field label="Access package">
                  <Select value={pkg} onChange={(e) => {
                    const v = e.target.value as keyof typeof PACKAGES | '';
                    setPkg(v);
                    if (v) setPercent(String(PACKAGES[v].suggested));
                  }}>
                    <option value="">Select a cycle</option>
                    {Object.entries(PACKAGES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label} · {v.duration} days</option>
                    ))}
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Amount" hint="USD">
                    <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </Field>
                  <Field label="Daily rate" hint="%">
                    <Input type="number" step="0.01" value={percent} onChange={(e) => setPercent(e.target.value)} />
                  </Field>
                </div>
                <div className="rounded-lg border border-hairline bg-surface-sunk/40 divide-y divide-hairline">
                  <Row label="Duration" value={`${duration} days`} muted={!pkg} />
                  <Row label="Implied APY" value={`${apy.toFixed(1)}%`} muted={!duration} />
                  <Row label="Estimated profit" value={formatMoney(profit, { sign: true })} tone="success" />
                  <Row label="Total return" value={formatMoney(total)} bold />
                </div>
                <Link href="/auth/register" className="block">
                  <Button className="w-full" size="lg" trailingIcon={<ArrowRight className="size-4" />}>
                    Start a cycle
                  </Button>
                </Link>
              </CardBody>
            </Card>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Row({ label, value, tone, bold, muted }: { label: string; value: string; tone?: 'success'; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-fg-muted">{label}</span>
      <span className={`tabular ${tone === 'success' ? 'text-success' : muted ? 'text-fg-subtle' : 'text-fg'} ${bold ? 'font-semibold' : 'font-medium'}`}>{value}</span>
    </div>
  );
}

/* ────────────────────────────── Governance & audits ────────────────────────────── */

/* ────────────────────────── Business model ─────────────────────────── */

function BusinessModel() {
  // Illustrative capital-flow waterfall at $5M TVL · 22% monthly gross.
  const flows = [
    { label: 'Gross Trading Return',              pct: '100%',  usd: '$1,100,000 / mo', tone: 'text-fg font-semibold',      sub: false },
    { label: 'Investor Net Return (75%)',         pct: '75%',   usd: '$825,000 / mo',   tone: 'text-success font-semibold', sub: false },
    { label: 'BEX Management Fee (25%)',          pct: '25%',   usd: '$275,000 / mo',   tone: 'text-accent font-semibold',  sub: false },
    { label: 'Partner Commission Pool (70%)',     pct: '17.5%', usd: '$192,500',        tone: 'text-info',                  sub: true },
    { label: 'Reserve & Insurance Fund (15%)',    pct: '3.75%', usd: '$41,250',         tone: 'text-fg',                    sub: true },
    { label: 'Operations & Infrastructure (10%)', pct: '2.5%',  usd: '$27,500',         tone: 'text-fg-muted',              sub: true },
    { label: '$BEX Token Buyback & Burn (5%)',    pct: '1.25%', usd: '$13,750',         tone: 'text-warning',               sub: true },
  ];

  const streams = [
    { icon: <TrendingUp className="size-4" />, title: 'Trading Performance Fees', body: '25% of net profits — scales automatically with TVL growth.' },
    { icon: <Coins className="size-4" />,      title: 'Tier Access Fees',         body: 'One-time 3–5% access fee on initial deposit for each tier level.' },
    { icon: <Users className="size-4" />,      title: 'Partner Ecosystem Volume', body: 'Affiliate growth drives TVL, multiplying absolute fee revenue.' },
    { icon: <Star className="size-4" />,       title: '$BEX Token Ecosystem',     body: 'Token buyback pressure, staking yield, and governance utility.' },
  ];

  return (
    <section id="business-model" className="relative border-b border-hairline bg-surface-sunk/30">
      <div className="max-w-6xl mx-auto px-5 py-24">
        <SectionHeader
          align="left"
          eyebrow="Business model"
          title={<>How BEX makes money, <span className="text-gradient">and how you do too.</span></>}
          description="BEX only earns when investors earn — the management fee is carved out of realised trading profit, never out of principal."
        />

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-10 mt-12 items-start">
          <Reveal>
            <Card variant="elevated">
              <div className="px-5 pt-5 pb-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-accent font-semibold">Capital flow architecture</div>
                <div className="text-[12.5px] text-fg-muted mt-1">At $5M TVL · 22% monthly gross return</div>
              </div>
              <div className="px-3 pb-4 space-y-1.5">
                {flows.map((f) => (
                  <div
                    key={f.label}
                    className={cn(
                      'grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg border border-hairline bg-surface px-3.5 py-2.5',
                      f.sub && 'ml-5',
                    )}
                  >
                    <span className={cn('text-[13px] truncate', f.tone)}>
                      {f.sub && <span className="text-fg-subtle mr-1.5">↳</span>}
                      {f.label}
                    </span>
                    <span className="text-[12px] text-fg-muted tabular w-12 text-right">{f.pct}</span>
                    <span className={cn('text-[13px] tabular font-semibold w-32 text-right', f.tone)}>{f.usd}</span>
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>

          <Reveal>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-accent font-semibold mb-5">Four revenue streams</div>
              <ul className="space-y-5">
                {streams.map((s) => (
                  <li key={s.title} className="flex items-start gap-3 pb-5 border-b border-hairline last:border-0 last:pb-0">
                    <span className="grid place-items-center size-8 rounded-md bg-accent-soft text-accent shrink-0">{s.icon}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-fg">{s.title}</div>
                      <div className="text-[13px] text-fg-muted leading-relaxed mt-0.5">{s.body}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Partner programme ───────────────────────── */

function PartnerProgramme() {
  const levels = [
    { level: 1, label: 'Direct Referral', pct: 18 },
    { level: 2, label: '2nd Generation', pct: 9 },
    { level: 3, label: '3rd Generation',  pct: 5 },
    { level: 4, label: '4th Generation',  pct: 3 },
    { level: 5, label: '5th Generation',  pct: 2 },
    { level: 6, label: '6th Generation',  pct: 1 },
    { level: 7, label: '7th Generation',  pct: 0.5 },
  ];

  const bonuses = [
    { icon: <Zap className="size-4" />,        title: 'Fast Start Bonus',       body: 'Earn instant cash bonuses for onboarding directs within your first 30 days. Bonuses stack — hit every milestone, collect every reward.' },
    { icon: <Trophy className="size-4" />,     title: 'Rank Advancement Bonus', body: 'One-time cash bonuses paid every time you achieve a new rank. From $500 at Affiliate to $999,999 at Royalty.' },
    { icon: <TrendingUp className="size-4" />, title: 'Matching Bonus',         body: "Earn a percentage of your Level 1 partners' total monthly commission income. Activated at Gold rank and above — the wealth multiplier." },
    { icon: <Coins className="size-4" />,      title: 'Monthly Residual Bonus', body: 'Daily residual cash paid at every rank. From $2/day at Amateur to $2,000/day at Royalty — passive income that builds with your team.' },
  ];

  return (
    <section id="partner-programme" className="relative border-b border-hairline">
      <div className="max-w-6xl mx-auto px-5 py-24">
        <SectionHeader
          align="left"
          eyebrow="Partner programme"
          title={<>The BEX Partner Programme: <span className="text-gradient">built for builders, not recruiters.</span></>}
          description="Every commission paid to a BEX partner is sourced from real trading revenue. As the investment pool grows, all commission values grow automatically — with zero plan changes and zero renegotiation."
        />

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-10 mt-12 items-start">
          <Reveal>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-accent font-semibold mb-5">7-level unilevel referral structure</div>
              <div className="space-y-1.5">
                {levels.map((l) => (
                  <div key={l.level} className="grid grid-cols-[64px_1fr_52px_1.2fr] items-center gap-3 rounded-lg border border-hairline bg-surface px-3.5 py-2.5">
                    <span className="text-[12px] font-semibold text-accent">Level {l.level}</span>
                    <span className="text-[13px] text-fg truncate">{l.label}</span>
                    <span className="text-[13px] font-semibold text-fg tabular text-right">{l.pct}%</span>
                    <span className="relative h-2 rounded-full bg-surface-2 overflow-hidden">
                      <span
                        className="absolute inset-y-0 left-0 rounded-full bg-accent"
                        style={{ width: `${Math.max(3, (l.pct / 18) * 100)}%` }}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-accent font-semibold mb-5">Bonus income layers</div>
              <ul className="space-y-5">
                {bonuses.map((b) => (
                  <li key={b.title} className="flex items-start gap-3 pb-5 border-b border-hairline last:border-0 last:pb-0">
                    <span className="grid place-items-center size-8 rounded-md bg-accent-soft text-accent shrink-0">{b.icon}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-fg">{b.title}</div>
                      <div className="text-[13px] text-fg-muted leading-relaxed mt-0.5">{b.body}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Governance() {
  const audits = [
    { firm: 'Trail of Bits', scope: 'Protocol v3.2',       date: 'May 2026', status: 'passed', hash: '0x9a2c…6b1f' },
    { firm: 'Spearbit',      scope: 'Execution engine',    date: 'Apr 2026', status: 'passed', hash: '0x3bd1…c0f2' },
    { firm: 'Cyfrin',         scope: 'Smart contracts',     date: 'Feb 2026', status: 'passed', hash: '0x7710…a4e8' },
    { firm: 'Certora',       scope: 'Formal verification', date: 'Jan 2026', status: 'passed', hash: '0xee2b…9d07' },
  ];
  const gov = [
    { icon: <Vote className="size-4" />,     title: '7-day timelock',     body: 'Upgrades are delayed, transparent, and reversible until vote closes.' },
    { icon: <GitBranch className="size-4" />,title: 'Public proposals',   body: 'Every parameter change lives on-chain and is open to inspection.' },
    { icon: <Gavel className="size-4" />,    title: 'Receipt-pinned votes',body: 'Votes carry the same proof format as trades — verifiable by anyone.' },
  ];
  return (
    <section id="governance" className="relative border-b border-hairline bg-surface-sunk/30">
      <div className="max-w-6xl mx-auto px-5 py-24">
        <SectionHeader
          eyebrow="Governance & audits"
          title="Trust, on record."
          description="Every material change to the protocol goes through independent review. Receipts of the work are pinned to a public chain so you can verify them yourself."
        />

        <div className="grid lg:grid-cols-3 gap-4 mt-12">
          <Card className="lg:col-span-1 overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center gap-2 text-accent">
              <span className="grid place-items-center size-7 rounded-md bg-accent-soft">
                <Server className="size-3.5" />
              </span>
              <span className="text-[11px] uppercase tracking-[0.18em] font-semibold">Protocol</span>
            </div>
            <CardBody className="px-5 pb-5 space-y-1">
              <h3 className="text-base font-semibold text-fg">Open governance</h3>
              <p className="text-sm text-fg-muted leading-relaxed">
                Parameter changes pass through a 7-day on-chain vote.
                No multisig backdoors, no silent upgrades.
              </p>
              <ul className="mt-4 space-y-3">
                {gov.map((g) => (
                  <li key={g.title} className="flex items-start gap-3">
                    <span className="grid place-items-center size-7 rounded-md bg-surface-2 text-accent shrink-0">{g.icon}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-fg">{g.title}</div>
                      <div className="text-[12.5px] text-fg-muted leading-relaxed">{g.body}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between px-5 h-11 border-b border-hairline">
              <div className="flex items-center gap-2 text-xs text-fg-muted">
                <FileCheck2 className="size-3.5" />
                <span className="font-mono">audits · last 12 months</span>
              </div>
              <Badge tone="success" dot>all passed</Badge>
            </div>
            <div className="divide-y divide-hairline">
              {audits.map((a) => (
                <div key={a.firm} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <Lock className="size-3.5 text-fg-subtle" />
                    <span className="font-medium text-fg truncate">{a.firm}</span>
                    <span className="text-fg-subtle text-xs hidden sm:inline">· {a.scope}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-fg-subtle px-2 py-0.5 rounded bg-surface-sunk/60 border border-hairline">
                      <Hash className="size-3" />{a.hash}
                    </span>
                    <span className="font-mono tabular text-fg-muted">{a.date}</span>
                    <Badge tone="success">{a.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-5 h-10 border-t border-hairline text-[11px] text-fg-subtle">
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="size-3" /> Read the full audit reports
              </span>
              <a href="#faq" className="inline-flex items-center gap-1 text-fg-muted hover:text-accent">
                View methodology <ArrowUpRight className="size-3" />
              </a>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────── Testimonials ────────────────────────────── */

type Quote = { quote: string; name: string; role: string; icon: React.ReactNode };

const QUOTES: Quote[] = [
  { quote: 'I run trading desks for a living. BEX is the first system where I can hand an LP a block-explorer link and have them nod, not squint.', name: 'M. Okafor',  role: 'Head of Trading, Meridian Digital', icon: <Building2 className="size-4" /> },
  { quote: 'The receipt model is the differentiator. I no longer have to trust a dashboard — I can grep the chain.',                          name: 'A. Reinhart', role: 'Treasury Lead, Folio Labs',          icon: <Coins className="size-4" /> },
  { quote: 'Auditable, deterministic, fast. It is what execution infrastructure should have looked like five years ago.',                    name: 'D. Vance',   role: 'Principal Engineer, Northcap',         icon: <Boxes className="size-4" /> },
  { quote: 'Onboarding a new partner used to take a week of due diligence. With BEX it is a single shared link.',                            name: 'S. Iqbal',   role: 'BD Lead, Solstice Capital',           icon: <Cable className="size-4" /> },
];

function Testimonials() {
  // Duplicate so the marquee can scroll seamlessly without a gap.
  const row = [...QUOTES, ...QUOTES];
  return (
    <section className="relative border-b border-hairline overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 py-24">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <SectionHeader
            align="left"
            eyebrow="In the field"
            title="What teams using BEX say."
            description="Quotes from teams running real cycles against real capital."
          />
          <div className="flex items-center gap-2 text-xs text-fg-subtle shrink-0">
            <span className="inline-flex items-center gap-1.5">
              <PulseDot tone="success" /> 47 teams shipping with BEX
            </span>
          </div>
        </div>
      </div>

      {/* Marquee row */}
      <div className="relative">
        {/* Edge fades so cards appear to slide in/out */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-canvas to-transparent z-10" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-canvas to-transparent z-10" />
        <div className="flex gap-4 px-5 pb-2 animate-marquee" style={{ animationDuration: '46s' }}>
          {row.map((q, i) => <QuoteCard key={`${q.name}-${i}`} q={q} />)}
        </div>
      </div>
      <div className="h-10" />
    </section>
  );
}

function QuoteCard({ q }: { q: Quote }) {
  return (
    <Card className="relative w-[360px] shrink-0 transition-colors hover:border-border-strong">
      {/* Oversized quote watermark */}
      <Quote aria-hidden className="absolute -top-2 right-3 size-12 text-accent/15" strokeWidth={1.2} />
      <CardBody className="p-5 space-y-4">
        <p className="text-sm text-fg leading-relaxed relative">"{q.quote}"</p>
        <div className="flex items-center gap-3 pt-2 border-t border-hairline">
          <span className="grid place-items-center size-8 rounded-md bg-accent-soft text-accent">
            {q.icon}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-fg truncate">{q.name}</div>
            <div className="text-xs text-fg-muted truncate">{q.role}</div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

/* ────────────────────────────── FAQ ────────────────────────────── */

function FAQ() {
  const items = [
    { q: 'What is BEX Network?', a: 'A verification-first Web3 execution platform delivering AI-driven trading with on-chain receipts. Every action is recorded, signed, and independently auditable.' },
    { q: 'How does on-chain verification work?', a: 'Each execution emits a signed receipt that is anchored to a public chain. You can reconstruct the entire history from the explorer alone, without trusting BEX.' },
    { q: 'Is my data private?', a: 'Yes. BEX includes granular visibility controls — you choose which fields are public, which are shared with peers, and which remain on your device only.' },
    { q: 'How do I get started?', a: 'Create a free account, deposit via crypto rails, pick an access cycle, and activate execution. The first cycle settles in 7 days.' },
    { q: 'What does an access cycle cost?', a: 'There are no platform fees beyond the cycle price. Settlement, receipts, and verification are bundled into the cycle itself. Network gas is paid by the protocol.' },
    { q: 'Can I exit early?', a: 'Cycles settle on a fixed schedule so receipts are clean and comparable. Earnings become withdrawable at cycle end, and principal becomes withdrawable per the package terms.' },
  ];
  return (
    <section id="faq" className="relative border-b border-hairline bg-surface">
      <div className="max-w-5xl mx-auto px-5 py-24">
        <SectionHeader
          eyebrow="FAQ"
          title="Answers, in plain English."
          description="Want more detail? Read the whitepaper or open the protocol docs."
        />

        <div className="mt-12 grid md:grid-cols-2 gap-x-10 gap-y-0">
          {items.map((f, i) => (
            <Reveal key={i} delay={(((i % 5) + 1) as 1 | 2 | 3 | 4 | 5)}>
              <details className="group border-b border-hairline py-5">
                <summary className="flex items-start justify-between gap-4 cursor-pointer list-none">
                  <span className="flex items-start gap-3 min-w-0">
                    <span className="font-mono text-xs text-fg-subtle tabular pt-0.5 shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-base font-medium text-fg">{f.q}</span>
                  </span>
                  <ChevronDown className="size-4 text-fg-subtle transition-transform group-open:rotate-180 mt-1 shrink-0" />
                </summary>
                <p className="text-sm text-fg-muted mt-3 ml-9 leading-relaxed">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>

        {/* "Still curious" footer card */}
        <Reveal>
          <div className="mt-12 rounded-2xl border border-border bg-surface-sunk/40 p-6 md:p-8 grid md:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <div className="flex items-center gap-2 text-accent text-[11px] uppercase tracking-[0.18em] font-semibold">
                <Send className="size-3.5" /> Still curious
              </div>
              <h3 className="mt-2 text-lg md:text-xl font-semibold text-fg">
                Talk to the team.
              </h3>
              <p className="mt-1.5 text-sm text-fg-muted leading-relaxed max-w-xl">
                Our protocol engineers and ops team answer in the open. Most threads resolve in under an hour.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="md" leadingIcon={<BookOpen className="size-4" />}>
                Read the docs
              </Button>
              <Button size="md" trailingIcon={<ArrowRight className="size-4" />}>
                Open a thread
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ────────────────────────────── CTA ────────────────────────────── */

function FinalCTA() {
  // Cohort close countdown — deterministic starting value
  const [secs, setSecs] = useState(259_200); // 3 days
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 259_200)), 1000);
    return () => clearInterval(id);
  }, []);
  const d = String(Math.floor(secs / 86400)).padStart(2, '0');
  const h = String(Math.floor((secs / 3600) % 24)).padStart(2, '0');
  const m = String(Math.floor((secs / 60) % 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');

  return (
    <section className="relative border-b border-hairline">
      <div className="max-w-6xl mx-auto px-5 py-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-10 md:p-16 text-center">
          {/* Layered backdrop */}
          <div aria-hidden className="absolute inset-0 dot-bg opacity-30 mask-radial-fade" />
          <div aria-hidden className="absolute inset-0 grid-bg opacity-40 mask-radial-fade" />
          <div aria-hidden className="absolute -top-24 left-1/2 -translate-x-1/2 w-[60%] h-40 bg-accent/25 blur-3xl rounded-full" />
          {/* Animated gradient border */}
          <div aria-hidden className="absolute inset-0 rounded-3xl pointer-events-none"
               style={{
                 background:
                   'conic-gradient(from 0deg, color-mix(in oklch, var(--accent) 50%, transparent), transparent 30%, transparent 70%, color-mix(in oklch, var(--info) 50%, transparent))',
                 mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                 WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                 WebkitMaskComposite: 'xor',
                 maskComposite: 'exclude',
                 padding: '1px',
                 animation: 'spin 14s linear infinite',
               }} />
          <div className="relative">
            <Badge tone="accent" className="mb-5"><Sparkles className="size-3" /> Limited cohort access</Badge>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-fg">
              Execution you can <span className="text-gradient">prove</span>.
            </h2>
            <p className="mt-4 text-base md:text-lg text-fg-muted max-w-xl mx-auto">
              Join the next cohort of verified participants. First cycle settles in 7 days.
            </p>

            {/* Cohort closes in pill */}
            <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-hairline bg-surface-sunk/60 px-4 py-1.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-semibold text-fg-subtle">
                <Timer className="size-3.5 text-accent" /> cohort closes in
              </span>
              <span className="flex items-center gap-1 font-mono text-fg text-sm">
                <span className="rounded bg-surface px-1.5 py-0.5 tabular">{d}</span>
                <span className="text-fg-subtle">d</span>
                <span className="rounded bg-surface px-1.5 py-0.5 tabular">{h}</span>
                <span className="text-fg-subtle">h</span>
                <span className="rounded bg-surface px-1.5 py-0.5 tabular">{m}</span>
                <span className="text-fg-subtle">m</span>
                <span className="rounded bg-surface px-1.5 py-0.5 tabular">{s}</span>
                <span className="text-fg-subtle">s</span>
              </span>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/auth/register">
                <Button size="lg" trailingIcon={<ArrowRight className="size-4" />}>Create account</Button>
              </Link>
              <Link href="/auth/login">
                <Button size="lg" variant="secondary">Sign in</Button>
              </Link>
            </div>
            <p className="mt-4 text-[11px] text-fg-subtle">
              Press <Kbd>⌘</Kbd> <Kbd>K</Kbd> anywhere in the dashboard to navigate quickly.
            </p>
          </div>
        </div>
      </div>
      {/* Local keyframes for the rotating border — only used here */}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </section>
  );
}

/* ────────────────────────────── Footer ────────────────────────────── */

function MarketingFooter() {
  const cols = [
    {
      title: 'Product',
      links: [
        { label: 'Services',   href: '#services' },
        { label: 'How it works',href: '#showcase' },
        { label: 'Network',    href: '#network' },
        { label: 'Returns',    href: '#calculator' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Whitepaper', href: '#' },
        { label: 'Protocol docs', href: '#' },
        { label: 'Audit reports', href: '#governance' },
        { label: 'Status page', href: '#' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About',      href: '#' },
        { label: 'Press',      href: '#' },
        { label: 'Careers',    href: '#' },
        { label: 'Contact',    href: '#' },
      ],
    },
  ];
  return (
    <footer className="border-t border-hairline bg-surface">
      {/* Status strip */}
      <div className="border-b border-hairline">
        <div className="max-w-6xl mx-auto px-5 h-11 flex items-center justify-between text-[11px] text-fg-subtle">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <PulseDot tone="success" /> all systems normal
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-fg-subtle">
              <Server className="size-3" /> 6 venues · 184 ms p50
            </span>
          </div>
          <a href="#" className="inline-flex items-center gap-1 hover:text-fg-muted transition-colors">
            View status page <ArrowUpRight className="size-3" />
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-14 grid md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10">
        <div>
          <Logo />
          <p className="mt-4 text-sm text-fg-muted leading-relaxed max-w-sm">
            BEX Network is the verification-first Web3 execution platform.
            AI-driven cycles, signed receipts, public proof.
          </p>
          <div className="mt-5 flex items-center gap-2">
            <Button size="sm" trailingIcon={<ArrowRight className="size-3.5" />}>
              <Link href="/auth/register">Get started</Link>
            </Button>
            <Button size="sm" variant="secondary">
              <Link href="/auth/login">Sign in</Link>
            </Button>
          </div>
        </div>

        {cols.map((c) => (
          <div key={c.title}>
            <div className="text-[11px] uppercase tracking-[0.18em] text-fg-subtle font-semibold mb-3">
              {c.title}
            </div>
            <ul className="space-y-2.5">
              {c.links.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-sm text-fg-muted hover:text-fg transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-hairline">
        <div className="max-w-6xl mx-auto px-5 h-14 flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] text-fg-subtle">
          <span>© {new Date().getFullYear()} Bayes-Euler Limited (BVI). All rights reserved.</span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-fg-muted transition-colors">Terms</a>
            <a href="#" className="hover:text-fg-muted transition-colors">Privacy</a>
            <a href="#" className="hover:text-fg-muted transition-colors">Disclosures</a>
            <span className="hidden md:inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-success" /> mainnet · 19,283,114
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ────────────────────────────── Helpers ────────────────────────────── */

function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'center',
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: 'left' | 'center';
}) {
  return (
    <div className={align === 'center' ? 'text-center max-w-2xl mx-auto' : ''}>
      {eyebrow && (
        <div className="text-[11px] uppercase tracking-[0.18em] text-accent font-semibold mb-3">{eyebrow}</div>
      )}
      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-fg leading-tight">{title}</h2>
      {description && <p className="mt-4 text-base text-fg-muted leading-relaxed">{description}</p>}
    </div>
  );
}
