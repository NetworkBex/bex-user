/**
 * Client-side PDF invoices for the unified transactions ledger.
 *
 * Every ledger row — money movements (deposits, withdrawals, investments,
 * cashouts, commissions) and auto-credited earnings — can be exported as a
 * single A4 invoice, and the whole filtered view as a statement. Generated
 * entirely in the browser with jsPDF; no backend round-trip.
 *
 * Visual language mirrors the app theme: the emerald brand accent
 * (--accent: oklch(64% 0.18 165) ≈ #00AC70) on a clean white sheet.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export type InvoiceCustomer = {
  name: string;
  email: string;
};

/** Mirrors the merged Txn shape on the transactions page. */
export type InvoiceRow = {
  id: number | string;
  transaction_id?: number | string;
  type: string;
  status?: number;
  amount: number | string;
  date_created: string;
  name?: string;
  method?: string;
  customer_address?: string;
  trans_id?: string;
  code?: string;
  currency_name?: string;
  direction?: 'credit' | 'debit' | 'neutral';
  _source?: 'txn' | 'earning';
};

const TYPE_LABEL: Record<string, string> = {
  deposit:    'Deposit',
  withdraw:   'Withdrawal',
  invest:     'Investment',
  cashout:    'Cashout',
  nft:        'NFT Purchase',
  commission: 'Commission',
  adjustment: 'Adjustment',
  earning:    'Earning credit',
};

const STATUS_LABEL: Record<number, string> = {
  0: 'Pending',
  1: 'Cancelled',
  2: 'Processing',
  3: 'Completed',
  4: 'Failed',
};

type RGB = [number, number, number];

/** Brand palette — accent matches --accent in globals.css. */
const C = {
  accent:     [0, 172, 112] as RGB,   // oklch(64% 0.18 165)
  accentDark: [0, 138, 90] as RGB,    // pressed/strong variant
  mint:       [228, 248, 239] as RGB, // accent-soft
  mintLine:   [196, 235, 218] as RGB,
  ink:        [16, 24, 32] as RGB,
  muted:      [110, 122, 134] as RGB,
  subtle:     [148, 158, 168] as RGB,
  hairline:   [228, 233, 238] as RGB,
  paper:      [255, 255, 255] as RGB,
  panel:      [246, 249, 248] as RGB,
};

/** Status chip colours (text on a white chip). */
const STATUS_COLOR: Record<string, RGB> = {
  'Completed':     C.accentDark,
  'Auto-credited': C.accentDark,
  'Pending':       [176, 124, 16],
  'Processing':    [30, 96, 200],
  'Cancelled':     [110, 122, 134],
  'Failed':        [196, 58, 58],
  '—':             [110, 122, 134],
};

const BRAND = {
  name: 'BEX Network',
  email: 'support@bexnetwork.io',
};

/** Raw backend method codes → customer-facing labels. */
const METHOD_LABEL: Record<string, string> = {
  acc_balance: 'Account balance',
  bex_wallet:  'BEX wallet',
  wallet:      'Crypto wallet',
  nowpayments: 'NOWPayments checkout',
  bank:        'Bank transfer',
  admin:       'Admin adjustment',
};

/** Structural fallbacks when a row predates method tracking — these
 *  types can only ever settle one way, so the label is still correct. */
const METHOD_BY_TYPE: Record<string, string> = {
  invest:     'Account balance',
  cashout:    'Account balance',
  nft:        'Account balance',
  earning:    'Auto-credit (earnings engine)',
  commission: 'Referral program',
  adjustment: 'Admin adjustment',
};

/** Resolve the settlement method for any ledger row. */
export function methodLabel(row: Pick<InvoiceRow, 'type' | 'method' | '_source'>): string {
  if (row._source === 'earning') return METHOD_BY_TYPE.earning;
  if (row.method) return METHOD_LABEL[row.method] ?? row.method;
  return METHOD_BY_TYPE[row.type] ?? '—';
}

const REF_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** 32-char alphanumeric reference. Seeded from the row identity so the
 *  same transaction always produces the same reference across downloads. */
