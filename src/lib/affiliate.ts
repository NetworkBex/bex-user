/**
 * BEX Network — Ambassador / Partner Compensation Programme.
 *
 * Types describe the shape the backend returns at /api/affiliate/*.
 * The DEFAULT_PLAN below is a faithful encoding of the published policy —
 * it is the same data the backend serves at /api/affiliate/plan/. It lives
 * here so the UI renders correctly the moment a page mounts, and is
 * automatically overridden the second the live plan loads from the server.
 *
 * Every monetary or threshold value should be considered DATA, not code:
 * the entire object can be replaced by an admin without touching the UI.
 */

/* ─── Types (the API contract) ───────────────────────────────────── */

export type RankKey = 'founder' | 'affiliate' | 'associate' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'crown';

export interface Rank {
  key: RankKey;
  shortKey: 'F' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7';
  title: string;
  ornament: string;            // ✦ ✦✦ ◆ ♛ — purely cosmetic
  directRequired: number;
  teamVolumeUsd: number;
  personalInvestUsd: number;
  unlockedLevels: number;      // L1..N — N = number of levels open
  lrpTier: 0 | 1 | 2;          // 0 = not in pool
}

export interface UnilevelLevel {
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  relationship: string;
  rate: number;                // % of Partner Pool — e.g. 40, 20, 12
  unlockRank: RankKey;
}

export interface FastStartTier {
  id: string;
  windowDays: number;
  directRequired: number;
  minimumPerDirectUsd: number;
  cashBonusUsd: number;
  tokenBonus: number;          // $BEX
}

export interface MatchTier {
  fromRank: RankKey;
  matchPercent: number;        // % match on L1 partners' residuals
}

export interface RankBonus {
  rank: RankKey;
  cashUsd: number;             // monthly
  tokenBex: number;            // monthly $BEX
}

export interface MilestoneGift {
  rank: RankKey;
  valueUsd: number;
  description: string;
}

export interface LrpTier {
  rank: RankKey;
  tier: 1 | 2;
  allocationPercent: number;   // share of the LRP pool
}

export interface FoundingPartner {
  slotsTotal: number;
  slotsFilled: number;         // updated by backend; default to 0
  preLaunchTokenPrice: number; // USD per $BEX
  tgePrice: number;            // USD per $BEX
  l1CommissionRateBoost: number; // % — e.g. 45 vs 40
  rateLockMonths: number;      // months
  pricingTiers: Array<{ minInvestUsd: number; tokensAwarded: number }>;
}

export interface CompensationPlan {
  /** Token branding — the doc used $QTA; BEX uses $BEX. Server can override. */
  tokenTicker: string;
  /** % of net trading profits taken as the management fee. */
  managementFeePercent: number;
  /** % of management fee allocated to the partner commission pool. */
  partnerPoolSharePercent: number;
  /** Single-leg cap to force broad team building. */
  maxLegContributionPercent: number;
  /** Minimum active investor balance to count toward team volume. */
  activeInvestorMinUsd: number;
  /** Days in the Fast-Start window. */
  fastStartWindowDays: number;
  ranks: Rank[];
  unilevel: UnilevelLevel[];
  fastStart: FastStartTier[];
  matching: MatchTier[];
  rankBonuses: RankBonus[];
  milestones: MilestoneGift[];
  lrpAllocation: LrpTier[];
  /** % of platform fee that funds the LRP. */
  lrpFundingPercent: number;
  founding: FoundingPartner;
  /** Compliance bullet list — versioned with the plan. */
  compliance: string[];
  /** Payout cadence — informational. */
  payoutCadence: string;
}

/** The user's live position within the plan. */
export interface AffiliateMe {
  rank: RankKey;
  qualifiedSince: string | null;
  directReferrals: number;       // active directs
  teamVolumeUsd: number;
  personalInvestUsd: number;
  unlockedLevels: number;
  tokenBalance: number;          // $BEX
  isFoundingPartner: boolean;
  /** Days remaining in the Fast-Start window (0 if expired). */
  fastStartDaysRemaining: number;
  /** Optional next-rank progress, server-computed. */
  nextRank?: { key: RankKey; progressPercent: number };
}

export interface EarningsBreakdown {
  residualsUsd: number;
  matchingUsd: number;
  lrpUsd: number;
  rankBonusUsd: number;
  fastStartUsd: number;
  tokenAwarded: number;
  totalUsd: number;
  /** When applicable, last 6 months of monthly totals for the trend chart. */
  trend?: Array<{ month: string; usd: number }>;
}

export interface LevelStanding {
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  activeInvestors: number;
  volumeUsd: number;
  monthlyCommissionUsd: number;
}

