'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
import { authAPI, parseApiError } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { AuthShell } from '@/components/layout/AuthShell';
import { Button, Field, Input } from '@/components/ui';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const { toast } = useToast() || { toast: (() => {}) as any };

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { toast('This reset link is missing its token', 'error'); return; }
    if (password.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
    if (password !== confirm) { toast('Passwords do not match', 'error'); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push('/auth/login'), 1800);
    } catch (err: any) {
      toast(parseApiError(err, 'Could not reset password'), 'error');
    } finally { setLoading(false); }
  };

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You can now sign in with your new password.">
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="grid place-items-center size-14 rounded-2xl bg-accent-soft text-accent"><CheckCircle2 className="size-7" /></div>
          <p className="text-fg-muted text-sm">Redirecting you to sign in…</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Set a strong password for your BEX Network account."
      footer={<><Link href="/auth/login" className="text-fg font-medium hover:text-accent transition-colors">← Back to sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="New password" required>
          <Input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required minLength={6}
            autoComplete="new-password"
            placeholder="••••••••"
            leadingIcon={<Lock />}
            trailingIcon={
              <button type="button" onClick={() => setShowPw((s) => !s)} className="pointer-events-auto hover:text-fg-muted" aria-label="Toggle password visibility">
                {showPw ? <EyeOff /> : <Eye />}
              </button>
            }
          />
        </Field>
        <Field label="Confirm new password" required>
          <Input
            type={showPw ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required minLength={6}
            autoComplete="new-password"
            placeholder="••••••••"
            leadingIcon={<Lock />}
          />
        </Field>
        <Button type="submit" loading={loading} className="w-full" size="lg" trailingIcon={!loading ? <ArrowRight className="size-4" /> : undefined}>
          {loading ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </AuthShell>
  );
}
