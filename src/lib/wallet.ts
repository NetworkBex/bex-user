/**
 * BEX wallet primitives.
 *
 * Custodial model:
 *   1. Mnemonic + private key are generated in the browser using the
 *      user's CSPRNG.
 *   2. We store a scrypt-encrypted JSON keystore (MetaMask-compatible)
 *      in localStorage so the same browser can decrypt the wallet
 *      without re-importing the phrase.
 *   3. The seed phrase + private key are also POSTed once to the
 *      server, which encrypts them with AES-256-GCM (scrypt-derived
 *      key, AAD-bound to chain + address) and stores the ciphertext.
 *      This makes BEX custodial — admins can recover wallets via the
 *      audited reveal endpoint, but the master secret (WALLET_ENC_KEY)
 *      lives outside the database.
 *
 * Derivation: standard Ethereum path m/44'/60'/0'/0/0, 12-word BIP-39.
 */

import {
  HDNodeWallet,
  Mnemonic,
  Wallet,
  JsonRpcProvider,
  formatEther,
  parseEther,
  getAddress,
  isAddress,
} from 'ethers';

export const STORAGE_KEYS = {
  address:  'bex.wallet.address',
  keystore: 'bex.wallet.keystore',
  chainId:  'bex.wallet.chainId',
} as const;

/* ─── Chain registry ──────────────────────────────────────────────── */

export interface ChainConfig {
  id: number;
  name: string;
  shortName: string;
  symbol: string;
  rpc: string;
  explorer: string;
  testnet: boolean;
}

export const CHAINS: Record<number, ChainConfig> = {
  1: {
    id: 1,
    name: 'Ethereum',
    shortName: 'ETH',
    symbol: 'ETH',
    rpc: 'https://ethereum-rpc.publicnode.com',
    explorer: 'https://etherscan.io',
    testnet: false,
  },
  137: {
    id: 137,
    name: 'Polygon',
    shortName: 'MATIC',
    symbol: 'POL',
    rpc: 'https://polygon-bor-rpc.publicnode.com',
    explorer: 'https://polygonscan.com',
    testnet: false,
  },
  42161: {
    id: 42161,
    name: 'Arbitrum',
    shortName: 'ARB',
    symbol: 'ETH',
    rpc: 'https://arbitrum-one-rpc.publicnode.com',
    explorer: 'https://arbiscan.io',
    testnet: false,
  },
};

/* ─── Currency registry ──────────────────────────────────────────── */

/** A currency the user can deposit/withdraw — either native or an ERC-20 stable. */
export interface Currency {
  /** Stable identifier used in API payloads (e.g. "usdc-eth"). */
  id: string;
  /** Display ticker (USDC, USDT, ETH, POL). */
  symbol: string;
  /** Long name. */
  name: string;
  /** Chain it lives on. */
  chainId: number;
  /** Whether this is the chain's native asset (no contract address). */
  native: boolean;
  /** ERC-20 contract address — only meaningful when `native === false`. */
  contract?: string;
  /** Token decimals. Native chains we support are 18. USDC/USDT vary. */
  decimals: number;
}

/** All currencies available across the supported chains.
 *  Backend can override via /core/currencies/ later; this is the canonical list. */
