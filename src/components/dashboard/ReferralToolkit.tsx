'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Share2, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ToastProvider';

const SHARE_MSG = 'Join me on BEX Network — AI-powered trading with daily returns.';

/** Referral sharing kit: QR code + copy + WhatsApp / Telegram / native share. */
export function ReferralToolkit({ link }: { link: string }) {
  const { toast } = useToast() || { toast: (() => {}) as any };
  const [copied, setCopied] = useState(false);

  const disabled = !link;
  const fullMsg = `${SHARE_MSG} ${link}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(fullMsg)}`;
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(SHARE_MSG)}`;

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast('Referral link copied');
    setTimeout(() => setCopied(false), 1500);
  };

  const nativeShare = async () => {
    if (navigator.share && link) {
      try { await navigator.share({ title: 'Join BEX Network', text: SHARE_MSG, url: link }); } catch { /* cancelled */ }
    } else {
      copy();
    }
  };

  const downloadQr = () => {
    const svg = document.getElementById('bex-referral-qr');
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bex-referral-qr.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid sm:grid-cols-[auto_1fr] gap-5 items-start">
      {/* QR */}
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-xl border border-border bg-white p-2.5">
          {link ? (
            <QRCodeSVG id="bex-referral-qr" value={link} size={128} level="M" marginSize={1} />
          ) : (
            <div className="size-32 grid place-items-center text-[11px] text-fg-subtle">No link yet</div>
          )}
        </div>
        <button
          onClick={downloadQr}
          disabled={disabled}
          className="text-[11px] text-fg-muted hover:text-fg inline-flex items-center gap-1 disabled:opacity-50"
        >
          <Download className="size-3" /> Save QR
        </button>
      </div>

      {/* Link + share actions */}
      <div className="min-w-0 space-y-3">
        <Input readOnly value={link} className="font-mono text-[12.5px]" onFocus={(e) => e.currentTarget.select()} />
        <div className="flex flex-wrap gap-2">
          <Button onClick={copy} disabled={disabled} leadingIcon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}>
            {copied ? 'Copied' : 'Copy link'}
          </Button>
          <a href={disabled ? undefined : waUrl} target="_blank" rel="noreferrer" className={disabled ? 'pointer-events-none' : ''}>
            <Button variant="secondary" disabled={disabled} leadingIcon={<WhatsAppIcon />}>WhatsApp</Button>
          </a>
          <a href={disabled ? undefined : tgUrl} target="_blank" rel="noreferrer" className={disabled ? 'pointer-events-none' : ''}>
            <Button variant="secondary" disabled={disabled} leadingIcon={<TelegramIcon />}>Telegram</Button>
          </a>
          <Button variant="ghost" onClick={nativeShare} disabled={disabled} leadingIcon={<Share2 className="size-4" />}>
            More
          </Button>
        </div>
        <p className="text-[11px] text-fg-subtle">Invitees who sign up with your link or QR are credited to your team.</p>
      </div>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35zM12.01 2.4c-5.3 0-9.6 4.3-9.6 9.6 0 1.7.45 3.34 1.3 4.8L2.4 21.6l4.93-1.29a9.56 9.56 0 0 0 4.68 1.2h.01c5.3 0 9.6-4.3 9.6-9.6s-4.31-9.51-9.61-9.51z"/>
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M21.94 4.27c-.2-.17-.5-.21-.94-.04L2.7 11.4c-.5.2-.49.48-.08.6l4.93 1.54 1.9 5.92c.13.36.23.49.47.49.24 0 .35-.11.48-.27l2.36-2.3 4.9 3.62c.45.25.78.12.9-.42l3.22-15.2c.16-.74-.06-1.07-.34-1.21z"/>
    </svg>
  );
}
