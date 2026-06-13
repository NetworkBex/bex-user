'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, Clock, Copy, ExternalLink, Loader2,
  RefreshCw, ShieldAlert, XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader, CardDivider } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Progress';
import { useToast } from '@/components/ToastProvider';
import { paymentAPI } from '@/lib/api';
import { formatMoney, relativeTime } from '@/lib/ui';

type Payment = {
  id: number;
  order_id: string;
  invoice_id?: string;
  invoice_url?: string;
  payment_id?: string;
  payment_status: string;
  pay_address?: string;
  pay_currency?: string;
  pay_amount?: string | number;
  actually_paid?: string | number;
  amount: string | number;
  currency: string;
  credited_at?: string | null;
  credited_amount?: string | number;
  created_at: string;
  updated_at: string;
};

const TERMINAL = new Set(['finished', 'failed', 'refunded', 'expired', 'partially_paid']);

const statusTone: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  waiting: 'warning',
  confirming: 'info',
  confirmed: 'info',
  sending: 'info',
  partially_paid: 'warning',
  finished: 'success',
  failed: 'danger',
  refunded: 'neutral',
  expired: 'danger',
};

const statusLabel: Record<string, string> = {
  waiting: 'Waiting for payment',
  confirming: 'Confirming on chain',
  confirmed: 'Confirmed — settling',
  sending: 'Sending to BEX',
  partially_paid: 'Partially paid',
  finished: 'Completed',
  failed: 'Failed',
  refunded: 'Refunded',
  expired: 'Expired',
};

