'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle, Copy, Eye, EyeOff, KeyRound, ShieldAlert, Trash2,
} from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { useToast } from '@/components/ToastProvider';
import { useWallet } from './WalletProvider';
import { MnemonicGrid } from './MnemonicGrid';
import { decryptKeystore, loadStoredKeystore, shortAddress } from '@/lib/wallet';
import { HDNodeWallet, type Mnemonic } from 'ethers';

/**
 * Reveal the private key (and mnemonic, if it was a generated wallet) after
 * the user authenticates with their wallet password. The mnemonic is recovered
 * from the keystore via the derivation path stored on it — ethers' Wallet
 * exposes `mnemonic` on the decrypted instance.
 */
export function WalletRevealDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast() || { toast: (() => {}) as any };
  const { address, disconnect } = useWallet();
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState<{ pk: string; mnemonic: string | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) { setPassword(''); setShowPw(false); setRevealed(null); setConfirmDelete(false); }
  }, [open]);

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const json = loadStoredKeystore();
    if (!json) { toast('No wallet found on this device', 'error'); return; }
    setLoading(true);
    try {
      const wallet = await decryptKeystore(json, password);
      // The ethers Wallet returned by fromEncryptedJson is actually an
      // HDNodeWallet when the encrypted JSON carries mnemonic data — which
      // ours always do (we encrypt the freshly-created HD wallet).
      const mnem: Mnemonic | null =
        wallet instanceof HDNodeWallet ? wallet.mnemonic : null;
      setRevealed({ pk: wallet.privateKey, mnemonic: mnem?.phrase ?? null });
    } catch (err: any) {
      toast(err?.message?.includes('password') ? 'Wrong password' : 'Could not decrypt wallet', 'error');
    } finally { setLoading(false); }
  };

  const copy = async (s: string, label: string) => { await navigator.clipboard.writeText(s); toast(`${label} copied`); };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Wallet keys"
      description={address ? `For ${shortAddress(address)}` : ''}
      maxWidth="max-w-xl"
    >
      {!revealed ? (
        <form onSubmit={unlock} className="space-y-4">
          <div className="flex gap-3 p-3 rounded-lg border border-warning/30 bg-warning-soft text-xs">
            <ShieldAlert className="size-4 text-warning shrink-0 mt-0.5" />
            <span className="text-fg">
              Anyone who sees your private key or recovery phrase can take all of your funds.
              Make sure no one is watching your screen.
            </span>
          </div>
          <Field label="Wallet password" required>
            <Input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              leadingIcon={<KeyRound />}
              trailingIcon={
                <button type="button" onClick={() => setShowPw(!showPw)} className="pointer-events-auto hover:text-fg-muted">
                  {showPw ? <EyeOff /> : <Eye />}
                </button>
              }
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading} disabled={password.length < 1}>Unlock & reveal</Button>
          </div>
        </form>
      ) : (
        <div className="space-y-5">
          {revealed.mnemonic && (
            <section>
              <h4 className="text-xs font-semibold text-fg uppercase tracking-wider mb-2">Recovery phrase</h4>
              <MnemonicGrid phrase={revealed.mnemonic} />
              <div className="mt-2">
                <Button variant="secondary" size="sm" leadingIcon={<Copy className="size-3.5" />} onClick={() => copy(revealed.mnemonic!, 'Phrase')}>
                  Copy phrase
                </Button>
              </div>
            </section>
          )}

          <section>
            <h4 className="text-xs font-semibold text-fg uppercase tracking-wider mb-2">Private key</h4>
            <div className="p-3 rounded-lg border border-border bg-surface-sunk font-mono text-xs break-all text-fg select-all">
              {revealed.pk}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" leadingIcon={<Copy className="size-3.5" />} onClick={() => copy(revealed.pk, 'Private key')}>
                Copy key
              </Button>
            </div>
          </section>

          <section className="pt-4 border-t border-hairline">
            <h4 className="text-xs font-semibold text-danger uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" /> Danger zone
            </h4>
            <p className="text-xs text-fg-muted mb-2">
              Removing the wallet only deletes the encrypted copy on this device. As long as you have your recovery phrase, you can re-import it later.
            </p>
            {!confirmDelete ? (
              <Button variant="danger" size="sm" leadingIcon={<Trash2 className="size-3.5" />} onClick={() => setConfirmDelete(true)}>
                Remove wallet from this device
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-fg">Sure? This cannot be undone.</span>
                <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                <Button variant="danger" size="sm" onClick={() => { disconnect(); onClose(); toast('Wallet removed'); }}>
                  Yes, remove
                </Button>
              </div>
            )}
          </section>

          <div className="flex justify-end pt-2">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
