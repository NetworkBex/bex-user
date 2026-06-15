'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/ui';

export interface IconSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: ReactNode;
}

/** A native-select replacement that can render an icon per option. Keyboard
 *  accessible enough for our needs: opens on click, closes on outside-click /
 *  Escape, selects on click. */
export function IconSelect({
  value, onChange, options, placeholder = 'Select…', disabled, className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: IconSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center gap-2.5 h-10 px-3 rounded-md border bg-[image:var(--surface-gloss)] text-left text-sm transition-colors',
          'border-border hover:border-border-strong disabled:opacity-50 disabled:cursor-not-allowed',
          open && 'border-accent shadow-[0_0_0_3px_var(--ring)]',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected?.icon && <span className="shrink-0">{selected.icon}</span>}
        <span className="flex-1 min-w-0 truncate">
          {selected ? (
            <>
              <span className="font-medium text-fg">{selected.label}</span>
              {selected.sublabel && <span className="text-fg-muted"> · {selected.sublabel}</span>}
            </>
          ) : (
            <span className="text-fg-subtle">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={cn('size-4 text-fg-subtle shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1.5 w-full max-h-72 overflow-auto rounded-lg border border-border bg-[image:var(--surface-gloss)] shadow-[var(--shadow-pop)] p-1 animate-rise-in"
        >
          {options.length === 0 && <li className="px-3 py-2 text-sm text-fg-subtle">No options</li>}
          {options.map((o) => {
            const active = o.value === value;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left text-sm transition-colors',
                    active ? 'bg-accent-soft text-fg' : 'text-fg hover:bg-surface-sunk',
                  )}
                  role="option"
                  aria-selected={active}
                >
                  {o.icon && <span className="shrink-0">{o.icon}</span>}
                  <span className="flex-1 min-w-0 truncate">
                    <span className="font-medium">{o.label}</span>
                    {o.sublabel && <span className="text-fg-muted"> · {o.sublabel}</span>}
                  </span>
                  {active && <Check className="size-4 text-accent shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
