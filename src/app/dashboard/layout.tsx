'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, TrendingUp, Receipt,
  Trophy, Activity, UserCircle, ShieldCheck,
  Wallet as WalletIcon,
} from 'lucide-react';
import { AppShell, type NavGroup } from '@/components/layout/AppShell';
import { authAPI } from '@/lib/api';
import { WalletProvider } from '@/components/wallet/WalletProvider';

const groups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard',              label: 'Dashboard',    icon: <LayoutDashboard />, exact: true },
      { href: '/dashboard/trades',       label: 'Live trades',  icon: <Activity /> },
    ],
  },
  {
    label: 'Treasury',
    items: [
      { href: '/dashboard/wallet',       label: 'Wallet',       icon: <WalletIcon /> },
      { href: '/dashboard/deposit',      label: 'Deposit',      icon: <ArrowDownToLine /> },
      { href: '/dashboard/withdrawal',   label: 'Withdraw',     icon: <ArrowUpFromLine /> },
      { href: '/dashboard/transactions', label: 'Transactions', icon: <Receipt /> },
    ],
  },
  {
    label: 'Markets',
    items: [
      { href: '/dashboard/investments',  label: 'Investments',  icon: <TrendingUp /> },
    ],
  },
  {
    label: 'Network',
    items: [
      { href: '/dashboard/ambassador',   label: 'Ambassador',   icon: <Trophy /> },
      { href: '/dashboard/profile',      label: 'Profile',      icon: <UserCircle /> },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/auth/login'); return; }
    authAPI.me().then((res) => {
      const data = res.data;
      if (data.is_admin) { router.push('/admin'); return; }
      setUser(data.customer);
    }).catch(() => {
      localStorage.removeItem('access_token');
      router.push('/auth/login');
    });
  }, [router]);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('is_admin');
    router.push('/auth/login');
  };

  return (
    <WalletProvider>
      <AppShell
        groups={groups}
        user={user}
        onLogout={logout}
        brandSuffix={
          <div className="flex items-center gap-2 text-xs text-fg-muted">
            <ShieldCheck className="size-3.5 text-accent" />
            <span>Verified workspace</span>
          </div>
        }
      >
        {children}
      </AppShell>
    </WalletProvider>
  );
}
