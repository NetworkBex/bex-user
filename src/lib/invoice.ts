/**
 * Client-side PDF invoices for the unified transactions ledger.
 *
 * Dark, brand-accurate sheets: the BEX dark canvas (#0b0f0e) with the emerald
 * accent and a low-opacity logo watermark. Every ledger row exports as a single
 * A4 invoice, and the whole filtered view as a statement. Generated entirely in
 * the browser with jsPDF; no backend round-trip.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export type InvoiceCustomer = { name: string; email: string };

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
  deposit: 'Deposit', withdraw: 'Withdrawal', invest: 'Investment', cashout: 'Cashout',
  nft: 'NFT Purchase', commission: 'Commission', adjustment: 'Adjustment', earning: 'Earning credit',
};

const STATUS_LABEL: Record<number, string> = {
  0: 'Pending', 1: 'Cancelled', 2: 'Processing', 3: 'Completed', 4: 'Failed',
};

type RGB = [number, number, number];

/** Dark brand palette. */
const C = {
  accent:     [16, 185, 129] as RGB,  // #10b981 brand emerald
  accentDark: [5, 150, 105] as RGB,   // #059669
  mint:       [134, 239, 196] as RGB, // light emerald for text on dark
  canvas:     [11, 15, 14] as RGB,    // #0b0f0e page background
  surface:    [18, 24, 22] as RGB,    // #121614 panel
  surface2:   [26, 33, 30] as RGB,    // lifted panel / chips
  border:     [33, 44, 40] as RGB,    // hairline on dark
  light:      [236, 242, 239] as RGB, // primary text
  lightMuted: [150, 164, 158] as RGB, // secondary text
  lightSubtle:[104, 118, 112] as RGB, // tertiary text
  white:      [255, 255, 255] as RGB,
};

/** Status chip text colours (on a dark chip). */
const STATUS_COLOR: Record<string, RGB> = {
  'Completed':     C.accent,
  'Auto-credited': C.accent,
  'Pending':       [245, 179, 60],
  'Processing':    [110, 150, 235],
  'Cancelled':     [150, 164, 158],
  'Failed':        [240, 110, 110],
  '—':             [150, 164, 158],
};

const BRAND = { name: 'BEX Network', email: 'support@bexnetwork.io' };

const METHOD_LABEL: Record<string, string> = {
  acc_balance: 'Account balance', bex_wallet: 'BEX wallet', wallet: 'Crypto wallet',
  nowpayments: 'Card / Crypto checkout', bank: 'Bank transfer', admin: 'Admin adjustment',
};
const METHOD_BY_TYPE: Record<string, string> = {
  invest: 'Account balance', cashout: 'Account balance', nft: 'Account balance',
  earning: 'Auto-credit (earnings engine)', commission: 'Referral program', adjustment: 'Admin adjustment',
};

export function methodLabel(row: Pick<InvoiceRow, 'type' | 'method' | '_source'>): string {
  if (row._source === 'earning') return METHOD_BY_TYPE.earning;
  if (row.method) return METHOD_LABEL[row.method] ?? row.method;
  return METHOD_BY_TYPE[row.type] ?? '—';
}

const REF_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
export function referenceCode(row: InvoiceRow): string {
  const seed = `${row._source ?? 'txn'}:${row.id}:${row.transaction_id ?? ''}:${row.date_created}`;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  let x = h || 0x9e3779b9;
  let out = '';
  for (let i = 0; i < 32; i++) { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; out += REF_CHARS[x % REF_CHARS.length]; }
  return out;
}