export interface LrpSnapshot {
  poolSizeUsd: number;
  tier1Qualifiers: number;
  tier2Qualifiers: number;
  myMonthlyShareUsd: number;
}

export interface CommissionEntry {
  id: string | number;
  date: string;
  source: 'residual' | 'matching' | 'lrp' | 'rank_bonus' | 'fast_start' | 'token';
  level?: number;
  fromUser?: string;
  amountUsd: number;
}

export interface FastStartStatus {
  windowDays: number;
  daysRemaining: number;
  directsSoFar: number;
  tiersAchieved: string[];   // FastStartTier.id list
  /** When eligible, next tier's missing directs. */
  nextTier?: { id: string; directsNeeded: number };
}

/* ─── Default plan — mirrors the published policy ────────────────── */

export const DEFAULT_PLAN: CompensationPlan = {
  tokenTicker: 'BEX',
  managementFeePercent: 20,
  partnerPoolSharePercent: 45,
  maxLegContributionPercent: 40,
  activeInvestorMinUsd: 500,
  fastStartWindowDays: 60,
  payoutCadence: 'Distributed on the 1st and 16th of each month.',

  ranks: [
    { key: 'founder',   shortKey: 'F',  title: 'Founder',   ornament: '',     directRequired: 0,   teamVolumeUsd: 0,          personalInvestUsd: 500,    unlockedLevels: 1, lrpTier: 0 },
    { key: 'affiliate', shortKey: 'R1', title: 'Affiliate', ornament: '',     directRequired: 3,   teamVolumeUsd: 15_000,     personalInvestUsd: 500,    unlockedLevels: 2, lrpTier: 0 },
    { key: 'associate', shortKey: 'R2', title: 'Associate', ornament: '',     directRequired: 7,   teamVolumeUsd: 50_000,     personalInvestUsd: 1_000,  unlockedLevels: 3, lrpTier: 0 },
    { key: 'silver',    shortKey: 'R3', title: 'Silver',    ornament: '✦',    directRequired: 15,  teamVolumeUsd: 150_000,    personalInvestUsd: 2_500,  unlockedLevels: 4, lrpTier: 0 },
    { key: 'gold',      shortKey: 'R4', title: 'Gold',      ornament: '✦✦',   directRequired: 30,  teamVolumeUsd: 500_000,    personalInvestUsd: 5_000,  unlockedLevels: 5, lrpTier: 0 },
    { key: 'platinum',  shortKey: 'R5', title: 'Platinum',  ornament: '✦✦✦',  directRequired: 60,  teamVolumeUsd: 1_500_000,  personalInvestUsd: 10_000, unlockedLevels: 6, lrpTier: 0 },
    { key: 'diamond',   shortKey: 'R6', title: 'Diamond',   ornament: '◆',    directRequired: 100, teamVolumeUsd: 5_000_000,  personalInvestUsd: 25_000, unlockedLevels: 7, lrpTier: 1 },
    { key: 'crown',     shortKey: 'R7', title: 'Crown',     ornament: '♛',    directRequired: 200, teamVolumeUsd: 15_000_000, personalInvestUsd: 50_000, unlockedLevels: 7, lrpTier: 2 },
  ],

  unilevel: [
    { level: 1, relationship: 'Direct referrals',  rate: 40, unlockRank: 'founder'  },
    { level: 2, relationship: 'Their referrals',   rate: 20, unlockRank: 'affiliate'},
    { level: 3, relationship: '3rd generation',    rate: 12, unlockRank: 'associate'},
    { level: 4, relationship: '4th generation',    rate:  7, unlockRank: 'silver'   },
    { level: 5, relationship: '5th generation',    rate:  5, unlockRank: 'gold'     },
    { level: 6, relationship: '6th generation',    rate:  3, unlockRank: 'platinum' },
    { level: 7, relationship: '7th generation',    rate:  2, unlockRank: 'diamond'  },
  ],

  fastStart: [
    { id: 'fs_3_30',  windowDays: 30, directRequired:  3, minimumPerDirectUsd: 1_000, cashBonusUsd:   300, tokenBonus:      0 },
    { id: 'fs_5_30',  windowDays: 30, directRequired:  5, minimumPerDirectUsd: 1_000, cashBonusUsd:   600, tokenBonus:  5_000 },
    { id: 'fs_10_60', windowDays: 60, directRequired: 10, minimumPerDirectUsd: 1_000, cashBonusUsd: 1_500, tokenBonus: 15_000 },
    { id: 'fs_20_60', windowDays: 60, directRequired: 20, minimumPerDirectUsd: 1_000, cashBonusUsd: 4_000, tokenBonus: 50_000 },
  ],

  matching: [
    { fromRank: 'gold',     matchPercent: 15 },
    { fromRank: 'platinum', matchPercent: 25 },
    { fromRank: 'diamond',  matchPercent: 35 },
    { fromRank: 'crown',    matchPercent: 50 },
  ],

  rankBonuses: [
    { rank: 'affiliate', cashUsd:    100, tokenBex:    1_000 },
    { rank: 'associate', cashUsd:    250, tokenBex:    2_500 },
    { rank: 'silver',    cashUsd:    500, tokenBex:    5_000 },
    { rank: 'gold',      cashUsd:  1_200, tokenBex:   15_000 },
    { rank: 'platinum',  cashUsd:  3_000, tokenBex:   40_000 },
    { rank: 'diamond',   cashUsd:  7_500, tokenBex:  100_000 },
    { rank: 'crown',     cashUsd: 20_000, tokenBex:  300_000 },
  ],

  milestones: [
    { rank: 'silver',   valueUsd:   1_500, description: 'MacBook Pro 14" (M-series) — shipped or equivalent cash value.' },
    { rank: 'gold',     valueUsd:   4_500, description: 'Business-class return flight + 5-night luxury resort stay (partner choice of destination).' },
    { rank: 'platinum', valueUsd:  12_000, description: 'Rolex Oyster Perpetual or equivalent prestige timepiece + $2K gift card.' },
    { rank: 'diamond',  valueUsd:  40_000, description: 'Luxury bundle — Hermès luggage set + $15K travel credit + $15K accessories + $10K in $BEX.' },
    { rank: 'crown',    valueUsd: 150_000, description: 'Bespoke: Patek Philippe or equivalent + private retreat for partner + 5 guests + 1,000,000 $BEX allocation.' },
  ],

  lrpAllocation: [
    { rank: 'diamond', tier: 1, allocationPercent: 40 },
    { rank: 'crown',   tier: 2, allocationPercent: 60 },
  ],
  lrpFundingPercent: 5,

  founding: {
    slotsTotal: 50,
    slotsFilled: 0,
    preLaunchTokenPrice: 0.005,
    tgePrice: 0.01,
    l1CommissionRateBoost: 45,
    rateLockMonths: 24,
    pricingTiers: [
      { minInvestUsd:  5_000, tokensAwarded:   500_000 },
      { minInvestUsd: 25_000, tokensAwarded: 3_000_000 },
    ],
  },

  compliance: [
    'Never guarantee returns. Illustrative projections must be clearly marked as estimates.',
    'Never quote exact percentages as guaranteed. "Targets 20–30% per month" is acceptable; "you will earn 25% monthly" is not.',
    'Marketing collateral must be approved by Compliance or drawn from the official Partner Asset Library.',
    'Every investor you refer must complete KYC. Unverified investors do not count toward team volume.',
    'Income screenshots may only display your own verified earnings — never another partner\'s figures.',
    'You may explain the platform, but you may not provide financial advice or recommend investment amounts.',
  ],
};

