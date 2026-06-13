'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, ArrowDownToLine, ArrowUpFromLine, TrendingUp,
  ListChecks, Settings, User as UserIcon, ShieldAlert, Wallet,
} from 'lucide-react';
import { AppShell, type NavGroup } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';

const groups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard />, exact: true },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin/users',        label: 'Users',        icon: <Users /> },
      { href: '/admin/deposits',     label: 'Deposits',     icon: <ArrowDownToLine /> },
      { href: '/admin/withdrawals',  label: 'Withdrawals',  icon: <ArrowUpFromLine /> },
      { href: '/admin/investments',  label: 'Investments',  icon: <TrendingUp /> },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { href: '/admin/plans',        label: 'Plans',        icon: <ListChecks /> },
      { href: '/admin/wallets',      label: 'Wallets',      icon: <Wallet /> },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/settings',     label: 'Settings',     icon: <Settings /> },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isAdmin = localStorage.getItem('is_admin') === 'true';
    const token = localStorage.getItem('access_token');
    if (!token || !isAdmin) { router.push('/auth/login'); return; }
    setReady(true);
  }, [router]);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('is_admin');
    router.push('/auth/login');
  };

  if (!ready) return null;

  return (
    <AppShell
      groups={groups}
      onLogout={logout}
      brandHref="/admin"
      user={{ username: 'Operator', email: 'admin@bex.network' }}
      brandSuffix={
        <div className="flex items-center justify-between">
          <Badge tone="warning">Admin mode</Badge>
          <Link href="/dashboard" className="text-xs text-fg-muted hover:text-fg flex items-center gap-1">
            <UserIcon className="size-3" /> User view
          </Link>
        </div>
      }
      rightTopbar={
        <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 h-9 rounded-md border border-warning/30 bg-warning-soft text-warning text-xs font-medium">
          <ShieldAlert className="size-3.5" /> Elevated permissions
        </span>
      }
    >
      {children}
    </AppShell>
  );
}
