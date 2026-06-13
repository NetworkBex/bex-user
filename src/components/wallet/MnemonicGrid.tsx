'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/ui';

/** Display a BIP-39 mnemonic in a 3-column numbered grid with blur-on-demand. */
export function MnemonicGrid({
  phrase,
  initiallyHidden = true,
  className,
}: {
  phrase: string;
  initiallyHidden?: boolean;
  className?: string;
}) {
  const [hidden, setHidden] = useState(initiallyHidden);
  const words = phrase.trim().split(/\s+/);

  return (
    <div className={cn('relative', className)}>
      <div className={cn(
        'grid grid-cols-3 gap-2 p-3 rounded-lg border border-border bg-surface-sunk transition-all',
        hidden && 'blur-sm select-none'
      )}>
        {words.map((w, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-surface border border-hairline text-sm"
          >
            <span className="text-[10px] font-mono text-fg-subtle w-4 tabular text-right">{i + 1}</span>
            <span className="text-fg font-medium font-mono">{w}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setHidden((h) => !h)}
        className="absolute top-2 right-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface border border-border text-xs text-fg-muted hover:text-fg hover:border-border-strong transition-colors"
      >
        {hidden ? <><Eye className="size-3" /> Reveal</> : <><EyeOff className="size-3" /> Hide</>}
      </button>
    </div>
  );
}
