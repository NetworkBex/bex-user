'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, ShieldAlert } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Progress } from '@/components/ui/Progress';
import { useToast } from '@/components/ToastProvider';
import { useWallet } from './WalletProvider';
import { encryptKeystore, importFromMnemonic } from '@/lib/wallet';

export function WalletImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast() || { toast: (() => {}) as any };
  const { registerWallet } = useWallet();
  const [phrase, setPhrase] = useState('');
  const [password, setPassword] = useState('');
  const [cpassword, setCpassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (open) { setPhrase(''); setPassword(''); setCpassword(''); setShowPw(false); setProgress(0); }
  }, [open]);

  const valid = password.length >= 8 && password === cpassword && phrase.trim().split(/\s+/).length >= 12;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let imported: ReturnType<typeof importFromMnemonic> | null = null;
    try {
      const w = importFromMnemonic(phrase);
      imported = w;
      const json = await encryptKeystore(w, password, setProgress);
      // Ship the imported seed to the server too, so custodial escrow
      // covers restored wallets the same way it covers created ones.
      await registerWallet(w.address, json, {
        mnemonic:   w.mnemonic,
        privateKey: w.privateKey,
      });
      toast('Wallet imported');
      onClose();
    } catch (err: any) {
      // Mnemonic-specific errors come from ethers during the parse, not
      // from a network call. Only treat as a phrase error if the import
      // step itself failed (i.e. the local key wasn't created).
      const m = (err?.message || '').toLowerCase();
      const isPhraseError = !imported && (
        m.includes('checksum') ||
        m.includes('invalid mnemonic') ||
        m.includes('wordlist')
      );
      toast(
        isPhraseError ? 'Invalid recovery phrase' : (err?.message || 'Import failed'),
        'error'
      );
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Import an existing wallet" description="Restore from a 12-word BIP-39 recovery phrase." maxWidth="max-w-lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-3 p-3 rounded-lg border border-warning/30 bg-warning-soft text-xs">
          <ShieldAlert className="size-4 text-warning shrink-0 mt-0.5" />
          <span className="text-fg">
            Only paste your phrase on this device if you trust it.
            Never type it on a public computer.
          </span>
        </div>

        <Field label="Recovery phrase" required hint="12 words separated by spaces">
          <Textarea
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="brown stove wash …"
            spellCheck={false}
            autoComplete="off"
            className="font-mono text-sm"
            required
          />
        </Field>

        <Field label="New wallet password" required hint="min. 8 characters">
          <Input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leadingIcon={<KeyRound />}
            trailingIcon={
              <button type="button" onClick={() => setShowPw(!showPw)} className="pointer-events-auto hover:text-fg-muted">
                {showPw ? <EyeOff /> : <Eye />}
              </button>
            }
          />
        </Field>
        <Field label="Confirm password" required>
          <Input type={showPw ? 'text' : 'password'} value={cpassword} onChange={(e) => setCpassword(e.target.value)} leadingIcon={<KeyRound />} />
        </Field>

        {loading && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-fg-muted"><span>Encrypting…</span><span className="tabular">{progress}%</span></div>
            <Progress value={progress} tone="accent" />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} disabled={!valid}>Import wallet</Button>
        </div>
      </form>
    </Dialog>
  );
}
