/**
 * Best-effort USD price feed for the native gas tokens of the chains we
 * support. Used by the admin wallets page to render a USD value next to
 * each on-chain balance.
 *
 * Source: CoinGecko's free `simple/price` endpoint (no API key required
 * for low-traffic callers). We cache for 60s and fall back to `null`
 * (no USD value shown) on any failure.
 *
 * Only the symbols we actually need are fetched, so a single request
 * covers the whole admin table.
 */

const COINGECKO_IDS: Record<string, string> = {
  ETH:   'ethereum',
  POL:   'matic-network',
  ARB:   'arbitrum',
  BASE:  'ethereum',     // Base pays gas in ETH
  SEP:   'ethereum',     // Sepolia testnet — priced against ETH for context
};

let cache: { fetchedAt: number; prices: Record<string, number | null> } | null = null;
const TTL_MS = 60_000;

/** Returns USD price for the given chain short name (ETH, POL, ARB, BASE, SEP), or null. */
export async function getUsdPrices(symbols: string[]): Promise<Record<string, number | null>> {
  const want = Array.from(new Set(symbols.filter((s) => COINGECKO_IDS[s])));
  if (!want.length) return {};

  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) {
    return Object.fromEntries(want.map((s) => [s, cache!.prices[s] ?? null]));
  }

  const ids = Array.from(new Set(want.map((s) => COINGECKO_IDS[s])));
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`coingecko ${res.status}`);
    const data = await res.json();
    // Map back from coingecko id to our short symbol.
    const prices: Record<string, number | null> = {};
    for (const sym of want) {
      const id = COINGECKO_IDS[sym];
      const v = data?.[id]?.usd;
      prices[sym] = typeof v === 'number' && Number.isFinite(v) ? v : null;
    }
    cache = { fetchedAt: now, prices };
    return Object.fromEntries(want.map((s) => [s, prices[s] ?? null]));
  } catch {
    // Cache a failure so we don't hammer the endpoint.
    cache = { fetchedAt: now, prices: Object.fromEntries(want.map((s) => [s, null])) };
    return Object.fromEntries(want.map((s) => [s, null]));
  }
}

export function formatUsd(value: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (opts.compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat(undefined, {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value);
}
