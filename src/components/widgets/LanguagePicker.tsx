'use client';

import { useEffect, useRef, useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/ui';

// Major world languages. Codes are Google Translate language codes.
export const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en',    label: 'English' },
  { code: 'es',    label: 'Español' },
  { code: 'fr',    label: 'Français' },
  { code: 'de',    label: 'Deutsch' },
  { code: 'pt',    label: 'Português' },
  { code: 'it',    label: 'Italiano' },
  { code: 'ru',    label: 'Русский' },
  { code: 'zh-CN', label: '中文 (简体)' },
  { code: 'zh-TW', label: '中文 (繁體)' },
  { code: 'ja',    label: '日本語' },
  { code: 'ko',    label: '한국어' },
  { code: 'ar',    label: 'العربية' },
  { code: 'hi',    label: 'हिन्दी' },
  { code: 'bn',    label: 'বাংলা' },
  { code: 'ur',    label: 'اردو' },
  { code: 'tr',    label: 'Türkçe' },
  { code: 'nl',    label: 'Nederlands' },
  { code: 'pl',    label: 'Polski' },
  { code: 'id',    label: 'Bahasa Indonesia' },
  { code: 'ms',    label: 'Bahasa Melayu' },
  { code: 'vi',    label: 'Tiếng Việt' },
  { code: 'th',    label: 'ไทย' },
  { code: 'fa',    label: 'فارسی' },
  { code: 'uk',    label: 'Українська' },
  { code: 'fil',   label: 'Filipino' },
  { code: 'sw',    label: 'Kiswahili' },
];

function currentLang(): string {
  if (typeof document === 'undefined') return 'en';
  const m = document.cookie.match(/googtrans=\/[^/]*\/([^;]+)/);
  return m ? decodeURIComponent(m[1]) : 'en';
}

function applyLang(code: string) {
  const val = `/en/${code}`;
  const host = location.hostname;
  const expire = 'Thu, 01 Jan 1970 00:00:00 GMT';
  // Clear any previous value across scopes, then set the new one so the
  // Google Translate runtime picks it up on the next load.
  const scopes = ['', `;domain=${host}`];
  const parts = host.split('.');
  if (parts.length >= 2) scopes.push(`;domain=.${parts.slice(-2).join('.')}`);
  for (const s of scopes) {
    document.cookie = `googtrans=;expires=${expire};path=/${s}`;
    document.cookie = `googtrans=${val};path=/${s}`;
  }
  location.reload();
}

export function LanguagePicker({ className, align = 'right', compact = false }: {
  className?: string;
  align?: 'left' | 'right';
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState('en');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setLang(currentLang()); }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <div ref={ref} className={cn('relative notranslate', className)} translate="no">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Change language"
        className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md border border-border bg-surface text-fg-muted hover:text-fg hover:border-border-strong transition-colors text-[13px]"
      >
        <Globe className="size-4 shrink-0" />
        {!compact && <span className="hidden sm:inline max-w-[7rem] truncate">{current.label}</span>}
        <span className={cn('font-medium uppercase', compact ? '' : 'sm:hidden')}>{current.code.split('-')[0]}</span>
        <ChevronDown className="size-3.5 shrink-0" />
      </button>

      {open && (
        <ul
          className={cn(
            'absolute z-[1000] mt-1.5 w-52 max-h-80 overflow-auto rounded-lg border border-border bg-surface shadow-[var(--shadow-pop)] p-1',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                onClick={() => applyLang(l.code)}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-[13px] transition-colors',
                  l.code === lang ? 'bg-accent-soft text-fg' : 'text-fg hover:bg-surface-sunk',
                )}
              >
                <span className="flex-1 truncate">{l.label}</span>
                {l.code === lang && <Check className="size-3.5 text-accent shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
