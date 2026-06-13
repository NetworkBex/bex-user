export function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(' ');
}

export function formatMoney(value: number | string | null | undefined, opts: { decimals?: number; sign?: boolean } = {}) {
  const n = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  const v = Number.isFinite(n) ? n : 0;
  const decimals = opts.decimals ?? (Math.abs(v) >= 1000 ? 0 : 2);
  const fmt = v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const prefix = opts.sign && v > 0 ? '+' : '';
  return `${prefix}$${fmt}`;
}

export function formatCompact(value: number | string | null | undefined) {
  const n = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 1 });
}

export function shortDate(s?: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s.slice(0, 10);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function relativeTime(s?: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s.slice(0, 10);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.round(diff / 86400)}d ago`;
  return shortDate(s);
}

export function initials(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || name[0]?.toUpperCase() || '?';
}

/**
 * Format a date range in the canonical "Aug 14, 2026 – Aug 18, 2026" style.
 * If `end` is missing, returns just the start date.
 */
export function formatDateRange(start?: string | null, end?: string | null): string {
  const fmt = (s: string) => {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };
  if (!start) return '—';
  if (!end || start === end) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

/** Whole-day difference between two ISO date strings (or Date objects). */
export function daysBetween(a?: string | Date | null, b?: string | Date | null): number {
  if (!a || !b) return 0;
  const da = typeof a === 'string' ? new Date(a) : a;
  const db = typeof b === 'string' ? new Date(b) : b;
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return 0;
  return Math.max(0, Math.round((db.getTime() - da.getTime()) / 86_400_000));
}
