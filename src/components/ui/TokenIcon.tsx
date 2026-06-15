'use client';

import { useState } from 'react';
import { cn } from '@/lib/ui';
import { currencyIcon } from '@/lib/tokenIcons';

const PALETTE = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];

function hueFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Round token badge. Renders the brand icon for a symbol/chain, falling back
 *  to a coloured letter avatar when no artwork exists (e.g. Base, POL native). */
export function TokenIcon({
  symbol, chainId, src, size = 22, className,
}: {
  symbol?: string | null;
  chainId?: number | null;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const url = src ?? currencyIcon(symbol, chainId);
  const [failed, setFailed] = useState(false);

  if (url && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={symbol ?? 'token'}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className={cn('rounded-full object-cover shrink-0', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  const letter = (symbol || '?').charAt(0).toUpperCase();
  return (
    <span
      className={cn('grid place-items-center rounded-full text-white font-semibold shrink-0', className)}
      style={{ width: size, height: size, fontSize: size * 0.46, background: hueFor(symbol || '?') }}
      aria-hidden
    >
      {letter}
    </span>
  );
}
