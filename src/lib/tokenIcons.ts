// Maps token symbols and chains to their brand icons (in /public/tokens).
// BEX uses the app logo. Falls back to null so the UI can draw a letter avatar.

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

export function tokenIcon(symbol?: string | null): string | null {
  if (!symbol) return null;
  return BY_SYMBOL[symbol.toUpperCase()] ?? null;
}

export function chainIcon(chainId?: number | null): string | null {
  if (chainId == null) return null;
  return BY_CHAIN[chainId] ?? null;
}

const BY_NETWORK_NAME: Record<string, string> = {
  ETHEREUM: '/tokens/ethereum.png',
  POLYGON:  '/tokens/polygon.png',
  ARBITRUM: '/tokens/arbitrum.png',
};

/** Icon for an admin-saved network name (e.g. "Ethereum", "Tron"). */
export function networkIcon(name?: string | null): string | null {
  if (!name) return null;
  return BY_NETWORK_NAME[name.toUpperCase()] ?? null;
}

const BY_VENUE: Record<string, string> = {
  'HYPERLIQUID': '/venues/hyperliquid.png',
  'UNISWAP V3':  '/venues/uniswap.png',
  'UNISWAP':     '/venues/uniswap.png',
  'CURVE':       '/venues/curve.png',
  'RAYDIUM':     '/venues/raydium.png',
  'PANCAKESWAP': '/venues/pancakeswap.png',
};

/** Icon for a trading venue / exchange (e.g. "Uniswap v3", "Hyperliquid"). */
export function venueIcon(name?: string | null): string | null {
  if (!name) return null;
  return BY_VENUE[name.trim().toUpperCase()] ?? null;
}

/** Best icon for a currency given its symbol and (optionally) its chain. */
export function currencyIcon(symbol?: string | null, chainId?: number | null): string | null {
  return tokenIcon(symbol) ?? chainIcon(chainId);
}