/* ─── Helpers ─────────────────────────────────────────────────────── */

export function rankByKey(plan: CompensationPlan, key: RankKey): Rank {
  return plan.ranks.find((r) => r.key === key) ?? plan.ranks[0];
}

export function nextRankOf(plan: CompensationPlan, key: RankKey): Rank | null {
  const idx = plan.ranks.findIndex((r) => r.key === key);
  if (idx < 0 || idx >= plan.ranks.length - 1) return null;
  return plan.ranks[idx + 1];
}

export function levelUnlocked(plan: CompensationPlan, userRank: RankKey, level: number): boolean {
  const r = rankByKey(plan, userRank);
  return level <= r.unlockedLevels;
}

export function matchingFor(plan: CompensationPlan, userRank: RankKey): MatchTier | null {
  // Highest tier the user has reached.
  const order = plan.ranks.map((r) => r.key);
  const userIdx = order.indexOf(userRank);
  let best: MatchTier | null = null;
  for (const m of plan.matching) {
    const idx = order.indexOf(m.fromRank);
    if (idx !== -1 && idx <= userIdx) best = m;
  }
  return best;
}

export function lrpTierFor(plan: CompensationPlan, userRank: RankKey): LrpTier | null {
  return plan.lrpAllocation.find((t) => t.rank === userRank) ?? null;
}

export function rankBonusFor(plan: CompensationPlan, userRank: RankKey): RankBonus | null {
  return plan.rankBonuses.find((b) => b.rank === userRank) ?? null;
}