export function invoiceNumber(row: InvoiceRow): string {
  if (row._source === 'earning') return `BEX-CR-${String(row.id).replace(/^e-/, '').padStart(6, '0')}`;
  return `BEX-TNX-${String(row.transaction_id ?? row.id).padStart(6, '0')}`;
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
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
const money = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ───────────────────── brand logo (embedded) ─────────────────────────── */

let _logoCache: string | null | undefined;
async function loadLogo(): Promise<string | null> {
  if (_logoCache !== undefined) return _logoCache;
  try {
    const res = await fetch('/logo.png');
    if (!res.ok) throw new Error('logo fetch failed');
    const blob = await res.blob();
    _logoCache = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch { _logoCache = null; }
  return _logoCache;
}

/* ───────────────────────── drawing primitives ───────────────────────── */

function trackedRight(doc: jsPDF, text: string, right: number, y: number, charSpace: number) {
  const w = doc.getTextWidth(text) + charSpace * Math.max(0, text.length - 1);
  doc.text(text, right - w, y, { charSpace });
}

function eyebrow(doc: jsPDF, text: string, x: number, y: number, color: RGB = C.accent, align: 'left' | 'right' = 'left') {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...color);
  if (align === 'right') trackedRight(doc, text.toUpperCase(), x, y, 0.9);
  else doc.text(text.toUpperCase(), x, y, { charSpace: 0.9 });
}

function chip(doc: jsPDF, label: string, right: number, y: number, fg: RGB): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  const w = doc.getTextWidth(label) + 9;
  doc.setFillColor(...C.surface2);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(right - w, y, w, 7, 3.5, 3.5, 'FD');
  doc.setTextColor(...fg);
  doc.text(label, right - w / 2, y + 4.7, { align: 'center' });
  return w;
}

/** Paint the full page in the brand dark canvas. */
function fillPage(doc: jsPDF) {
  doc.setFillColor(...C.canvas);
  doc.rect(0, 0, 210, 297, 'F');
}

/** Large, low-opacity logo watermark centred on the page. */
function drawWatermark(doc: jsPDF, logo: string | null) {
  if (!logo) return;
  try {
    const g = (doc as any).GState ? new (doc as any).GState({ opacity: 0.07 }) : null;
    if (!g) return;
    doc.saveGraphicsState();
    doc.setGState(g);
    const s = 135;
    doc.addImage(logo, 'PNG', (210 - s) / 2, (297 - s) / 2 - 6, s, s);
    doc.restoreGraphicsState();
  } catch { /* decorative only */ }
}

/** Dark masthead with the real BEX logo, wordmark and document title. */
function drawMasthead(doc: jsPDF, title: string, subtitle: string, height: number, logo: string | null) {
  doc.setFillColor(...C.surface);
  doc.rect(0, 0, 210, height, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, height, 210, 1.2, 'F');

  // Soft emerald glow.
  try {
    const g = (doc as any).GState ? new (doc as any).GState({ opacity: 0.16 }) : null;
    if (g) {
      doc.saveGraphicsState(); doc.setGState(g);
      doc.setFillColor(...C.accent);
      doc.circle(178, 0, 26, 'F'); doc.circle(203, height - 2, 16, 'F');
      doc.restoreGraphicsState();
    }
  } catch { /* */ }

  const ly = (height - 13) / 2;
  if (logo) doc.addImage(logo, 'PNG', 16, ly, 13, 13);
  else {
    doc.setFillColor(...C.accent); doc.roundedRect(16, ly, 13, 13, 3, 3, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...C.canvas);
    doc.text('B', 22.5, ly + 9, { align: 'center' });
  }

  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...C.white);
  doc.text('BEX', 33, ly + 6.4);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.3); doc.setTextColor(...C.lightMuted);
  doc.text(`${BRAND.name} · ${BRAND.email}`, 33, ly + 11.4);

  eyebrow(doc, title, 194, ly + 4, C.accent, 'right');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13.5); doc.setTextColor(...C.white);
  doc.text(subtitle, 194, ly + 11.5, { align: 'right' });
}

function drawBilledTo(doc: jsPDF, customer: InvoiceCustomer, x: number, y: number) {
  eyebrow(doc, 'Billed to', x, y);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...C.light);
  doc.text(customer.name || 'BEX customer', x, y + 6.5);
  if (customer.email) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...C.lightMuted);
    doc.text(customer.email, x, y + 11.5);
  }
}

function drawFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
    doc.line(16, 285, 194, 285);
    doc.setFillColor(...C.accent); doc.roundedRect(16, 287.6, 2.4, 2.4, 0.6, 0.6, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...C.lightSubtle);
    doc.text('Generated client-side from your BEX account ledger — not a tax document.', 21, 289.6);
    doc.text(pages > 1 ? `Page ${i} of ${pages}` : BRAND.name, 194, 289.6, { align: 'right' });
  }
}

/* ───────────────────────────── invoice ──────────────────────────────── */

export async function generateInvoicePdf(row: InvoiceRow, customer: InvoiceCustomer): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const number = invoiceNumber(row);
  const status = statusLabel(row);
  const logo = await loadLogo();

  fillPage(doc);
  drawWatermark(doc, logo);
  drawMasthead(doc, 'Invoice', number, 40, logo);
  chip(doc, status, 194, 28.5, STATUS_COLOR[status] ?? C.lightMuted);

  drawBilledTo(doc, customer, 16, 54);

  eyebrow(doc, 'Issue date', 106, 54);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...C.light);
  doc.text(fmtDate(row.date_created), 106, 60.5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...C.lightMuted);
  doc.text(`Downloaded ${fmtDate(new Date().toISOString())}`, 106, 65.5);

  eyebrow(doc, 'Reference', 194, 54, C.accent, 'right');
  const ref = row.trans_id || referenceCode(row);
  doc.setFont('courier', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...C.lightMuted);
  doc.text(ref.slice(0, 16), 194, 60, { align: 'right' });
  if (ref.length > 16) doc.text(ref.slice(16), 194, 64, { align: 'right' });

  // Hero total panel — emerald-tinted dark surface.
  doc.setFillColor(...C.surface);
  doc.roundedRect(16, 74, 178, 28, 4, 4, 'F');
  doc.setDrawColor(...C.accent); doc.setLineWidth(0.5);
  doc.roundedRect(16, 74, 178, 28, 4, 4, 'S');
  eyebrow(doc, 'Total amount', 24, 83);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...C.lightMuted);
  doc.text(
    `${TYPE_LABEL[row.type] ?? row.type} · ${row.direction === 'credit' ? 'Credited to your account' : row.direction === 'debit' ? 'Debited from your account' : 'Balance movement'}`,
    24, 95,
  );
  doc.setFont('helvetica', 'bold'); doc.setFontSize(23); doc.setTextColor(...C.accent);
  doc.text(signedAmount(row), 186, 92.5, { align: 'right' });

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
    startY: 111,
    theme: 'plain',
    body: details.map(([label, value, mono]) => [
      label,
      mono ? { content: value, styles: { font: 'courier', fontSize: 8.5 } } : value,
    ]),
    styles: { fontSize: 9.5, cellPadding: { top: 3.4, bottom: 3.4, left: 0, right: 0 }, textColor: C.light as any, fillColor: false as any },
    columnStyles: { 0: { cellWidth: 52, fontSize: 7, fontStyle: 'bold', textColor: C.lightMuted as any, valign: 'middle' } },
    margin: { left: 16, right: 16 },
    didDrawCell: (data) => {
      if (data.column.index === 1 && data.row.index < details.length - 1) {
        doc.setDrawColor(...C.border); doc.setLineWidth(0.25);
        doc.line(16, data.cell.y + data.cell.height, 194, data.cell.y + data.cell.height);
      }
    },
  });

  drawFooter(doc);
  doc.save(`${number}.pdf`);
}

/* ──────────────────────────── statement ─────────────────────────────── */

