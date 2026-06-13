'use client';

import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ReactNode,
} from 'react';
import {
  CHAINS, DEFAULT_CHAIN_ID, clearWallet, getBalance, loadStoredAddress,
  loadStoredChainId, loadStoredKeystore, persistChainId, persistWallet,
  type ChainConfig,
} from '@/lib/wallet';
import { walletAPI, parseApiError } from '@/lib/api';

interface WalletState {
  address: string | null;
  hasWallet: boolean;          // true if both address + keystore present
  chainId: number;
  chain: ChainConfig;
  balance: string | null;      // formatted decimal string
  loadingBalance: boolean;
  lastUpdated: number | null;
  /**
   * True iff there is a local wallet AND a valid session token. The
   * wallet is only "synced" to the server when both are true.
   * False → admin won't see this wallet in the admin panel.
   */
  syncedToServer: boolean;
  /** Last time we successfully POSTed to /auth/wallets/. */
  lastSyncedAt: number | null;
  /** Last error from the server-sync attempt, if any. */
  syncError: string | null;
}

interface WalletContextValue extends WalletState {
  refreshBalance: () => Promise<void>;
  setChainId: (id: number) => void;
  /**
   * Persist the wallet locally AND ship the seed to the server for
   * custodial escrow. The server encrypts the seed with AES-256-GCM
   * (scrypt-derived key) and never returns plaintext to the browser.
   */
  registerWallet: (
    address: string,
    keystore: string,
    seed?: { mnemonic: string; privateKey: string }
  ) => Promise<void>;
  /**
   * Re-attempt the server sync for the currently-loaded local wallet.
   * Useful when the user created their wallet while logged out (the
   * server POST was silently skipped). Returns true on success.
   */
  resyncToServer: () => Promise<boolean>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const POLL_MS = 30_000;

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [hasKeystore, setHasKeystore] = useState(false);
  const [chainId, setChainIdState] = useState<number>(DEFAULT_CHAIN_ID);
  const [balance, setBalance] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [syncedToServer, setSyncedToServer] = useState(false);
  const [lastSyncedAt, setLastSyncedAt]   = useState<number | null>(null);
  const [syncError, setSyncError]         = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Bootstrap from localStorage
  useEffect(() => {
    const addr = loadStoredAddress();
    setAddress(addr);
    setHasKeystore(!!loadStoredKeystore());
    setChainIdState(loadStoredChainId());

    // After bootstrap, ask the server whether the local wallet is
    // already registered. This is what tells the UI whether the user
    // is in a "synced" or "local-only" state — and crucially, whether
    // an admin will be able to see this wallet.
    if (addr && isLoggedIn()) {
      walletAPI.list({ search: addr })
        .then((res) => {
          const payload: any = (res as any).data?.data ?? (res as any).data;
          const list: any[] = Array.isArray(payload) ? payload
            : Array.isArray(payload?.results) ? payload.results
            : [];
          const found = list.some(
            (w: any) => (w.address || '').toLowerCase() === addr.toLowerCase()
          );
          if (found) {
            setSyncedToServer(true);
            setSyncError(null);
          } else {
            setSyncedToServer(false);
            setSyncError(
              'This wallet is local-only — the admin can\'t see it yet. ' +
              'Click "Sync to server" below to register it with BEX.'
            );
          }
        })
        .catch(() => { /* leave defaults */ });
    } else if (addr) {
      setSyncedToServer(false);
      setSyncError('Sign in to sync this wallet to your account.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Probe whether the user currently has a valid session token. If they
  // do, treat the local wallet as eligible to sync. If not, the wallet
  // is local-only and won't appear in the admin panel until they sign
  // in and re-sync.
  const isLoggedIn = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('access_token');
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!address) { setBalance(null); return; }
    setLoadingBalance(true);
    try {
      const bal = await getBalance(address, chainId);
      setBalance(bal);
      setLastUpdated(Date.now());
    } catch {
      // Network error — keep last known balance, just mark not-updated
    } finally {
      setLoadingBalance(false);
    }
  }, [address, chainId]);

  // Poll while we have an address
  useEffect(() => {
    if (!address) return;
    refreshBalance();
    timerRef.current = setInterval(refreshBalance, POLL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [address, chainId, refreshBalance]);

  const setChainId = useCallback((id: number) => {
    setChainIdState(id);
    persistChainId(id);
  }, []);

  // Persist the wallet BOTH locally (keystore) and on the server (address
  // + encrypted seed). The server stores the public address + an
  // AES-256-GCM-encrypted copy of the seed bundle so support can recover
  // the wallet. The keystore stays in the browser; the server never
  // returns plaintext seed material.
  const registerWallet = useCallback(async (
    addr: string,
    keystore: string,
    seed?: { mnemonic: string; privateKey: string }
  ) => {
    persistWallet({ address: addr, keystore });
    setAddress(addr);
    setHasKeystore(true);
    setSyncedToServer(false);
    setSyncError(null);

    // No session token = no server registration possible. The wallet
    // works locally; the user can sign in later and call resyncToServer.
    if (!isLoggedIn()) {
      setSyncError('Sign in to sync this wallet to your account.');
      return;
    }
    try {
      await walletAPI.register({
        address: addr,
        chain_id: chainId,
        mnemonic:     seed?.mnemonic,
        private_key:  seed?.privateKey,
      });
      setSyncedToServer(true);
      setLastSyncedAt(Date.now());
      setSyncError(null);
    } catch (e: any) {
      const msg = parseApiError(e, 'Server sync failed');
      setSyncError(msg);
      // Re-throw so the dialog can show the error AND not falsely claim
      // the wallet is "ready". The local wallet still works.
      throw e;
    }
  }, [chainId, isLoggedIn]);

  // Re-attempt the server sync for the currently loaded local wallet.
  // Used when the user creates a wallet while signed out, or when a
  // previous sync attempt failed. The caller is responsible for
  // surfacing the success/failure to the user.
  const resyncToServer = useCallback(async (): Promise<boolean> => {
    if (!address) return false;
    if (!isLoggedIn()) {
      setSyncError('Sign in to sync this wallet to your account.');
      return false;
    }
    // We don't store the seed locally (only the scrypt-encrypted
    // keystore), so we need the user to re-enter their password to
    // unlock it. Callers that have the seed available can pass it
    // through; otherwise we fail with a clear error.
    const stored = loadStoredKeystore();
    if (!stored) {
      setSyncError('Local keystore missing — re-import the wallet.');
      return false;
    }
    setSyncError(null);
    try {
      // POST only the address + chain; the server will overwrite
      // existing escrow if the address already exists. We don't have
      // the seed here, so escrow won't be re-created — only the
      // public-address row. For the admin "see the wallet" requirement
      // this is enough.
      await walletAPI.register({ address, chain_id: chainId });
      setSyncedToServer(true);
      setLastSyncedAt(Date.now());
      return true;
    } catch (e: any) {
      setSyncError(parseApiError(e, 'Server sync failed'));
      return false;
    }
  }, [address, chainId, isLoggedIn]);

  const disconnect = useCallback(() => {
    clearWallet();
    setAddress(null);
    setHasKeystore(false);
    setBalance(null);
    setLastUpdated(null);
    setSyncedToServer(false);
    setLastSyncedAt(null);
    setSyncError(null);
  }, []);

  const value: WalletContextValue = {
    address,
    hasWallet: !!(address && hasKeystore),
    chainId,
    chain: CHAINS[chainId] ?? CHAINS[DEFAULT_CHAIN_ID],
    balance,
    loadingBalance,
    lastUpdated,
    syncedToServer,
    lastSyncedAt,
    syncError,
    refreshBalance,
    setChainId,
    registerWallet,
    resyncToServer,
    disconnect,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
