'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { authAPI, parseApiError } from '@/lib/api';
import { AuthShell } from '@/components/layout/AuthShell';
import { Button } from '@/components/ui';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) { setStatus('error'); setMessage('This verification link is missing its token.'); return; }
    authAPI.verifyEmail(token)
      .then((res) => {
        const tokens = res.data?.tokens;
        if (tokens) {
          localStorage.setItem('access_token', tokens.access);
          localStorage.setItem('refresh_token', tokens.refresh);
          localStorage.setItem('is_admin', 'false');
        }
        setStatus('ok');
        setTimeout(() => router.push('/dashboard'), 1600);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(parseApiError(err, 'This verification link is invalid or has expired.'));
      });
  }, [token, router]);

  return (
    <AuthShell title="Email verification" subtitle="Activating your BEX Network account.">
      <div className="flex flex-col items-center text-center gap-4 py-4">
        {status === 'loading' && (
          <>
            <Loader2 className="size-10 text-accent animate-spin" />
            <p className="text-sm text-fg-muted">Verifying your email…</p>
          </>
        )}
        {status === 'ok' && (
          <>
            <div className="grid place-items-center size-14 rounded-2xl bg-accent-soft text-accent"><CheckCircle2 className="size-7" /></div>
            <p className="text-fg text-[15px] font-medium">Email verified! Taking you to your dashboard…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="grid place-items-center size-14 rounded-2xl bg-danger-soft text-danger"><XCircle className="size-7" /></div>
            <p className="text-fg-muted text-sm max-w-xs">{message}</p>
            <Link href="/auth/login" className="w-full">
              <Button variant="secondary" className="w-full">Back to sign in</Button>
            </Link>
          </>
        )}
      </div>
    </AuthShell>
  );
}
