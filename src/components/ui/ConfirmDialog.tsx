'use client';

import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Dialog } from './Dialog';
import { Button } from './Button';

export type ConfirmRow = { label: string; value: ReactNode };

/**
 * Reconfirmation step shown before any money movement is submitted
 * (deposit, withdrawal, investment, cashout). Renders a read-only
 * summary of what's about to happen plus an explicit Confirm action.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm transaction',
  description = 'Review the details below — this is submitted as soon as you confirm.',
  rows = [],
  note,
  confirmLabel = 'Confirm',
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: ReactNode;
  description?: ReactNode;
  rows?: ConfirmRow[];
  /** Optional warning strip under the summary (e.g. irreversibility). */
  note?: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      maxWidth="max-w-sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </div>
      }
    >
      {rows.length > 0 && (
        <div className="rounded-lg border border-hairline divide-y divide-hairline bg-surface-sunk/40">
          {rows.map((r) => (
            <div key={String(r.label)} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13px]">
              <span className="text-fg-muted shrink-0">{r.label}</span>
              <span className="text-fg font-medium text-right break-all tabular">{r.value}</span>
            </div>
          ))}
        </div>
      )}
      {note && (
        <div className="mt-3 flex gap-2 p-3 rounded-lg border border-warning/30 bg-warning-soft text-xs text-fg">
          <ShieldAlert className="size-4 text-warning shrink-0 mt-0.5" />
          <span>{note}</span>
        </div>
      )}
    </Dialog>
  );
}