export default function PaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast() || { toast: (() => {}) as any };
  const [p, setP] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const flash = searchParams.get('status'); // success | cancel from NOWPayments

  const load = async (mode: 'fetch' | 'sync' = 'fetch') => {
    try {
      const res = mode === 'sync' ? await paymentAPI.sync(params.id) : await paymentAPI.get(params.id);
      setP(res.data as Payment);
    } catch (err: any) {
      // 404 shouldn't keep polling
      if (err?.response?.status === 404) {
        toast('Payment not found', 'error');
        clearPoll();
      }
    } finally { setLoading(false); }
  };

  const clearPoll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  // First load — always pull from NOWPayments so users coming back from the
  // hosted checkout see the freshest status.
  useEffect(() => { load('sync'); /* eslint-disable-next-line */ }, [params.id]);

  // Poll every 6 s until terminal — caps at ~5 minutes of polling so we
  // don't hammer the API for a stuck-pending payment.
  useEffect(() => {
    if (!p) return;
    if (TERMINAL.has(p.payment_status)) { clearPoll(); return; }
    if (pollRef.current) return;
    let ticks = 0;
    pollRef.current = setInterval(() => {
      ticks += 1;
      load('sync');
      if (ticks >= 50) clearPoll(); // ~5 min
    }, 6000);
    return clearPoll;
  }, [p?.payment_status]); // eslint-disable-line react-hooks/exhaustive-deps

  const manualSync = async () => {
    setSyncing(true);
    try { await load('sync'); toast('Status refreshed'); }
    finally { setSyncing(false); }
  };

  return (
    <>
      <PageHeader
        title="Payment status"
        description="Track the lifecycle of your NOWPayments deposit."
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Transactions', href: '/dashboard/transactions' },
          { label: 'Payment' },
        ]}
        actions={
          <Button variant="secondary" leadingIcon={<RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />} onClick={manualSync}>
            Refresh
          </Button>
        }
      />

      {flash === 'cancel' && !TERMINAL.has(p?.payment_status ?? '') && (
        <Card variant="sunk" className="mb-6">
          <CardBody className="p-4 flex gap-3 text-[14px]">
            <ShieldAlert className="size-4 text-warning mt-0.5 shrink-0" />
            <span>
              <span className="text-fg font-medium">Checkout was cancelled.</span> This payment may still complete if you sent funds — we'll update as the network confirms.
            </span>
          </CardBody>
        </Card>
      )}

      {loading || !p ? (
        <PageSpinner label="Loading payment…" className="min-h-[420px]" />
      ) : (
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
          {/* Primary card */}
          <Card>
            <CardBody className="p-6">
              <StatusBlock status={p.payment_status} credited={!!p.credited_at} />

              <div className="mt-5 grid grid-cols-2 gap-4">
                <Stat label="Amount priced"      value={`${formatMoney(p.amount)} ${p.currency.toUpperCase()}`} />
                <Stat label="Amount credited"    value={p.credited_amount ? formatMoney(p.credited_amount) : '—'} success={!!p.credited_at} />
                <Stat label="Pay currency"       value={p.pay_currency?.toUpperCase() ?? '—'} />
                <Stat label="Pay amount"         value={p.pay_amount ? `${p.pay_amount} ${p.pay_currency?.toUpperCase() ?? ''}` : '—'} />
                {!!Number(p.actually_paid) && (
                  <Stat label="Actually paid"    value={`${p.actually_paid} ${p.pay_currency?.toUpperCase() ?? ''}`} />
                )}
              </div>

              {p.pay_address && (
                <div className="mt-5 rounded-lg border border-border bg-surface-sunk p-3">
                  <div className="text-[12px] uppercase tracking-wider text-fg-muted font-semibold mb-1">
                    Pay to address ({p.pay_currency?.toUpperCase() ?? 'crypto'})
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-xs text-fg break-all">{p.pay_address}</code>
                    <Button
                      size="sm" variant="secondary" leadingIcon={<Copy className="size-3.5" />}
                      onClick={() => { navigator.clipboard.writeText(p.pay_address!); toast('Address copied'); }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}

              {p.invoice_url && p.payment_status === 'waiting' && (
                <a href={p.invoice_url} className="mt-4 inline-block">
                  <Button variant="secondary" leadingIcon={<ExternalLink className="size-4" />}>
                    Re-open checkout
                  </Button>
                </a>
              )}
            </CardBody>
          </Card>

          {/* Sidebar — meta */}
          <div className="space-y-4">
            <Card>
              <CardHeader title="Payment record" />
              <CardDivider />
              <CardBody className="text-[14px] space-y-2.5">
                <MetaRow label="Order ID"   value={p.order_id} mono />
                {p.invoice_id && <MetaRow label="Invoice ID" value={p.invoice_id} mono />}
                {p.payment_id && <MetaRow label="Payment ID" value={p.payment_id} mono />}
                <MetaRow label="Created"    value={relativeTime(p.created_at)} />
                <MetaRow label="Updated"    value={relativeTime(p.updated_at)} />
                {p.credited_at && <MetaRow label="Credited"   value={relativeTime(p.credited_at)} />}
              </CardBody>
            </Card>

            <Card variant="sunk">
              <CardBody className="p-4 flex gap-3 text-[13px] text-fg-muted">
                <Clock className="size-4 text-accent shrink-0 mt-0.5" />
                <span>
                  <span className="text-fg font-medium">Auto-refresh active.</span> This page checks NOWPayments every few seconds until your payment reaches a final state.
                </span>
              </CardBody>
            </Card>

            <Link href="/dashboard/transactions" className="inline-block">
              <Button variant="ghost" leadingIcon={<ArrowLeft className="size-4" />}>Back to transactions</Button>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

function StatusBlock({ status, credited }: { status: string; credited: boolean }) {
  const tone = statusTone[status] ?? 'neutral';
  const label = statusLabel[status] ?? status;
  const showSpinner = !TERMINAL.has(status);

  return (
    <div className="flex items-center gap-4">
      <span className={`grid place-items-center size-14 rounded-full bg-${tone === 'success' ? 'success' : tone === 'danger' ? 'danger' : 'accent'}-soft`}>
        {status === 'finished'  ? <CheckCircle2 className="size-7 text-success" /> :
         status === 'failed'    ? <XCircle      className="size-7 text-danger" /> :
         status === 'expired'   ? <XCircle      className="size-7 text-danger" /> :
         status === 'refunded'  ? <XCircle      className="size-7 text-fg-muted" /> :
         showSpinner            ? <Loader2      className="size-7 text-accent animate-spin" /> :
                                  <CheckCircle2 className="size-7 text-success" />}
      </span>
      <div>
        <div className="text-[22px] font-semibold text-fg leading-tight">{label}</div>
        <div className="mt-1 flex items-center gap-2">
          <Badge tone={tone}>{status}</Badge>
          {credited && <Badge tone="success">Balance credited</Badge>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, success }: { label: string; value: string; success?: boolean }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface-sunk/40 p-3">
      <div className="text-[12px] uppercase tracking-wider text-fg-muted font-semibold">{label}</div>
      <div className={`mt-1 text-[16px] tabular font-semibold ${success ? 'text-success' : 'text-fg'}`}>{value}</div>
    </div>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-fg-muted">{label}</span>
      <span className={`text-fg text-right ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</span>
    </div>
  );
}
