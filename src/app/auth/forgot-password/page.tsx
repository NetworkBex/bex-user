'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, MailCheck, ArrowRight } from 'lucide-react';
import { AuthShell } from '@/components/layout/AuthShell';
import { Button, Field, Input } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle={<>We sent password reset instructions to <span className="text-fg font-medium">{email}</span> if an account exists.</>}>
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <MailCheck className="size-10 text-accent" />
          <p className="text-sm text-fg-muted max-w-xs">The link expires in 30 minutes. Check spam if you don't see it within a couple of minutes.</p>
          <Link href="/auth/login" className="w-full">
            <Button variant="secondary" className="w-full">Back to sign in</Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email associated with your BEX account and we'll send you a reset link."
      footer={<><Link href="/auth/login" className="text-fg font-medium hover:text-accent transition-colors">← Back to sign in</Link></>}
    >
      <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-4">
        <Field label="Email" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            leadingIcon={<Mail />}
            autoFocus
          />
        </Field>
        <Button type="submit" className="w-full" size="lg" trailingIcon={<ArrowRight className="size-4" />}>
          Send reset link
        </Button>
      </form>
    </AuthShell>
  );
}
