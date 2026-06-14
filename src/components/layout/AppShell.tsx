'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search, Menu, X, LogOut, ChevronDown, BellDot, Command as CmdIcon,
  ExternalLink, Wallet,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Kbd, PulseDot } from '@/components/ui/Badge';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn, formatMoney, initials } from '@/lib/ui';

export interface NavGroup {
  label: string;
  items: NavItem[];
}
export interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: string | number;
  exact?: boolean;
}

interface AppShellProps {
  groups: NavGroup[];
  user?: { username?: string; email?: string; acc_balance?: string | number } | null;
  brandHref?: string;
  brandSuffix?: ReactNode;
  rightTopbar?: ReactNode;
  onLogout: () => void;
  children: ReactNode;
}

export function AppShell({ groups, user, brandHref = '/dashboard', brandSuffix, rightTopbar, onLogout, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Command palette shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((s) => !s);
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const allItems = useMemo(() => groups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label }))), [groups]);
  const filtered = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase();
    if (!q) return allItems.slice(0, 8);
    return allItems.filter((i) => i.label.toLowerCase().includes(q) || i.group.toLowerCase().includes(q)).slice(0, 8);
  }, [allItems, paletteQuery]);

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <div className="min-h-screen bg-canvas text-fg">
      {/* Sidebar — fixed on all breakpoints. We animate with the `left`
          property (not `transform`) so the element never becomes a
          containing block for its own fixed children, and the sidebar
          stays pinned to the viewport even when the page scrolls. */}
      <aside
        className={cn(
          'fixed top-0 inset-y-0 z-50 w-[260px] shrink-0',
          'bg-surface border-r border-border flex flex-col h-screen',
          'transition-[left] duration-200 ease-out',
          mobileOpen ? 'left-0' : '-left-[260px] lg:left-0'
        )}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-hairline">
          <Link href={brandHref} className="text-fg">
            <Logo />
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-fg-muted hover:text-fg"
            aria-label="Close sidebar"
          >
            <X className="size-5" />
          </button>
        </div>

        {brandSuffix && <div className="px-4 py-3 border-b border-hairline">{brandSuffix}</div>}

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                {group.label}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'group relative flex items-center gap-2.5 px-3 py-2 rounded-md text-[14px] transition-all',
                          active
                            ? 'bg-[color-mix(in_oklch,var(--accent)_12%,var(--surface))] text-fg font-semibold ring-1 ring-[color-mix(in_oklch,var(--accent)_22%,transparent)] shadow-[var(--highlight-top)]'
                            : 'text-fg-muted hover:bg-surface-sunk/60 hover:text-fg'
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent" aria-hidden />
                        )}
                        <span
                          className={cn(
                            '[&>svg]:size-4 shrink-0 transition-colors',
                            active ? 'text-accent' : 'text-fg-muted group-hover:text-fg'
                          )}
                        >
                          {item.icon}
                        </span>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge != null && (
                          <Badge tone={active ? 'accent' : 'neutral'} className="!py-0">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-hairline space-y-2">
          {user && (
            <div className="flex items-center gap-2.5 p-2 rounded-md hover:bg-surface-sunk/60 transition-colors">
              <Avatar name={user.username || user.email} size={32} />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold truncate text-fg leading-tight">{user.username || 'User'}</div>
                <div className="text-[12px] text-fg-muted truncate">{user.email}</div>
              </div>
              <button
                onClick={onLogout}
                className="text-fg-subtle hover:text-danger transition-colors"
                aria-label="Logout"
                title="Logout"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          aria-hidden
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main column — leaves room for the fixed sidebar on lg+ */}
      <div className="flex flex-col min-h-screen lg:pl-[260px]">
        <header className="sticky top-0 z-30 bg-canvas/65 backdrop-blur-xl backdrop-saturate-150 border-b border-hairline shadow-[0_1px_0_oklch(100%_0_0_/_0.04)] h-14 flex items-center px-4 lg:px-6 gap-3">
          <button
            className="lg:hidden text-fg-muted hover:text-fg"
            onClick={() => setMobileOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="size-5" />
          </button>

          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 h-9 w-[280px] px-3 rounded-md border border-border bg-surface hover:bg-surface-2 text-fg-muted text-[13px] transition-colors"
          >
            <Search className="size-4" />
            <span>Search or jump to…</span>
            <span className="ml-auto flex items-center gap-1">
              <Kbd>⌘</Kbd><Kbd>K</Kbd>
            </span>
          </button>

          <div className="md:hidden flex-1" />

          <div className="ml-auto flex items-center gap-2">
            {rightTopbar}
            {user?.acc_balance != null && (
              <span className="hidden sm:inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface text-[13px]">
                <Wallet className="size-4 text-accent" />
                <span className="tabular font-semibold">{formatMoney(user.acc_balance)}</span>
                <span className="text-fg-muted text-[12px]">USD</span>
              </span>
            )}
            <button
              className="relative inline-grid place-items-center size-9 rounded-md text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors"
              aria-label="Notifications"
            >
              <BellDot className="size-4" />
              <span className="absolute top-2 right-2 size-1.5 bg-accent rounded-full" />
            </button>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 px-4 lg:px-6 py-6 lg:py-8 max-w-[1400px] w-full mx-auto">{children}</main>

        <footer className="px-4 lg:px-6 py-6 border-t border-hairline text-[12px] text-fg-muted flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} BEX Network · Bayes-Euler Limited (BVI)</span>
          <div className="flex items-center gap-1.5">
            <PulseDot tone="success" /><span>All systems operational</span>
          </div>
        </footer>
      </div>

      {/* Command Palette */}
      {paletteOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-start justify-center pt-24 px-4 animate-fade-in"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setPaletteOpen(false); }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg glass rounded-xl shadow-[var(--shadow-pop)] overflow-hidden animate-rise-in">
            <div className="flex items-center gap-2 px-4 h-12 border-b border-hairline">
              <CmdIcon className="size-4 text-fg-subtle" />
              <input
                autoFocus
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                placeholder="Jump to…"
                className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-fg-subtle"
              />
              <Kbd>esc</Kbd>
            </div>
            <ul className="max-h-[320px] overflow-y-auto p-2">
              {filtered.length === 0 && (
                <li className="px-3 py-8 text-center text-sm text-fg-subtle">No matches.</li>
              )}
              {filtered.map((item) => (
                <li key={item.href}>
                  <button
                    onClick={() => { router.push(item.href); setPaletteOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-fg hover:bg-surface-sunk transition-colors"
                  >
                    <span className="text-fg-subtle [&>svg]:size-4">{item.icon}</span>
                    <span className="flex-1 text-left">{item.label}</span>
                    <span className="text-[11px] text-fg-subtle">{(item as any).group}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between px-3 h-9 border-t border-hairline text-[11px] text-fg-subtle">
              <span className="flex items-center gap-1"><Kbd>↑↓</Kbd> navigate</span>
              <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7">
      <div className="min-w-0">
        {breadcrumb && (
          <nav className="flex items-center gap-1.5 text-[13px] text-fg-muted mb-2.5">
            {breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {b.href ? <Link href={b.href} className="hover:text-fg">{b.label}</Link> : <span>{b.label}</span>}
                {i < breadcrumb.length - 1 && <span className="text-fg-subtle">/</span>}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-[28px] md:text-[32px] font-semibold tracking-tight text-fg leading-tight">{title}</h1>
        {description && <p className="text-[15px] text-fg-muted mt-2 max-w-2xl leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
