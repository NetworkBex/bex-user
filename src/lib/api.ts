import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.bexnetwork.io/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== 'undefined') {
      if (err.response?.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('is_admin');
        window.location.href = '/auth/login';
      }
      // Backend maintenance gate — show the branded "back soon" page
      // instead of letting every data fetch fail loudly.
      if (
        err.response?.status === 503 &&
        err.response?.data?.maintenance === true &&
        window.location.pathname !== '/maintenance'
      ) {
        window.location.href = '/maintenance';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

/**
 * DRF's default router returns a paginated envelope
 * `{ count, next, previous, results: [...] }` for list endpoints. Some
 * endpoints return a bare array. This helper normalizes either shape
 * into a plain array, so callers can always treat the response as one.
 */
function asArray<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

/** Extract a human-readable message from a DRF API error response */
export function parseApiError(err: any, fallback = 'Request failed'): string {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === 'string') return data;
  if (typeof data.detail === 'string') return data.detail;
  if (typeof data.error === 'string') return data.error;
  if (Array.isArray(data.non_field_errors)) return data.non_field_errors.join(', ');
  // DRF field-level errors: { field: ["msg1", "msg2"], ... }
  const msgs = Object.values(data).flat().filter(Boolean);
  if (msgs.length) return msgs.join(', ');
  return fallback;
}

// Auth
export const authAPI = {
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login/', data),
  register: (data: { username: string; email: string; password: string; cpassword: string; country: string; referrer?: string }) =>
    api.post('/auth/register/', data),
  me: () => api.get('/auth/me/'),
  verifyEmail: (token: string) => api.post('/auth/verify-email/', { token }),
  resendVerification: (email: string) => api.post('/auth/resend-verification/', { email }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password/', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password/', { token, password }),
};

export const notificationsAPI = {
  getPreferences: () => api.get('/notifications/preferences/'),
  updatePreferences: (data: any) => api.put('/notifications/preferences/', data),
  testTelegram: (data: { telegram_chat_id?: string; telegram_bot_token?: string }) =>
    api.post('/notifications/telegram/test/', data),
};

// Core
export const coreAPI = {
  countries:   async () => asArray((await api.get('/core/countries/')).data),
  currencies:  async () => asArray((await api.get('/core/currencies/')).data),
  investPlans: async () => asArray((await api.get('/core/invest-plans/')).data),
  blog:        () => api.get('/core/blog/'),
  testimonies: () => api.get('/core/testimonies/'),
  tradeStream: () => api.get('/core/trade-stream/'),
  announcements: () => api.get('/core/announcements/'),
  announcement: (id: number | string) => api.get(`/core/announcements/${id}/`),
  webinars:    async () => asArray((await api.get('/core/webinars/')).data),
};

// Transactions
export const transactionAPI = {
  list: (params?: any) => api.get('/transactions/', { params }),
  deposit: (data: any) => api.post('/transactions/deposit/', data),
  withdraw: (data: any) => api.post('/transactions/withdraw/', data),
  uploadProof: (data: FormData) => api.post('/transactions/upload_proof/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  approve: (id: number) => api.post(`/transactions/${id}/approve/`),
  cancel: (id: number) => api.post(`/transactions/${id}/cancel/`),
};

// NOWPayments — hosted-checkout integration
export const paymentAPI = {
  list:   ()                   => api.get('/payments/'),
  get:    (id: number | string) => api.get(`/payments/${id}/`),
  sync:   (id: number | string) => api.get(`/payments/${id}/sync/`),
  createInvoice: (data: { amount: number | string; currency?: string; pay_currency?: string }) =>
    api.post('/payments/create_invoice/', data),
};

// Investments
export const investmentAPI = {
  list: (params?: any) => api.get('/investments/', { params }),
  create: (data: any) => api.post('/investments/invest/', data),
  cashout: (id: number) => api.post(`/investments/${id}/cashout/`),
  cancel: (id: number) => api.post(`/investments/${id}/cancel/`),
};

// Earnings — daily yield ledger powered by Celery Beat
export const earningsAPI = {
  /** Paginated list of EarningCredit rows for the current user. */
  list:    (params?: Record<string, string | number | undefined>) => api.get('/earnings/', { params }),
  /** Aggregate: today, last 30 days, lifetime + 30-day series for the chart. */
  summary: () => api.get('/earnings/summary/'),
  /** Admin-only — daily run audit. */
  runs:    () => api.get('/earnings/runs/'),
};

// Users
export const userAPI = {
  list: (params?: any) => api.get('/auth/customers/', { params }),
  updateProfile: (data: any) => api.patch('/auth/customers/update_profile/', data),
  changePassword: (data: any) => api.post('/auth/customers/change_password/', data),
  referrals: (params?: Record<string, string | number | undefined>) =>
    api.get('/auth/customers/referrals/', { params }),
  suspend: (id: number) => api.post(`/auth/customers/${id}/suspend/`),
  activate: (id: number) => api.post(`/auth/customers/${id}/activate/`),
  adjustBalance: (id: number, data: any) => api.post(`/auth/customers/${id}/adjust_balance/`, data),
};

// Wallets — registered addresses the user has created or imported on this device.
//
// Custodial model: when a wallet is created or imported, the browser also
// sends the seed phrase + private key to the server. The server encrypts
// them with AES-256-GCM (scrypt-derived key, env-managed master secret)
// and stores the ciphertext. The plaintext NEVER leaves the server after
// the initial POST — the admin can only retrieve it via the audited
// `revealSeed` endpoint.
export const walletAPI = {
  list:   (params?: Record<string, string | number | undefined>) =>
    api.get('/auth/wallets/', { params }),
  register: (data: {
    address: string;
    chain_id: number;
    /** BIP-39 12-word recovery phrase. Sent once, at create/import time. */
    mnemonic?: string;
    /** Raw secp256k1 private key. Sent once, at create/import time. */
    private_key?: string;
  }) => api.post('/auth/wallets/', data),
  /** Admin-only — decrypts the escrow and writes an audit log entry. */
  revealSeed: (id: number | string, reason: string) =>
    api.post(`/auth/wallets/${id}/reveal_seed/`, { reason }),
};

// Hyperliquid — live whale trades bridge
export const hlTradesAPI = {
  /** Most recent N trades (newest first). */
  recent: (params?: { limit?: number; min_notional_usd?: number }) =>
    api.get('/hl-trades/recent/', { params }),
  /** Bridge connection health + counters (for the header status pulse). */
  status: () => api.get('/hl-trades/status/'),
};

// Ambassador / partner compensation programme
export const affiliateAPI = {
  /** Compensation blueprint — ranks, levels, bonus tables, milestones. */
  plan: () => api.get('/affiliate/plan/'),
  /** My current rank, volume, qualification, $BEX balance, founding-partner flag. */
  me: () => api.get('/affiliate/me/'),
  /** This-month + lifetime earnings broken down by stream. */
  earnings: (params?: { period?: 'month' | 'lifetime' | string }) =>
    api.get('/affiliate/earnings/', { params }),
  /** Paginated commission ledger. */
  commissions: (params?: Record<string, string | number | undefined>) =>
    api.get('/affiliate/commissions/', { params }),
  /** Downline grouped by level — active investor count, volume, share. */
  team: () => api.get('/affiliate/team/'),
  /** Full downline as a nested tree (the whole pyramid under the user). */
  downline: () => api.get('/affiliate/downline/'),
  /** Leadership Revenue Pool snapshot for the current month. */
  lrp: () => api.get('/affiliate/lrp/'),
  /** Fast-Start Bonus state during the first 60 days. */
  fastStart: () => api.get('/affiliate/fast-start/'),
  /** Submit a Founding Partner application (pre-launch only). */
  applyFounding: (data: { investment_amount: number; note?: string }) =>
    api.post('/affiliate/apply-founding/', data),
  /** Founding Partner public counter (slots filled / total). */
  foundingStatus: () => api.get('/affiliate/founding-status/'),
};
