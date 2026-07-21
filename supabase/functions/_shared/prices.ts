/**
 * ─── ReachDesk Shared Pricing Constants ────────────────────────────────────
 *
 * This file is the source of truth for pricing used inside Supabase Edge Functions.
 *
 * ⚠️  SYNC WARNING: The frontend maintains a PARALLEL copy of this data in:
 *     src/components/Paywalls.jsx  →  export const BILLING { ... }
 *
 * Deno edge functions cannot import from React frontend files, and the frontend
 * cannot import from Deno modules — so these two objects must be kept in sync
 * MANUALLY whenever any price, PKR amount, or discount changes.
 *
 * When updating prices here, also update the following in Paywalls.jsx:
 *   - BILLING.monthly.starter.usdPerMonth / usdTotal / pkrPerMonth / pkrTotal  (lines ~13–16)
 *   - BILLING.quarterly.starter.usdPerMonth / usdTotal / pkrPerMonth / pkrTotal (lines ~39–42)
 *   - BILLING.sixMonth.starter.* / pro.* / teams.*                              (lines ~63–82)
 *   - BILLING.yearly.*                                                           (lines ~90–108)
 *   - BILLING.*.badge  (discount badge text)                                     (lines ~35,61,87)
 *
 * ───────────────────────────────────────────────────────────────────────────
 */

export interface PlanPricing {
  priceId: string;
  usdPerMonth: string;
  usdTotal: string;
  pkrPerMonth: number;
  pkrTotal: number;
  bdtPerMonth: number;
  bdtTotal: number;
  badge: string | null;
}

export interface BillingInterval {
  label: string;
  badge: string | null;
  months: number;
  starter: PlanPricing;
  pro: PlanPricing;
  teams: PlanPricing;
}

export interface BillingMap {
  monthly: BillingInterval;
  quarterly: BillingInterval;
  sixMonth: BillingInterval;
  yearly: BillingInterval;
}

export const BILLING: BillingMap = {
  monthly: {
    label: 'Monthly',
    badge: null,
    months: 1,
    starter: { priceId: 'pri_01kw4zrvsjch1j1hm9vqndq7r2', usdPerMonth: '5.00',  usdTotal: '5.00',   pkrPerMonth: 350,  pkrTotal: 350,   bdtPerMonth: 155, bdtTotal: 155, badge: null },
    pro:     { priceId: 'pri_01kw4zwwpdem0gmmxq0jgjvge2', usdPerMonth: '15.00', usdTotal: '15.00',  pkrPerMonth: 950,  pkrTotal: 950,   bdtPerMonth: 421, bdtTotal: 421, badge: null },
    teams:   { priceId: 'pri_01kwj0es4nckpwbnqhsfptmpbz', usdPerMonth: '20.00', usdTotal: '20.00',  pkrPerMonth: 1950, pkrTotal: 1950, bdtPerMonth: 862, bdtTotal: 862, badge: null },
  },
  quarterly: {
    label: 'Quarterly',
    badge: 'Save up to 20%',
    months: 3,
    starter: { priceId: 'pri_01kwen9hya3s4ff5a345x3fan5', usdPerMonth: '4.00',  usdTotal: '12.00',  pkrPerMonth: 280,   pkrTotal: 840,   bdtPerMonth: 124.33, bdtTotal: 373,  badge: 'Save 20%' },
    pro:     { priceId: 'pri_01kwj03nqwt1x8wwcdsm7k0gf7', usdPerMonth: '13.20', usdTotal: '39.60',  pkrPerMonth: 836,   pkrTotal: 2508,  bdtPerMonth: 370.33, bdtTotal: 1111, badge: 'Save 12%' },
    teams:   { priceId: 'pri_01kwj0gqjqzgnsn9rg8wyygctw', usdPerMonth: '18.00', usdTotal: '54.00',  pkrPerMonth: 1755,  pkrTotal: 5265,  bdtPerMonth: 776,    bdtTotal: 2328, badge: 'Save 10%' },
  },
  sixMonth: {
    label: '6-Month',
    badge: 'Save up to 25%',
    months: 6,
    starter: { priceId: 'pri_01kwenc72ad2fnfjks4qxcv8gt', usdPerMonth: '3.75',  usdTotal: '22.50',  pkrPerMonth: 262.5, pkrTotal: 1575,  bdtPerMonth: 115.67, bdtTotal: 694,  badge: 'Save 25%' },
    pro:     { priceId: 'pri_01kwj06cdf68mjc2dv20gzb1n0', usdPerMonth: '12.30', usdTotal: '73.80',  pkrPerMonth: 779,   pkrTotal: 4674,  bdtPerMonth: 345,    bdtTotal: 2070,  badge: 'Save 18%' },
    teams:   { priceId: 'pri_01kwj0jmf5y3mh4djdy33c008k', usdPerMonth: '17.00', usdTotal: '102.00', pkrPerMonth: 1657.5, pkrTotal: 9945,  bdtPerMonth: 732.83, bdtTotal: 4397,  badge: 'Save 15%' },
  },
  yearly: {
    label: 'Yearly',
    badge: 'Save up to 30%',
    months: 12,
    starter: { priceId: 'pri_01kwenh9cqccsbym0m1w6tg3gs', usdPerMonth: '3.50',  usdTotal: '42.00',  pkrPerMonth: 245,   pkrTotal: 2940,  bdtPerMonth: 108.25, bdtTotal: 1299, badge: 'Save 30%' },
    pro:     { priceId: 'pri_01kwj0cex7n1rdaww8fv33afbm', usdPerMonth: '11.25', usdTotal: '135.00', pkrPerMonth: 712.5, pkrTotal: 8550,  bdtPerMonth: 315.5,  bdtTotal: 3786, badge: 'Save 25%' },
    teams:   { priceId: 'pri_01kwj0me8wdfc1mr801971n74y', usdPerMonth: '16.00', usdTotal: '192.00', pkrPerMonth: 1560,  pkrTotal: 18720, bdtPerMonth: 689.83, bdtTotal: 8278, badge: 'Save 20%' },
  },
};

/**
 * Single source of truth helper: Map a Paddle priceId to plan name ('starter' | 'pro' | 'teams').
 * Returns null if priceId does not match any known configured price.
 */
export function getPlanFromPriceId(priceId: string | null | undefined): 'starter' | 'pro' | 'teams' | null {
  if (!priceId) return null;
  const targetId = priceId.trim();
  for (const interval of Object.values(BILLING)) {
    if (interval.starter?.priceId === targetId) return 'starter';
    if (interval.pro?.priceId === targetId) return 'pro';
    if (interval.teams?.priceId === targetId) return 'teams';
  }
  return null;
}

/**
 * Convenience: monthly USD price for the Starter plan.
 * Used as fallback when Paddle webhook payload doesn't include a grand_total.
 * Mirror of: BILLING.monthly.starter.usdTotal in Paywalls.jsx
 */
export const STARTER_MONTHLY_USD: string = BILLING.monthly.starter.usdTotal;
