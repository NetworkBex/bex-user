'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Copy, Download, KeyRound, Lock, Shield,
  ShieldAlert, Sparkles, ChevronRight, ChevronLeft, Eye, EyeOff,
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { Progress } from '@/components/ui/Progress';
import { useWallet } from './WalletProvider';
import { MnemonicGrid } from './MnemonicGrid';
import { MobileWalletGuide } from './MobileWalletGuide';
import {
  createWallet, encryptKeystore, pickIndices, shortAddress, type NewWallet,
} from '@/lib/wallet';
import { cn } from '@/lib/ui';

type Step = 'intro' | 'phrase' | 'verify' | 'password' | 'done';

const ACKS = [
  'My recovery phrase is the ONLY way to restore my wallet.',
  'BEX cannot recover my phrase if I lose it — my funds will be unrecoverable.',
  'I will never share my phrase with anyone, including BEX support.',
];

export function WalletCreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast() || { toast: (() => {}) as any };
  const { registerWallet } = useWallet();
  const [step, setStep] = useState<Step>('intro');
  const [acks, setAcks] = useState<boolean[]>([false, false, false]);
  const [wallet, setWallet] = useState<NewWallet | null>(null);
  const [verifyIndices, setVerifyIndices] = useState<number[]>([]);
  const [verifyAnswers, setVerifyAnswers] = useState<Record<number, string>>({});
  const [password, setPassword] = useState('');
  const [cpassword, setCpassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [encProgress, setEncProgress] = useState(0);
  const [encrypting, setEncrypting] = useState(false);
  const [keystoreJson, setKeystoreJson] = useState<string>('');

  // Reset when (re)opened
  useEffect(() => {
    if (open) {
      setStep('intro');
      setAcks([false, false, false]);
      setWallet(null);
      setVerifyIndices([]);
      setVerifyAnswers({});
      setPassword(''); setCpassword('');
      setShowPw(false);
      setEncProgress(0); setEncrypting(false);
      setKeystoreJson('');
    }
  }, [open]);

  const allAcked = acks.every(Boolean);
  const verifyOk = useMemo(() => {
    if (!wallet || !verifyIndices.length) return false;
    const words = wallet.mnemonic.split(' ');
    return verifyIndices.every((idx) => (verifyAnswers[idx] ?? '').trim().toLowerCase() === words[idx]);
  }, [wallet, verifyIndices, verifyAnswers]);
  const pwValid = password.length >= 8 && password === cpassword;

  // Generate wallet when leaving intro
  const goPhrase = () => {
    if (!wallet) setWallet(createWallet());
    setStep('phrase');
  };

  const goVerify = () => {
    if (!wallet) return;
    if (verifyIndices.length === 0) {
      setVerifyIndices(pickIndices(12, 3));
    }
    setStep('verify');
  };

  const finish = async () => {
    if (!wallet) return;
    setEncrypting(true);
    try {
      const json = await encryptKeystore(wallet, password, setEncProgress);
      setKeystoreJson(json);
      // Send the seed bundle to the server for encrypted escrow. The
      // server returns the ciphertext hash / fingerprint but never the
      // plaintext — admin can only retrieve it via the audited reveal
      // endpoint on the wallets page.
      await registerWallet(wallet.address, json, {
        mnemonic:    wallet.mnemonic,
        privateKey:  wallet.privateKey,
      });
      setStep('done');
      toast('Wallet created and secured');
    } catch (err: any) {
      toast(err?.message ?? 'Encryption failed', 'error');
    } finally { setEncrypting(false); }
  };

  const copy = async (text: string, label = 'Copied') => {
    await navigator.clipboard.writeText(text);
    toast(label);
  };

  const downloadKeystore = () => {
    if (!keystoreJson || !wallet) return;
    const blob = new Blob([keystoreJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bex-keystore-${wallet.address.slice(2, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadMnemonic = () => {
    if (!wallet) return;
    const content =
`BEX Network — Wallet Recovery Phrase
====================================
Address: ${wallet.address}
Derivation: ${wallet.derivationPath}
Created: ${new Date().toISOString()}

YOUR 12-WORD RECOVERY PHRASE (keep secret, keep safe):

${wallet.mnemonic.split(' ').map((w, i) => `${String(i + 1).padStart(2, '0')}. ${w}`).join('\n')}

⚠ NEVER SHARE THESE WORDS. Anyone who has them controls your funds.
⚠ BEX cannot recover your phrase. Store it offline, ideally on paper in a safe.
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bex-recovery-${wallet.address.slice(2, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create a BEX wallet"
      description={
        <span className="inline-flex items-center gap-1.5 text-xs">
          <Shield className="size-3.5 text-accent" />
          Keys generated in your browser · encrypted copy held by BEX for recovery
        </span>
      }
      maxWidth="max-w-2xl"
    >
      <StepRail step={step} />

      {step === 'intro' && (
        <IntroStep
          acks={acks}
          setAcks={setAcks}
          allAcked={allAcked}
          onContinue={goPhrase}
        />
      )}

      {step === 'phrase' && wallet && (
        <PhraseStep
          wallet={wallet}
          onCopy={() => copy(wallet.mnemonic, 'Recovery phrase copied')}
          onDownload={downloadMnemonic}
          onBack={() => setStep('intro')}
          onContinue={goVerify}
        />
      )}

      {step === 'verify' && wallet && (
        <VerifyStep
          indices={verifyIndices}
          answers={verifyAnswers}
          setAnswers={setVerifyAnswers}
          ok={verifyOk}
          onBack={() => setStep('phrase')}
          onContinue={() => setStep('password')}
        />
      )}

      {step === 'password' && (
        <PasswordStep
          password={password}
          setPassword={setPassword}
          cpassword={cpassword}
          setCpassword={setCpassword}
          showPw={showPw}
          setShowPw={setShowPw}
          valid={pwValid}
          encrypting={encrypting}
          progress={encProgress}
          onBack={() => setStep('verify')}
          onFinish={finish}
        />
      )}

      {step === 'done' && wallet && (
        <DoneStep
          wallet={wallet}
          onCopyAddress={() => copy(wallet.address, 'Address copied')}
          onDownloadKeystore={downloadKeystore}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}

/* ─── Sub-steps ────────────────────────────────────────────────── */

function StepRail({ step }: { step: Step }) {
  const order: Step[] = ['intro', 'phrase', 'verify', 'password', 'done'];
  const labels: Record<Step, string> = {
    intro: 'Acknowledge',
    phrase: 'Backup',
    verify: 'Verify',
    password: 'Encrypt',
    done: 'Done',
  };
  const idx = order.indexOf(step);
  return (
    <div className="flex items-center gap-1.5 mb-5 -mt-1">
      {order.map((s, i) => (
        <div key={s} className="flex-1 flex items-center gap-1.5">
          <div className={cn(
            'flex-1 h-1 rounded-full transition-colors',
            i <= idx ? 'bg-accent' : 'bg-surface-2'
          )} />
          <span className={cn(
            'text-[10px] uppercase tracking-wider font-semibold whitespace-nowrap',
            i === idx ? 'text-fg' : 'text-fg-subtle'
          )}>{labels[s]}</span>
        </div>
      ))}
    </div>
  );
}

function IntroStep({
  acks, setAcks, allAcked, onContinue,
}: {
  acks: boolean[]; setAcks: (a: boolean[]) => void; allAcked: boolean; onContinue: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex gap-3 p-3 rounded-lg border border-warning/30 bg-warning-soft">
        <ShieldAlert className="size-4 text-warning shrink-0 mt-0.5" />
        <div className="text-xs text-fg leading-relaxed">
          <p className="font-medium mb-1">Read this carefully before continuing.</p>
          <p className="text-fg-muted">
            BEX wallets are <span className="text-fg font-medium">custodial</span>.
            Your keys are generated in your browser, then an encrypted copy is
            uploaded to BEX so our support team can recover the wallet if you
            lose your recovery phrase. We hold the encrypted bundle — not the
            password to unlock it. Treat your 12 words accordingly.
          </p>
        </div>
      </div>

      <ul className="space-y-2.5">
        {ACKS.map((text, i) => (
          <li key={i}>
            <label className={cn(
              'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
              acks[i] ? 'border-accent bg-accent-soft/40' : 'border-border hover:border-border-strong'
            )}>
              <input
                type="checkbox"
                checked={acks[i]}
                onChange={(e) => setAcks(acks.map((v, j) => (j === i ? e.target.checked : v)))}
                className="sr-only"
              />
              <span className={cn(
                'mt-0.5 size-5 rounded-md border-2 grid place-items-center shrink-0 transition-colors',
                acks[i] ? 'bg-accent border-accent text-accent-fg' : 'border-border-strong'
              )}>
                {acks[i] && <CheckCircle2 className="size-3.5" />}
              </span>
              <span className="text-sm text-fg">{text}</span>
            </label>
          </li>
        ))}
      </ul>

      <div className="flex justify-end gap-2 pt-1">
        <Button disabled={!allAcked} onClick={onContinue} trailingIcon={<ChevronRight className="size-4" />}>
          I understand — generate my wallet
        </Button>
      </div>
    </div>
  );
}

function PhraseStep({
  wallet, onCopy, onDownload, onBack, onContinue,
}: {
  wallet: NewWallet; onCopy: () => void; onDownload: () => void; onBack: () => void; onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-3 p-3 rounded-lg border border-danger/30 bg-danger-soft text-xs">
        <AlertTriangle className="size-4 text-danger shrink-0 mt-0.5" />
        <div className="text-fg">
          <p className="font-medium mb-1">Write these 12 words down — in order.</p>
          <p className="text-fg-muted">
            Use pen and paper. Don't screenshot. Don't email them. Don't store them in cloud notes.
            Whoever holds these words owns the funds.
          </p>
        </div>
      </div>

      <MnemonicGrid phrase={wallet.mnemonic} />

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" leadingIcon={<Copy className="size-3.5" />} onClick={onCopy}>
          Copy to clipboard
        </Button>
        <Button variant="secondary" size="sm" leadingIcon={<Download className="size-3.5" />} onClick={onDownload}>
          Download as .txt
        </Button>
      </div>

      <div className="flex justify-between gap-2 pt-1">
        <Button variant="ghost" leadingIcon={<ChevronLeft className="size-4" />} onClick={onBack}>Back</Button>
        <Button onClick={onContinue} trailingIcon={<ChevronRight className="size-4" />}>
          I've backed it up
        </Button>
      </div>
    </div>
  );
}

function VerifyStep({
  indices, answers, setAnswers, ok, onBack, onContinue,
}: {
  indices: number[];
  answers: Record<number, string>;
  setAnswers: (a: Record<number, string>) => void;
  ok: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-fg-muted">
        Confirm your backup by entering the requested words from your recovery phrase.
      </p>
      <div className="grid sm:grid-cols-3 gap-3">
        {indices.map((idx) => (
          <Field key={idx} label={`Word #${idx + 1}`} required>
            <Input
              value={answers[idx] ?? ''}
              onChange={(e) => setAnswers({ ...answers, [idx]: e.target.value })}
              placeholder="…"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
            />
          </Field>
        ))}
      </div>
      {!ok && Object.values(answers).some(Boolean) && (
        <p className="text-xs text-fg-muted">Keep going — they must match exactly.</p>
      )}
      <div className="flex justify-between gap-2 pt-1">
        <Button variant="ghost" leadingIcon={<ChevronLeft className="size-4" />} onClick={onBack}>Back</Button>
        <Button disabled={!ok} onClick={onContinue} trailingIcon={<ChevronRight className="size-4" />}>
          Continue
        </Button>
      </div>
    </div>
  );
}

function PasswordStep({
  password, setPassword, cpassword, setCpassword, showPw, setShowPw,
  valid, encrypting, progress, onBack, onFinish,
}: {
  password: string; setPassword: (s: string) => void;
  cpassword: string; setCpassword: (s: string) => void;
  showPw: boolean; setShowPw: (b: boolean) => void;
  valid: boolean; encrypting: boolean; progress: number;
  onBack: () => void; onFinish: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex gap-3 p-3 rounded-lg border border-info/30 bg-info-soft text-xs">
        <Lock className="size-4 text-info shrink-0 mt-0.5" />
        <div className="text-fg">
          <p className="font-medium mb-1">Set a wallet password (this device only).</p>
          <p className="text-fg-muted">
            This password encrypts your private key on this device. It is NOT a recovery method —
            if you forget it, restore from your 12 words.
          </p>
        </div>
      </div>

      <Field label="Password" required hint="min. 8 characters">
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
      <Field label="Confirm password" required>
        <Input
          type={showPw ? 'text' : 'password'}
          value={cpassword}
          onChange={(e) => setCpassword(e.target.value)}
          leadingIcon={<KeyRound />}
        />
      </Field>

      {encrypting && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-fg-muted">
            <span>Encrypting with scrypt…</span>
            <span className="tabular">{progress}%</span>
          </div>
          <Progress value={progress} tone="accent" />
        </div>
      )}

      <div className="flex justify-between gap-2 pt-1">
        <Button variant="ghost" leadingIcon={<ChevronLeft className="size-4" />} onClick={onBack} disabled={encrypting}>Back</Button>
        <Button disabled={!valid} loading={encrypting} onClick={onFinish}>
          Create wallet
        </Button>
      </div>
    </div>
  );
}

function DoneStep({
  wallet, onCopyAddress, onDownloadKeystore, onClose,
}: {
  wallet: NewWallet; onCopyAddress: () => void; onDownloadKeystore: () => void; onClose: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-lg border border-success/30 bg-success-soft">
        <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-fg">Wallet ready</p>
          <p className="text-xs text-fg-muted">Your address is shown below. You can fund it from any exchange or external wallet.</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface-sunk p-4 space-y-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">Public address</div>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 font-mono text-xs text-fg break-all">{wallet.address}</code>
            <Button size="sm" variant="secondary" leadingIcon={<Copy className="size-3.5" />} onClick={onCopyAddress}>Copy</Button>
          </div>
          <div className="text-[11px] text-fg-subtle mt-1 font-mono">{shortAddress(wallet.address)}</div>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-accent" />
          <h4 className="text-sm font-semibold text-fg">Optional: download encrypted keystore</h4>
        </div>
        <p className="text-xs text-fg-muted">
          A scrypt-encrypted JSON file you can keep as a secondary backup.
          MetaMask and most desktop wallets can import this directly with your password.
        </p>
        <Button size="sm" variant="secondary" leadingIcon={<Download className="size-3.5" />} onClick={onDownloadKeystore}>
          Download keystore JSON
        </Button>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-fg mb-2 flex items-center gap-2">
          <KeyRound className="size-4 text-accent" />
          Import your wallet into a mobile app
        </h4>
        <MobileWalletGuide />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}