export async function generateStatementPdf(
  rows: InvoiceRow[],
  customer: InvoiceCustomer,
  meta: { filterLabel?: string; from?: string; to?: string } = {},
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const today = new Date().toISOString().slice(0, 10);
  const logo = await loadLogo();

  fillPage(doc);
  drawWatermark(doc, logo);
  drawMasthead(doc, 'Account statement', `${rows.length} transactions`, 36, logo);

  const range = meta.from || meta.to ? `${meta.from || 'start'} – ${meta.to || 'today'}` : 'All loaded activity';

  drawBilledTo(doc, customer, 16, 48);
  eyebrow(doc, 'Period', 106, 48);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...C.light);
  doc.text(range, 106, 54);
  eyebrow(doc, 'Filter', 194, 48, C.accent, 'right');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...C.light);
  doc.text(meta.filterLabel || 'All types', 194, 54, { align: 'right' });

  // Summary cards.
  let credits = 0, debits = 0;
  for (const r of rows) {
    const v = parseFloat(String(r.amount)) || 0;
    if (r.direction === 'credit') credits += v; else if (r.direction === 'debit') debits += v;
  }
  const net = credits - debits;
  const cards: Array<{ label: string; value: string; fg: RGB; accent?: boolean }> = [
    { label: 'Total credits', value: `+${money(credits)}`, fg: C.accent },
    { label: 'Total debits', value: `-${money(debits)}`, fg: C.light },
    { label: 'Net movement', value: net >= 0 ? `+${money(net)}` : `-${money(Math.abs(net))}`, fg: C.white, accent: true },
  ];
  cards.forEach((card, i) => {
    const x = 16 + i * 61;
    doc.setFillColor(...(card.accent ? C.accent : C.surface));
    doc.roundedRect(x, 62, 56, 18, 3, 3, 'F');
    if (!card.accent) { doc.setDrawColor(...C.border); doc.setLineWidth(0.4); doc.roundedRect(x, 62, 56, 18, 3, 3, 'S'); }
    eyebrow(doc, card.label, x + 5, 69, card.accent ? C.white : C.lightMuted);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5); doc.setTextColor(...card.fg);
    doc.text(card.value, x + 5, 76.5);
  });

  const MTOP = 22;
  autoTable(doc, {
    startY: 88,
    head: [['Date', 'Invoice #', 'Type', 'Description', 'Method', 'Status', 'Dir', 'Amount']],
    body: rows.map((r) => [
      fmtDate(r.date_created), invoiceNumber(r), TYPE_LABEL[r.type] ?? r.type,
      r.name || TYPE_LABEL[r.type] || '—', methodLabel(r), statusLabel(r),
      r.direction === 'credit' ? 'CR' : r.direction === 'debit' ? 'DR' : '—', signedAmount(r),
    ]),
    theme: 'plain',
    styles: { fontSize: 7.6, cellPadding: { top: 2.6, bottom: 2.6, left: 1.5, right: 1.5 }, textColor: C.light as any, fillColor: C.surface as any },
    headStyles: { fillColor: C.accent as any, textColor: C.canvas as any, fontStyle: 'bold', fontSize: 7.2, cellPadding: { top: 3, bottom: 3, left: 1.5, right: 1.5 } },
    alternateRowStyles: { fillColor: C.surface2 as any },
    columnStyles: { 7: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 16, right: 16, top: MTOP, bottom: 16 },
    // Keep overflow pages on-brand: paint the empty margins dark (cells already
    // carry dark fills, so we never cover content).
    didDrawPage: (data) => {
      doc.setFillColor(...C.canvas);
      doc.rect(0, 0, 16, 297, 'F');            // left margin
      doc.rect(194, 0, 16, 297, 'F');          // right margin
      if (data.pageNumber > 1) {
        doc.rect(16, 0, 178, MTOP, 'F');       // top band on continued pages
        eyebrow(doc, 'BEX · Account statement (continued)', 16, 14, C.accent);
      }
      const yEnd = (data.cursor && (data.cursor as any).y) || (297 - 16);
      doc.rect(16, yEnd, 178, 297 - yEnd, 'F'); // bottom band below the last row
    },
  });

  drawFooter(doc);
  doc.save(`bex-statement-${today}.pdf`);
}