export function referenceCode(row: InvoiceRow): string {
  const seed = `${row._source ?? 'txn'}:${row.id}:${row.transaction_id ?? ''}:${row.date_created}`;
  // FNV-1a hash of the seed, then xorshift32 to stream out characters.
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let x = h || 0x9e3779b9;
  let out = '';
  for (let i = 0; i < 32; i++) {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;  x >>>= 0;
    out += REF_CHARS[x % REF_CHARS.length];
  }
  return out;
}

/** Deterministic invoice number — re-downloading yields the same id.
 *  Earnings credits use the CR series, money movements the TNX series. */
export function invoiceNumber(row: InvoiceRow): string {
  if (row._source === 'earning') {
    const raw = String(row.id).replace(/^e-/, '');
    return `BEX-CR-${raw.padStart(6, '0')}`;
  }
  const raw = String(row.transaction_id ?? row.id);
  return `BEX-TNX-${raw.padStart(6, '0')}`;
}

function statusLabel(row: InvoiceRow): string {
  if (row._source === 'earning') return 'Auto-credited';
  return row.status != null ? (STATUS_LABEL[row.status] ?? 'Unknown') : '—';
}

function signedAmount(row: InvoiceRow): string {
  const v = parseFloat(String(row.amount)) || 0;
  const sign = row.direction === 'credit' ? '+' : row.direction === 'debit' ? '-' : '';
  return `${sign}$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(s: string): string {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const money = (v: number) =>
  `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ───────────────────────── drawing primitives ───────────────────────── */

/** Letter-spaced text anchored on its RIGHT edge. jsPDF's own
 *  `align: 'right'` ignores charSpace, so measure manually. */
function trackedRight(doc: jsPDF, text: string, right: number, y: number, charSpace: number) {
  const w = doc.getTextWidth(text) + charSpace * Math.max(0, text.length - 1);
  doc.text(text, right - w, y, { charSpace });
}

/** Tiny uppercase tracking label — the section eyebrow used everywhere. */
function eyebrow(doc: jsPDF, text: string, x: number, y: number, color: RGB = C.accentDark, align: 'left' | 'right' = 'left') {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...color);
  if (align === 'right') trackedRight(doc, text.toUpperCase(), x, y, 0.9);
  else doc.text(text.toUpperCase(), x, y, { charSpace: 0.9 });
}

/** Rounded pill chip; returns its width. `right` anchors the right edge. */
function chip(doc: jsPDF, label: string, right: number, y: number, fg: RGB, bg: RGB): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  const w = doc.getTextWidth(label) + 8;
  doc.setFillColor(...bg);
  doc.roundedRect(right - w, y, w, 7, 3.5, 3.5, 'F');
  doc.setTextColor(...fg);
  doc.text(label, right - w / 2, y + 4.7, { align: 'center' });
  return w;
}

/** Emerald masthead with logo mark, wordmark and document title. */
function drawMasthead(doc: jsPDF, title: string, subtitle: string, height: number) {
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, 210, height, 'F');
  doc.setFillColor(...C.accentDark);
  doc.rect(0, height, 210, 1.4, 'F');

  // Soft decorative discs in the band (low-opacity white).
  try {
    const g = (doc as any).GState ? new (doc as any).GState({ opacity: 0.10 }) : null;
    if (g) {
      doc.saveGraphicsState();
      doc.setGState(g);
      doc.setFillColor(255, 255, 255);
      doc.circle(168, 2, 24, 'F');
      doc.circle(199, height - 4, 16, 'F');
      doc.circle(135, height + 2, 10, 'F');
      doc.restoreGraphicsState();
    }
  } catch { /* decorative only — never block the download */ }

  // Logo mark: white rounded tile with the accent "B".
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(16, 12, 11.5, 11.5, 2.8, 2.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...C.accentDark);
  doc.text('B', 21.75, 19.9, { align: 'center' });

  doc.setFontSize(19);
  doc.setTextColor(255, 255, 255);
  doc.text('BEX', 31.5, 19.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.mint);
  doc.text(`${BRAND.name} · ${BRAND.email}`, 31.5, 24.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.mint);
  trackedRight(doc, title.toUpperCase(), 194, 15.5, 1.4);
  doc.setFontSize(13.5);
  doc.setTextColor(255, 255, 255);
  doc.text(subtitle, 194, 22.5, { align: 'right' });
}

