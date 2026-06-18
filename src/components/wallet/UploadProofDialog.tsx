'use client';

import { useEffect, useRef, useState } from 'react';
import { UploadCloud, FileCheck2, Receipt, X } from 'lucide-react';
import { transactionAPI } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Input';
import { formatMoney, shortDate } from '@/lib/ui';

interface Deposit {
  id: number | string;
  type: string;
  amount: number | string;
  status: number;
  date_created: string;
  method?: string;
  currency_name?: string;
  prove_url?: string;
}

const MAX_MB = 8;

/**
 * Upload a payment proof / receipt and attach it to one of the user's pending
 * deposits. Submits multipart to /transactions/upload_proof/.
 */
export function UploadProofDialog({ open, onClose, onUploaded }: {
  open: boolean;
  onClose: () => void;
  onUploaded?: () => void;
}) {
  const { toast } = useToast() || { toast: (() => {}) as any };
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selected, setSelected] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setLoadingList(true);
    transactionAPI.list({ type: 'deposit' })
      .then((r) => {
        const rows: Deposit[] = (r.data?.results ?? r.data ?? []);
        // Deposits awaiting verification (pending/processing) come first.
        const pending = rows.filter((d) => d.type === 'deposit' && (d.status === 0 || d.status === 2));
        const list = (pending.length ? pending : rows.filter((d) => d.type === 'deposit')).slice(0, 25);
        setDeposits(list);
        setSelected((prev) => (list.find((d) => String(d.id) === prev) ? prev : (list[0] ? String(list[0].id) : '')));
      })
      .catch(() => setDeposits([]))
      .finally(() => setLoadingList(false));
  }, [open]);

  const pickFile = (f: File | null) => {
    if (!f) { setFile(null); return; }
    if (!f.type.startsWith('image/')) { toast('Please upload an image — a screenshot or photo of your payment', 'error'); return; }
    if (f.size > MAX_MB * 1024 * 1024) { toast(`Image must be under ${MAX_MB}MB`, 'error'); return; }
    setFile(f);
  };

  const submit = async () => {
    if (!selected) { toast('Choose which deposit this proof is for', 'error'); return; }
    if (!file) { toast('Attach your payment proof / receipt', 'error'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('transaction_id', String(selected));
      fd.append('prove', file);
      await transactionAPI.uploadProof(fd);
      toast('Payment proof uploaded — our team will verify shortly');
      onUploaded?.();
      onClose();
    } catch (err: any) {
      toast(err?.response?.data?.error || 'Upload failed', 'error');
    } finally { setLoading(false); }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Upload payment proof"
      description="Attach your receipt or payment screenshot so we can verify and credit your deposit."
      maxWidth="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={submit} loading={loading} disabled={!selected || !file} leadingIcon={<UploadCloud className="size-4" />}>
            Upload proof
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Which deposit?" required>
          {loadingList ? (
            <div className="skeleton h-10 rounded-md" />
          ) : deposits.length === 0 ? (
            <div className="text-[13px] text-fg-muted p-3 rounded-lg border border-dashed border-border-strong bg-surface-sunk/40">
              No deposits found. Make a deposit first, then upload your proof here.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
              {deposits.map((d) => {
                const active = String(d.id) === selected;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelected(String(d.id))}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
                      active ? 'border-accent bg-accent-soft/40' : 'border-border hover:border-border-strong'
                    }`}
                  >
                    <span className={`grid place-items-center size-8 rounded-lg shrink-0 ${active ? 'bg-accent text-accent-fg' : 'bg-surface-sunk text-fg-muted'}`}>
                      <Receipt className="size-4" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13.5px] font-semibold text-fg tabular">{formatMoney(d.amount)}</span>
                      <span className="block text-[12px] text-fg-muted">
                        {shortDate(d.date_created)} · {d.status === 0 ? 'Pending' : d.status === 2 ? 'Under review' : 'Submitted'}
                        {d.prove_url ? ' · proof on file' : ''}
                      </span>
                    </span>
                    <span className={`size-4 rounded-full border-2 shrink-0 ${active ? 'border-accent bg-accent' : 'border-border'}`} />
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        <Field label="Receipt / proof" hint="Image (screenshot or photo), up to 8MB" required>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface-sunk/40">
              <FileCheck2 className="size-5 text-success shrink-0" />
              <span className="flex-1 min-w-0 truncate text-[13px] text-fg">{file.name}</span>
              <button type="button" onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ''; }} className="text-fg-subtle hover:text-fg" aria-label="Remove file">
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-1.5 p-5 rounded-lg border border-dashed border-border-strong bg-surface-sunk/30 text-fg-muted hover:text-fg hover:border-accent transition-colors"
            >
              <UploadCloud className="size-6" />
              <span className="text-[13px] font-medium">Click to choose an image</span>
              <span className="text-[11.5px] text-fg-subtle">Screenshot or photo of your payment</span>
            </button>
          )}
        </Field>
      </div>
    </Dialog>
  );
}
