'use client';

import { useEffect, useState } from 'react';
import { Wrench, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Shown while the backend's maintenance gate answers 503. "Check again"
 * probes a public endpoint — once it stops returning the maintenance
 * payload, we send the user back to the dashboard.
 */
export default function MaintenancePage() {
  const [checking, setChecking] = useState(false);

  const checkAgain = async () => {
    setChecking(true);
    try {
      const res = await fetch(`${API_BASE}/core/invest-plans/`, { cache: 'no-store' });
      if (res.status !== 503) {
        window.location.href = '/dashboard';
        return;
      }
    } catch { /* backend unreachable — stay here */ }
    setChecking(false);
  };

  // Re-probe automatically every 30s so the page clears itself.
  useEffect(() => {
    const id = window.setInterval(checkAgain, 30_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-fg flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto grid place-items-center size-14 rounded-2xl bg-accent-soft text-accent mb-6">
          <Wrench className="size-6" />
        </div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-accent font-semibold mb-3">
          Scheduled maintenance
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">We&apos;ll be right back.</h1>
        <p className="mt-4 text-base text-fg-muted leading-relaxed">
          BEX is undergoing scheduled maintenance. Your funds and cycles are
          safe — earnings continue to accrue while we work. This page will
          refresh automatically once we&apos;re back online.
        </p>
        <Button
          className="mt-8"
          variant="secondary"
          loading={checking}
          leadingIcon={<RefreshCcw className="size-4" />}
          onClick={checkAgain}
        >
          Check again
        </Button>
      </div>
    </div>
  );
}
