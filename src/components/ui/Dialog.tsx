'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/ui';

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-md',
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      // Backdrop and click-handler live on the SAME element so a click
      // outside the panel always lands on a node where
      // `e.target === e.currentTarget` is true. Putting the dim layer
      // on a sibling would make the listener never fire and silently
      // break "click outside to close".
      className="fixed inset-0 z-[1000] flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/40 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={ref}
        className={cn(
          'relative w-full bg-surface border border-border rounded-xl shadow-[var(--shadow-pop)] animate-rise-in',
          // Cap the panel to the viewport height so long flows (e.g. wallet
          // creation, with its 5 sub-steps + mnemonic grid + mobile guide)
          // scroll inside the panel instead of overflowing the screen.
          'flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]',
          maxWidth
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-2 shrink-0">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-fg">{title}</h2>}
            {description && <p className="text-xs text-fg-muted mt-1">{description}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" className="shrink-0">
            <X className="size-4" />
          </Button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1 overscroll-contain">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-hairline bg-surface-sunk/50 rounded-b-xl shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
