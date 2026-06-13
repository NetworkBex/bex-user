'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { affiliateAPI } from '@/lib/api';
import {
  DEFAULT_PLAN, type AffiliateMe, type CompensationPlan,
  type EarningsBreakdown,
} from '@/lib/affiliate';

interface AmbassadorState {
  plan: CompensationPlan;
  me: AffiliateMe | null;
  earnings: EarningsBreakdown | null;
  loadingMe: boolean;
  loadingEarnings: boolean;
  /** Re-fetch everything from the API. */
  refresh: () => Promise<void>;
}

const Ctx = createContext<AmbassadorState | null>(null);

export function AmbassadorProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<CompensationPlan>(DEFAULT_PLAN);
  const [me, setMe] = useState<AffiliateMe | null>(null);
  const [earnings, setEarnings] = useState<EarningsBreakdown | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingEarnings, setLoadingEarnings] = useState(true);

  const refresh = async () => {
    // Plan — graceful: server may not have it yet; keep the default.
    affiliateAPI.plan().then((res) => {
      if (res?.data && typeof res.data === 'object') setPlan(res.data as CompensationPlan);
    }).catch(() => {});

    setLoadingMe(true);
    affiliateAPI.me()
      .then((res) => setMe(res.data as AffiliateMe))
      .catch(() => setMe(null))
      .finally(() => setLoadingMe(false));

    setLoadingEarnings(true);
    affiliateAPI.earnings()
      .then((res) => setEarnings(res.data as EarningsBreakdown))
      .catch(() => setEarnings(null))
      .finally(() => setLoadingEarnings(false));
  };

  useEffect(() => { refresh(); }, []);

  return (
    <Ctx.Provider value={{ plan, me, earnings, loadingMe, loadingEarnings, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAmbassador(): AmbassadorState {
  const ctx = useContext(Ctx);
  // Pages outside /dashboard/ambassador (e.g. the root dashboard) can still
  // pull ambassador data opportunistically. Return safe defaults so they
  // never throw during static prerender.
  if (!ctx) {
    return {
      plan: DEFAULT_PLAN,
      me: null,
      earnings: null,
      loadingMe: false,
      loadingEarnings: false,
      refresh: async () => {},
    };
  }
  return ctx;
}
