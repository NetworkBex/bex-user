// Icon resolution for tokens, chains and trading venues.
//
// Order of preference: locally-bundled brand icons (in /public, the artwork we
// curated) → the DefiLlama icon CDN (covers everything else with real logos) →
// null, which lets the UI draw a coloured letter avatar.

/* ─── Local brand overrides ──────────────────────────────────────────── */

const BY_SYMBOL: Record<string, string> = {
  USDT: '/tokens/usdt.png',
  USDC: '/tokens/usdc.png',
  ETH:  '/tokens/ethereum.png',
  WETH: '/tokens/ethereum.png',
  POL:  '/tokens/polygon.png',
  MATIC:'/tokens/polygon.png',
  ARB:  '/tokens/arbitrum.png',
  BEX:  '/logo.png',
};

const BY_CHAIN: Record<number, string> = {
  1:     '/tokens/ethereum.png',
  137:   '/tokens/polygon.png',
  42161: '/tokens/arbitrum.png',
};

const BY_NETWORK_NAME: Record<string, string> = {
  ETHEREUM: '/tokens/ethereum.png',
  POLYGON:  '/tokens/polygon.png',
  ARBITRUM: '/tokens/arbitrum.png',
};

const BY_VENUE: Record<string, string> = {
  'HYPERLIQUID': '/venues/hyperliquid.png',
  'UNISWAP V3':  '/venues/uniswap.png',
  'UNISWAP':     '/venues/uniswap.png',
  'CURVE':       '/venues/curve.png',
  'RAYDIUM':     '/venues/raydium.png',
  'PANCAKESWAP': '/venues/pancakeswap.png',
};

/* ─── DefiLlama CDN fallbacks ─────────────────────────────────────────── */

// https://icons.llamao.fi/icons/chains/rsz_<chain>.jpg
const LLAMA_CHAIN: Record<string, string> = {
  ETHEREUM: 'ethereum', POLYGON: 'polygon', ARBITRUM: 'arbitrum', BASE: 'base',
  OPTIMISM: 'optimism', AVALANCHE: 'avalanche', SOLANA: 'solana', TRON: 'tron',
  BITCOIN: 'bitcoin', BSC: 'bsc', BNB: 'bsc', 'BNB CHAIN': 'bsc',
};

const CHAINID_TO_LLAMA: Record<number, string> = {
  1: 'ethereum', 137: 'polygon', 42161: 'arbitrum', 8453: 'base',
  10: 'optimism', 43114: 'avalanche', 56: 'bsc',
};

// Native-ish symbols that map cleanly to a chain logo on DefiLlama.
const SYMBOL_TO_LLAMA_CHAIN: Record<string, string> = {
  ETH: 'ethereum', BTC: 'bitcoin', SOL: 'solana', POL: 'polygon',
  MATIC: 'polygon', ARB: 'arbitrum', BNB: 'bsc', AVAX: 'avalanche', TRX: 'tron',
  OP: 'optimism',
};

// Trading-venue → DefiLlama protocol slug.
const VENUE_TO_LLAMA: Record<string, string> = {
  HYPERLIQUID: 'hyperliquid', 'UNISWAP V3': 'uniswap', UNISWAP: 'uniswap',
  CURVE: 'curve-finance', RAYDIUM: 'raydium', PANCAKESWAP: 'pancakeswap',
  AERODROME: 'aerodrome-v1', 'AERODROME V1': 'aerodrome-v1',
};

const llamaChainUrl = (slug: string) => `https://icons.llamao.fi/icons/chains/rsz_${slug}.jpg`;
const llamaProtocolUrl = (slug: string) => `https://icons.llamao.fi/icons/protocols/${slug}?w=48&h=48`;

/* ─── Public resolvers ───────────────────────────────────────────────── */

export function tokenIcon(symbol?: string | null): string | null {
  if (!symbol) return null;
  const s = symbol.toUpperCase();
  if (BY_SYMBOL[s]) return BY_SYMBOL[s];
  if (SYMBOL_TO_LLAMA_CHAIN[s]) return llamaChainUrl(SYMBOL_TO_LLAMA_CHAIN[s]);
  return null;
}

export function chainIcon(chainId?: number | null): string | null {
  if (chainId == null) return null;
  if (BY_CHAIN[chainId]) return BY_CHAIN[chainId];
  if (CHAINID_TO_LLAMA[chainId]) return llamaChainUrl(CHAINID_TO_LLAMA[chainId]);
  return null;
}

/** Icon for a network name (e.g. "Ethereum", "Tron", "Base"). */
export function networkIcon(name?: string | null): string | null {
  if (!name) return null;
  const n = name.trim().toUpperCase();
  if (BY_NETWORK_NAME[n]) return BY_NETWORK_NAME[n];
  if (LLAMA_CHAIN[n]) return llamaChainUrl(LLAMA_CHAIN[n]);
  return null;
}

/** Icon for a trading venue / exchange (e.g. "Uniswap v3", "Aerodrome"). */
export function venueIcon(name?: string | null): string | null {
  if (!name) return null;
  const n = name.trim().toUpperCase();
  if (BY_VENUE[n]) return BY_VENUE[n];
  if (VENUE_TO_LLAMA[n]) return llamaProtocolUrl(VENUE_TO_LLAMA[n]);
  return null;
}

/** Best icon for a currency given its symbol and (optionally) its chain. */
export function currencyIcon(symbol?: string | null, chainId?: number | null): string | null {
  return tokenIcon(symbol) ?? chainIcon(chainId);
}