export const CURRENCIES: Currency[] = [
  // ─ Ethereum mainnet
  { id: 'eth-eth',   symbol: 'ETH',  name: 'Ether',           chainId: 1,        native: true,  decimals: 18 },
  { id: 'usdc-eth',  symbol: 'USDC', name: 'USD Coin',        chainId: 1,        native: false, decimals: 6, contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  { id: 'usdt-eth',  symbol: 'USDT', name: 'Tether',          chainId: 1,        native: false, decimals: 6, contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },

  // ─ Arbitrum One
  { id: 'eth-arb',   symbol: 'ETH',  name: 'Ether',           chainId: 42161,    native: true,  decimals: 18 },
  { id: 'usdc-arb',  symbol: 'USDC', name: 'USD Coin',        chainId: 42161,    native: false, decimals: 6, contract: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
  { id: 'usdt-arb',  symbol: 'USDT', name: 'Tether',          chainId: 42161,    native: false, decimals: 6, contract: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' },

  // ─ Polygon PoS
  { id: 'pol-pol',   symbol: 'POL',  name: 'Polygon',         chainId: 137,      native: true,  decimals: 18 },
  { id: 'usdc-pol',  symbol: 'USDC', name: 'USD Coin',        chainId: 137,      native: false, decimals: 6, contract: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
  { id: 'usdt-pol',  symbol: 'USDT', name: 'Tether',          chainId: 137,      native: false, decimals: 6, contract: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' },
];

export function currenciesForChain(chainId: number): Currency[] {
  return CURRENCIES.filter((c) => c.chainId === chainId);
}

export function currencyById(id: string): Currency | undefined {
  return CURRENCIES.find((c) => c.id === id);
}

export const DEFAULT_CHAIN_ID =
  Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 1; // Ethereum mainnet

/** BEX treasury address — destination for "Deposit to BEX" transfers. */
export const TREASURY_ADDRESS =
  process.env.NEXT_PUBLIC_BEX_TREASURY ||
  '0x000000000000000000000000000000000000dEaD';

export function getChain(id?: number | null): ChainConfig {
  const want = id ?? DEFAULT_CHAIN_ID;
  return CHAINS[want] ?? CHAINS[DEFAULT_CHAIN_ID];
}

export function getProvider(chainId?: number | null) {
  const chain = getChain(chainId);
  return new JsonRpcProvider(chain.rpc, chain.id);
}

/* ─── Generation / import ─────────────────────────────────────────── */

export interface NewWallet {
  address: string;
  privateKey: string;
  mnemonic: string;          // 12-word, space-separated
  derivationPath: string;
}

/** Generate a brand-new 12-word BIP-39 wallet using CSPRNG. */
export function createWallet(): NewWallet {
  const hd = Wallet.createRandom();
  if (!hd.mnemonic) throw new Error('Mnemonic generation failed');
  return {
    address: hd.address,
    privateKey: hd.privateKey,
    mnemonic: hd.mnemonic.phrase,
    derivationPath: hd.path ?? "m/44'/60'/0'/0/0",
  };
}

/** Reconstruct a wallet from a user-provided mnemonic. Throws if invalid. */
export function importFromMnemonic(phrase: string): NewWallet {
  const cleaned = phrase.trim().toLowerCase().split(/\s+/).join(' ');
  const m = Mnemonic.fromPhrase(cleaned); // throws on invalid words / checksum
  const hd = HDNodeWallet.fromMnemonic(m, "m/44'/60'/0'/0/0");
  return {
    address: hd.address,
    privateKey: hd.privateKey,
    mnemonic: cleaned,
    derivationPath: hd.path ?? "m/44'/60'/0'/0/0",
  };
}

/* ─── Encrypted keystore (MetaMask-compatible JSON) ──────────────── */

/**
 * Encrypt a freshly-created HD wallet. We pass the mnemonic so the resulting
 * keystore embeds it, which lets us recover the 12-word phrase on unlock.
 */
export async function encryptKeystore(
  source: NewWallet | string, // NewWallet → preserves mnemonic; string (privateKey) → key-only
  password: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const progress = onProgress ? (p: number) => onProgress(Math.round(p * 100)) : undefined;
  if (typeof source === 'string') {
    const w = new Wallet(source);
    return w.encrypt(password, progress);
  }
  // Rehydrate the HD wallet from the mnemonic so the keystore carries
  // mnemonic + derivation path and reveal can recover the phrase later.
  const m = Mnemonic.fromPhrase(source.mnemonic);
  const hd = HDNodeWallet.fromMnemonic(m, source.derivationPath);
  return hd.encrypt(password, progress);
}

/** Decrypt a keystore JSON. Returns an HDNodeWallet when mnemonic was embedded, otherwise a plain Wallet. */
export async function decryptKeystore(
  keystoreJson: string,
  password: string,
  onProgress?: (pct: number) => void
): Promise<HDNodeWallet | Wallet> {
  return Wallet.fromEncryptedJson(
    keystoreJson,
    password,
    onProgress ? (p) => onProgress(Math.round(p * 100)) : undefined
  );
}

/* ─── Persistence (address only — never the secret) ───────────────── */

export function loadStoredAddress(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.address);
}

export function loadStoredKeystore(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.keystore);
}

export function loadStoredChainId(): number {
  if (typeof window === 'undefined') return DEFAULT_CHAIN_ID;
  const v = localStorage.getItem(STORAGE_KEYS.chainId);
  const n = v ? Number(v) : DEFAULT_CHAIN_ID;
  // Guard against a stale stored network (e.g. the removed Sepolia testnet).
  return CHAINS[n] ? n : DEFAULT_CHAIN_ID;
}

export function persistWallet({ address, keystore }: { address: string; keystore: string }) {
  localStorage.setItem(STORAGE_KEYS.address, getAddress(address));
  localStorage.setItem(STORAGE_KEYS.keystore, keystore);
}

export function persistChainId(id: number) {
  localStorage.setItem(STORAGE_KEYS.chainId, String(id));
}

export function clearWallet() {
  localStorage.removeItem(STORAGE_KEYS.address);
  localStorage.removeItem(STORAGE_KEYS.keystore);
}

/* ─── On-chain reads / writes ─────────────────────────────────────── */

/** Returns native-token balance as a decimal string (e.g. "0.0421"). */
export async function getBalance(address: string, chainId?: number): Promise<string> {
  if (!isAddress(address)) throw new Error('Invalid address');
  const provider = getProvider(chainId);
  const wei = await provider.getBalance(address);
  return formatEther(wei);
}

/** Send native token. Returns the transaction hash. */
export async function sendNative(opts: {
  privateKey: string;
  to: string;
  amountEth: string;
  chainId?: number;
}): Promise<{ hash: string; explorerUrl: string }> {
  if (!isAddress(opts.to)) throw new Error('Invalid destination address');
  const chain = getChain(opts.chainId);
  const provider = getProvider(chain.id);
  const signer = new Wallet(opts.privateKey, provider);
  const tx = await signer.sendTransaction({
    to: getAddress(opts.to),
    value: parseEther(opts.amountEth),
  });
  return {
    hash: tx.hash,
    explorerUrl: `${chain.explorer}/tx/${tx.hash}`,
  };
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

export function shortAddress(addr?: string | null, head = 6, tail = 4): string {
  if (!addr) return '—';
  if (addr.length <= head + tail + 2) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

/** Pick `count` random distinct indices in [0, total) — for backup verification. */
export function pickIndices(total: number, count: number): number[] {
  const pool = Array.from({ length: total }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).sort((a, b) => a - b);
}

export { isAddress };