function drawBilledTo(doc: jsPDF, customer: InvoiceCustomer, x: number, y: number) {
  eyebrow(doc, 'Billed to', x, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.ink);
  doc.text(customer.name || 'BEX customer', x, y + 6.5);
  if (customer.email) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.muted);
    doc.text(customer.email, x, y + 11.5);
  }
}

function drawFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.hairline);
    doc.setLineWidth(0.3);
    doc.line(16, 285, 194, 285);
    doc.setFillColor(...C.accent);
    doc.roundedRect(16, 287.6, 2.4, 2.4, 0.6, 0.6, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.subtle);
    doc.text(
      'Generated client-side from your BEX account ledger — not a tax document.',
      21, 289.6,
    );
    doc.text(pages > 1 ? `Page ${i} of ${pages}` : BRAND.name, 194, 289.6, { align: 'right' });
  }
}

/* ───────────────────────────── invoice ──────────────────────────────── */

/** Single-transaction A4 invoice → downloads `<invoice-number>.pdf`. */
export function generateInvoicePdf(row: InvoiceRow, customer: InvoiceCustomer): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const number = invoiceNumber(row);
  const status = statusLabel(row);

  drawMasthead(doc, 'Invoice', number, 40);
  chip(doc, status, 194, 27.5, STATUS_COLOR[status] ?? C.muted, [255, 255, 255]);

  // Meta strip: billed-to · dates · reference.
  drawBilledTo(doc, customer, 16, 53);

  eyebrow(doc, 'Issue date', 106, 53);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.ink);
  doc.text(fmtDate(row.date_created), 106, 59.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  doc.text(`Downloaded ${fmtDate(new Date().toISOString())}`, 106, 64.5);

  eyebrow(doc, 'Reference', 194, 53, C.accentDark, 'right');
  const ref = row.trans_id || referenceCode(row);
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  doc.text(ref.slice(0, 16), 194, 59, { align: 'right' });
  if (ref.length > 16) doc.text(ref.slice(16), 194, 63, { align: 'right' });

  // Hero total panel.
  doc.setFillColor(...C.mint);
  doc.roundedRect(16, 73, 178, 28, 4, 4, 'F');
  doc.setDrawColor(...C.mintLine);
  doc.setLineWidth(0.4);
  doc.roundedRect(16, 73, 178, 28, 4, 4, 'S');
  eyebrow(doc, 'Total amount', 24, 82);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text(
    `${TYPE_LABEL[row.type] ?? row.type} · ${row.direction === 'credit' ? 'Credited to your account' : row.direction === 'debit' ? 'Debited from your account' : 'Balance movement'}`,
    24, 94,
  );
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(23);
  doc.setTextColor(...C.accentDark);
  doc.text(signedAmount(row), 186, 91.5, { align: 'right' });

  // Detail rows — borderless, hairline-separated.
  const details: Array<[string, string, boolean?]> = [
    ['INVOICE NUMBER', number],
    ['TYPE', TYPE_LABEL[row.type] ?? row.type],
    ['DESCRIPTION', row.name || TYPE_LABEL[row.type] || '—'],
    ['METHOD', methodLabel(row)],
    ['REFERENCE', ref, true],
    ['STATUS', status],
    ['DIRECTION', row.direction ? row.direction.toUpperCase() : '—'],
    ['CURRENCY', row.currency_name || 'USD'],
  ];

  autoTable(doc, {
    startY: 110,
    theme: 'plain',
    body: details.map(([label, value, mono]) => [
      label,
      mono ? { content: value, styles: { font: 'courier', fontSize: 8.5 } } : value,
    ]),
    styles: { fontSize: 9.5, cellPadding: { top: 3.4, bottom: 3.4, left: 0, right: 0 }, textColor: C.ink as any },
    columnStyles: {
      0: { cellWidth: 52, fontSize: 7, fontStyle: 'bold', textColor: C.muted as any, valign: 'middle' },
    },
    margin: { left: 16, right: 16 },
    didDrawCell: (data) => {
      if (data.column.index === 1 && data.row.index < details.length - 1) {
        doc.setDrawColor(...C.hairline);
        doc.setLineWidth(0.25);
        doc.line(16, data.cell.y + data.cell.height, 194, data.cell.y + data.cell.height);
      }
    },
  });

  drawFooter(doc);
  doc.save(`${number}.pdf`);
}

