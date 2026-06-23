'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, Globe, ArrowRight, Eye, EyeOff, CheckCircle2, Ticket, MailCheck } from 'lucide-react';
import { authAPI, parseApiError } from '@/lib/api';
import { COUNTRIES } from '@/lib/countries';
import { useToast } from '@/components/ToastProvider';
import { AuthShell } from '@/components/layout/AuthShell';
import { Button, Field, Input, Select, Badge } from '@/components/ui';
import { Turnstile, TURNSTILE_ENABLED } from '@/components/widgets/Turnstile';

function scorePassword(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageInner />
    </Suspense>
  );
}

function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast() || { toast: (() => {}) as any };

  const refParam = searchParams.get('ref') || searchParams.get('referrer') || searchParams.get('code') || '';
  const [form, setForm] = useState({ username: '', email: '', password: '', cpassword: '', country: '' });
  const [referralCode, setReferralCode] = useState(refParam);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resending, setResending] = useState(false);
  const [captcha, setCaptcha] = useState('');

  useEffect(() => { if (refParam) setReferralCode(refParam); }, [refParam]);

  const pwScore = useMemo(() => scorePassword(form.password), [form.password]);
  const pwMatches = form.password && form.password === form.cpassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralCode.trim()) { toast('A referral code is required to join', 'error'); return; }
    if (!pwMatches) { toast('Passwords do not match', 'error'); return; }
    if (TURNSTILE_ENABLED && !captcha) { toast('Please complete the Cloudflare check', 'error'); return; }
    setLoading(true);
    try {
      const res = await authAPI.register({ ...form, referrer: referralCode.trim(), cf_turnstile_token: captcha });
      // New accounts must verify their email before they can sign in.
      if (res.data?.email_verification_required) {
        setSubmitted(true);
        return;
      }
      // Backwards-compatible path (in case tokens are ever returned).
      const tokens = res.data?.tokens;
      if (tokens) {
        localStorage.setItem('access_token', tokens.access);
        localStorage.setItem('refresh_token', tokens.refresh);
        router.push('/dashboard');
      } else {
        setSubmitted(true);
      }
    } catch (err: any) {
      toast(parseApiError(err, 'Registration failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await authAPI.resendVerification(form.email);
      toast('Verification email sent');
    } catch (err: any) {
      toast(parseApiError(err, 'Could not resend'), 'error');
    } finally { setResending(false); }
  };

  if (submitted) {
    return (
      <AuthShell
        title="Verify your email"
        subtitle="One last step to activate your account."
        footer={<>Already verified? <Link href="/auth/login" className="text-fg font-medium hover:text-accent transition-colors">Sign in</Link></>}
      >
        <div className="text-center space-y-5 py-2">
          <div className="mx-auto grid place-items-center size-14 rounded-2xl bg-accent-soft text-accent">
            <MailCheck className="size-7" />
          </div>
          <div className="space-y-1.5">
            <p className="text-fg text-[15px]">
              We sent a verification link to <span className="font-semibold">{form.email}</span>.
            </p>
            <p className="text-fg-muted text-[13px]">
              Click the link in that email to activate your account. It can take a minute to arrive — check your spam folder too.
            </p>
          </div>
          <Button variant="secondary" className="w-full" loading={resending} onClick={resend}>
            Resend verification email
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your BEX account"
      subtitle="Join through your referral code. The first cycle settles in 7 days."
      footer={<>Already have one? <Link href="/auth/login" className="text-fg font-medium hover:text-accent transition-colors">Sign in</Link></>}
    >
      {refParam && (
        <div className="mb-5 flex items-center justify-between gap-2 p-3 rounded-lg border border-accent/30 bg-accent-soft text-xs">
          <span className="text-fg">Referred by <span className="font-mono font-medium">{refParam}</span></span>
          <Badge tone="accent">Verified invite</Badge>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Referral code" required hint={!referralCode.trim() ? 'Required — you can only join via an invite' : undefined}>
          <Input
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            required
            readOnly={!!refParam}
            placeholder="e.g. alex_48213"
            leadingIcon={<Ticket />}
          />
        </Field>
        <Field label="Display name" required>
          <Input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
            autoComplete="username"
            placeholder="satoshi"
            leadingIcon={<User />}
          />
        </Field>
        <Field label="Email" required>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            autoComplete="email"
            placeholder="you@example.com"
            leadingIcon={<Mail />}
          />
        </Field>
        <Field label="Country" required>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle [&>svg]:size-4 z-10">
              <Globe />
            </span>
            <Select className="pl-9" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required>
              <option value="">Select country</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Password" required hint={pwScore > 0 ? ['Weak', 'Fair', 'Good', 'Strong', 'Excellent'][pwScore] : undefined}>
            <Input
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
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
          <Field label="Confirm" required hint={pwMatches ? <span className="text-success inline-flex items-center gap-1"><CheckCircle2 className="size-3" /> match</span> : undefined}>
            <Input
              type={showPw ? 'text' : 'password'}
              value={form.cpassword}
              onChange={(e) => setForm({ ...form, cpassword: e.target.value })}
              required minLength={6}
              autoComplete="new-password"
              placeholder="••••••••"
              leadingIcon={<Lock />}
            />
          </Field>
        </div>
        {/* Strength meter */}
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < pwScore
                  ? pwScore < 2 ? 'bg-danger' : pwScore < 3 ? 'bg-warning' : 'bg-success'
                  : 'bg-surface-2'
              }`}
            />
          ))}
        </div>
        <p className="text-[11px] text-fg-subtle">By creating an account you agree to BEX Network's Terms and Privacy Policy.</p>
        {TURNSTILE_ENABLED && (
          <div className="flex justify-center">
            <Turnstile onVerify={setCaptcha} onExpire={() => setCaptcha('')} />
          </div>
        )}
        <Button type="submit" loading={loading} disabled={TURNSTILE_ENABLED && !captcha} className="w-full" size="lg" trailingIcon={!loading ? <ArrowRight className="size-4" /> : undefined}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  );
}
