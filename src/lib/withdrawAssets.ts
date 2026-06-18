// Withdrawable assets and the networks each can be sent on. Withdrawals go to
// the user's own address, so this is a broad bundled list (popular first) — it
// does not depend on the admin deposit-address table.

export interface WithdrawAsset {
  symbol: string;
  name: string;
  networks: string[];
}

export const WITHDRAW_ASSETS: WithdrawAsset[] = [
  { symbol: 'USDT', name: 'Tether',        networks: ['Tron', 'Ethereum', 'BSC', 'Polygon', 'Arbitrum', 'Solana', 'Avalanche', 'Optimism'] },
  { symbol: 'USDC', name: 'USD Coin',      networks: ['Ethereum', 'Solana', 'BSC', 'Polygon', 'Arbitrum', 'Avalanche', 'Optimism', 'Base'] },
  { symbol: 'BTC',  name: 'Bitcoin',       networks: ['Bitcoin', 'Lightning', 'BSC'] },
  { symbol: 'ETH',  name: 'Ethereum',      networks: ['Ethereum', 'Arbitrum', 'Optimism', 'Base', 'BSC'] },
  { symbol: 'BNB',  name: 'BNB',           networks: ['BSC', 'BNB Beacon Chain'] },
  { symbol: 'SOL',  name: 'Solana',        networks: ['Solana'] },
  { symbol: 'XRP',  name: 'XRP',           networks: ['XRP Ledger'] },
  { symbol: 'TRX',  name: 'TRON',          networks: ['Tron'] },
  { symbol: 'DOGE', name: 'Dogecoin',      networks: ['Dogecoin'] },
  { symbol: 'LTC',  name: 'Litecoin',      networks: ['Litecoin'] },
  { symbol: 'ADA',  name: 'Cardano',       networks: ['Cardano'] },
  { symbol: 'POL',  name: 'Polygon',       networks: ['Polygon'] },
  { symbol: 'AVAX', name: 'Avalanche',     networks: ['Avalanche', 'BSC'] },
  { symbol: 'TON',  name: 'Toncoin',       networks: ['TON'] },
  { symbol: 'DOT',  name: 'Polkadot',      networks: ['Polkadot'] },
  { symbol: 'BCH',  name: 'Bitcoin Cash',  networks: ['Bitcoin Cash'] },
  { symbol: 'XLM',  name: 'Stellar',       networks: ['Stellar'] },
  { symbol: 'LINK', name: 'Chainlink',     networks: ['Ethereum', 'BSC', 'Polygon'] },
  { symbol: 'SHIB', name: 'Shiba Inu',     networks: ['Ethereum', 'BSC'] },
  { symbol: 'DAI',  name: 'Dai',           networks: ['Ethereum', 'Polygon', 'Arbitrum', 'BSC'] },
  { symbol: 'ATOM', name: 'Cosmos',        networks: ['Cosmos'] },
  { symbol: 'NEAR', name: 'NEAR Protocol', networks: ['NEAR'] },
  { symbol: 'ARB',  name: 'Arbitrum',      networks: ['Arbitrum'] },
  { symbol: 'OP',   name: 'Optimism',      networks: ['Optimism'] },
  { symbol: 'APT',  name: 'Aptos',         networks: ['Aptos'] },
  { symbol: 'FIL',  name: 'Filecoin',      networks: ['Filecoin'] },
  { symbol: 'ETC',  name: 'Ethereum Classic', networks: ['Ethereum Classic'] },
  { symbol: 'UNI',  name: 'Uniswap',       networks: ['Ethereum'] },
  { symbol: 'AAVE', name: 'Aave',          networks: ['Ethereum', 'Polygon'] },
];
