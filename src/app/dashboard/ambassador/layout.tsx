'use client';

import { LayoutDashboard, Users, Coins, Trophy, Sparkles, Gem, Award } from 'lucide-react';
import { SubNav } from '@/components/ambassador/SubNav';
import { AmbassadorProvider } from '@/components/ambassador/AmbassadorProvider';

const items = [
  { href: '/dashboard/ambassador',           label: 'Overview',         icon: <LayoutDashboard /> },
  { href: '/dashboard/ambassador/team',      label: 'Team',             icon: <Users /> },
  { href: '/dashboard/ambassador/earnings',  label: 'Earnings',         icon: <Coins /> },
  { href: '/dashboard/ambassador/ranks',     label: 'Ranks',            icon: <Trophy /> },
  { href: '/dashboard/ambassador/milestones',label: 'Milestones',       icon: <Award /> },
  { href: '/dashboard/ambassador/token',     label: '$BEX',             icon: <Sparkles /> },
  { href: '/dashboard/ambassador/founding',  label: 'Founding partner', icon: <Gem /> },
];

export default function AmbassadorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AmbassadorProvider>
      <SubNav items={items} />
      {children}
    </AmbassadorProvider>
  );
}
