'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { authAPI, parseApiError } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { AuthShell } from '@/components/layout/AuthShell';
import { Button, Field, Input } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast() || { toast: (() => {}) as any };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      const { tokens, is_admin } = res.data;
      localStorage.setItem('access_token', tokens.access);
      localStorage.setItem('refresh_token', tokens.refresh);
      localStorage.setItem('is_admin', is_admin ? 'true' : 'false');
      toast('Welcome back');
      router.push(is_admin ? '/admin' : '/dashboard');
    } catch (err: any) {
      toast(parseApiError(err, 'Login failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Sign in to BEX"
      subtitle="Continue to your verification-first execution dashboard."
      footer={<>Don't have an account? <Link href="/auth/register" className="text-fg font-medium hover:text-accent transition-colors">Create one</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email" required>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            leadingIcon={<Mail />}
          />
        </Field>
        <Field
          label="Password"
          required
          hint={<Link href="/auth/forgot-password" className="hover:text-fg-muted transition-colors">Forgot?</Link>}
        >
          <Input
            type={showPw ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            leadingIcon={<Lock />}
            trailingIcon={
              <button type="button" onClick={() => setShowPw((s) => !s)} className="pointer-events-auto hover:text-fg-muted" aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? <EyeOff /> : <Eye />}
              </button>
            }
          />
        </Field>
        <Button type="submit" loading={loading} className="w-full" size="lg" trailingIcon={!loading ? <ArrowRight className="size-4" /> : undefined}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  );
}
