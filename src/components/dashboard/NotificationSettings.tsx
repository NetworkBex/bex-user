'use client';

import { useEffect, useState } from 'react';
import { Bell, Send, Mail, CheckCircle2, ShieldCheck } from 'lucide-react';
import { notificationsAPI, parseApiError } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { Card, CardBody, CardHeader, CardDivider } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface Prefs {
  email_enabled: boolean;
  telegram_enabled: boolean;
  notify_transactions: boolean;
  notify_commissions: boolean;
  notify_security: boolean;
  notify_marketing: boolean;
  telegram_chat_id: string;
  telegram_bot_token: string;
  telegram_ready?: boolean;
}

const DEFAULTS: Prefs = {
  email_enabled: true, telegram_enabled: false,
  notify_transactions: true, notify_commissions: true, notify_security: true, notify_marketing: false,
  telegram_chat_id: '', telegram_bot_token: '',
};

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-3 py-2.5 text-left group">
      <span className="min-w-0">
        <span className="block text-[13.5px] font-medium text-fg">{label}</span>
        {hint && <span className="block text-[12px] text-fg-muted mt-0.5">{hint}</span>}
      </span>
      <span className={`relative shrink-0 h-6 w-11 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-surface-2 border border-border'}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast() || { toast: (() => {}) as any };

  useEffect(() => {
    notificationsAPI.getPreferences()
      .then((r) => setPrefs({ ...DEFAULTS, ...r.data }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => setPrefs((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const r = await notificationsAPI.updatePreferences(prefs);
      setPrefs({ ...DEFAULTS, ...r.data });
      toast('Notification preferences saved');
    } catch (err: any) { toast(parseApiError(err, 'Save failed'), 'error'); }
    finally { setSaving(false); }
  };

  const testTelegram = async () => {
    setTesting(true);
    try {
      await notificationsAPI.testTelegram({ telegram_chat_id: prefs.telegram_chat_id, telegram_bot_token: prefs.telegram_bot_token });
      toast('Test message sent — check Telegram');
    } catch (err: any) { toast(parseApiError(err, 'Could not send test'), 'error'); }
    finally { setTesting(false); }
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader title="Notifications" icon={<Bell className="size-4" />} description="Choose how BEX keeps you informed." />
      <CardDivider />
      <CardBody>
        {loading ? <div className="skeleton h-40" /> : (
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-2">
            {/* Channels */}
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-fg-subtle mb-1">Channels</div>
              <Toggle label="Email notifications" hint="Sent to your account email" checked={prefs.email_enabled} onChange={(v) => set('email_enabled', v)} />
              <Toggle label="Telegram notifications" hint="Via your own bot" checked={prefs.telegram_enabled} onChange={(v) => set('telegram_enabled', v)} />
            </div>

            {/* Categories */}
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-fg-subtle mb-1">What to notify me about</div>
              <Toggle label="Transactions" hint="Deposits, withdrawals, investments" checked={prefs.notify_transactions} onChange={(v) => set('notify_transactions', v)} />
              <Toggle label="Commissions" hint="Referral earnings" checked={prefs.notify_commissions} onChange={(v) => set('notify_commissions', v)} />
              <Toggle label="Security" hint="Logins, password & profile changes" checked={prefs.notify_security} onChange={(v) => set('notify_security', v)} />
              <Toggle label="Announcements" hint="Webinars, promotions" checked={prefs.notify_marketing} onChange={(v) => set('notify_marketing', v)} />
            </div>

            {/* Telegram credentials */}
            {prefs.telegram_enabled && (
              <div className="md:col-span-2 mt-2 pt-4 border-t border-hairline">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[13.5px] font-semibold text-fg inline-flex items-center gap-2"><Send className="size-4 text-accent" /> Telegram bot</div>
                  {prefs.telegram_ready
                    ? <Badge tone="success"><CheckCircle2 className="size-3" /> Connected</Badge>
                    : <Badge tone="neutral">Not connected</Badge>}
                </div>
                <p className="text-[12px] text-fg-muted mb-3">
                  Create a bot with <span className="font-mono">@BotFather</span>, then message it once and open
                  <span className="font-mono"> @userinfobot</span> to get your chat ID. Paste both below.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Chat ID"><Input value={prefs.telegram_chat_id} onChange={(e) => set('telegram_chat_id', e.target.value)} placeholder="123456789" /></Field>
                  <Field label="Bot token"><Input value={prefs.telegram_bot_token} onChange={(e) => set('telegram_bot_token', e.target.value)} placeholder="123456:ABC-DEF…" className="font-mono text-xs" /></Field>
                </div>
                <Button variant="secondary" size="sm" className="mt-3" loading={testing} onClick={testTelegram}
                  disabled={!prefs.telegram_chat_id || !prefs.telegram_bot_token} leadingIcon={<Send className="size-3.5" />}>
                  Send test message
                </Button>
              </div>
            )}

            <div className="md:col-span-2 mt-3 flex items-center justify-between gap-3 pt-4 border-t border-hairline">
              <p className="text-[11.5px] text-fg-subtle inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-accent" /> Security alerts are always sent regardless of category settings.
              </p>
              <Button loading={saving} onClick={save} leadingIcon={<Mail className="size-3.5" />}>Save preferences</Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