/* ──────────────────────────── statement ─────────────────────────────── */

/** Multi-row statement of the current filtered ledger view. */
export function generateStatementPdf(
  rows: InvoiceRow[],
  customer: InvoiceCustomer,
  meta: { filterLabel?: string; from?: string; to?: string } = {},
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const today = new Date().toISOString().slice(0, 10);

  drawMasthead(doc, 'Account statement', `${rows.length} transactions`, 36);

  // En dash, not '→' — the arrow glyph isn't in jsPDF's WinAnsi fonts.
  const range = meta.from || meta.to
    ? `${meta.from || 'start'} – ${meta.to || 'today'}`
    : 'All loaded activity';

  drawBilledTo(doc, customer, 16, 48);

  eyebrow(doc, 'Period', 106, 48);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...C.ink);
  doc.text(range, 106, 54);

  eyebrow(doc, 'Filter', 194, 48, C.accentDark, 'right');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...C.ink);
  doc.text(meta.filterLabel || 'All types', 194, 54, { align: 'right' });

  // Summary cards: credits / debits / net.
  let credits = 0, debits = 0;
  for (const r of rows) {
    const v = parseFloat(String(r.amount)) || 0;
    if (r.direction === 'credit') credits += v;
    else if (r.direction === 'debit') debits += v;
  }
  const net = credits - debits;

  const cards: Array<{ label: string; value: string; bg: RGB; fg: RGB; labelFg: RGB; border?: RGB }> = [
    { label: 'Total credits', value: `+${money(credits)}`, bg: C.mint, fg: C.accentDark, labelFg: C.accentDark, border: C.mintLine },
    { label: 'Total debits', value: `-${money(debits)}`, bg: C.panel, fg: C.ink, labelFg: C.muted, border: C.hairline },
    { label: 'Net movement', value: net >= 0 ? `+${money(net)}` : `-${money(Math.abs(net))}`, bg: C.accent, fg: [255, 255, 255] as RGB, labelFg: C.mint },
  ];
  cards.forEach((card, i) => {
    const x = 16 + i * 61;
    doc.setFillColor(...card.bg);
    doc.roundedRect(x, 62, 56, 18, 3, 3, 'F');
    if (card.border) {
      doc.setDrawColor(...card.border);
      doc.setLineWidth(0.4);
      doc.roundedRect(x, 62, 56, 18, 3, 3, 'S');
    }
    eyebrow(doc, card.label, x + 5, 69, card.labelFg);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(...card.fg);
    doc.text(card.value, x + 5, 76.5);
  });

  autoTable(doc, {
    startY: 88,
    head: [['Date', 'Invoice #', 'Type', 'Description', 'Method', 'Status', 'Dir', 'Amount']],
    body: rows.map((r) => [
      fmtDate(r.date_created),
      invoiceNumber(r),
      TYPE_LABEL[r.type] ?? r.type,
      r.name || TYPE_LABEL[r.type] || '—',
      methodLabel(r),
      statusLabel(r),
      r.direction === 'credit' ? 'CR' : r.direction === 'debit' ? 'DR' : '—',
      signedAmount(r),
    ]),
    theme: 'plain',
    styles: { fontSize: 7.6, cellPadding: { top: 2.6, bottom: 2.6, left: 1.5, right: 1.5 }, textColor: C.ink as any },
    headStyles: {
      fillColor: C.accent as any, textColor: 255, fontStyle: 'bold', fontSize: 7.2,
      cellPadding: { top: 3, bottom: 3, left: 1.5, right: 1.5 },
    },
    alternateRowStyles: { fillColor: C.panel as any },
    columnStyles: { 7: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 16, right: 16, top: 20, bottom: 16 },
  });

  drawFooter(doc);
  doc.save(`bex-statement-${today}.pdf`);
}
