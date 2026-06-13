import Link from 'next/link';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/ui';

export interface SubNavItem { href: string; label: string; icon?: ReactNode }

export function SubNav({ items }: { items: SubNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="mb-6 border-b border-border">
      <div className="flex items-center gap-1 overflow-x-auto">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 h-10 text-[14px] font-medium whitespace-nowrap',
                'border-b-2 -mb-px transition-colors',
                active
                  ? 'border-accent text-fg'
                  : 'border-transparent text-fg-muted hover:text-fg hover:border-border-strong'
              )}
            >
              {item.icon && <span className="[&>svg]:size-4 text-fg-subtle">{item.icon}</span>}
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
