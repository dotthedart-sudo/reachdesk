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
    starter: { usdPerMonth: '10.00', usdTotal: '10.00', pkrPerMonth: 450,  pkrTotal: 450,  bdtPerMonth: 197, bdtTotal: 197, badge: null },
    pro:     { usdPerMonth: '21.50', usdTotal: '21.50', pkrPerMonth: 950,  pkrTotal: 950,  bdtPerMonth: 421, bdtTotal: 421, badge: null },
    teams:   { usdPerMonth: '44.00', usdTotal: '44.00', pkrPerMonth: 1950, pkrTotal: 1950, bdtPerMonth: 862, bdtTotal: 862, badge: null },
  },
  quarterly: {
    label: 'Quarterly',
    badge: 'Save up to 20%',
    months: 3,
    starter: { usdPerMonth: '8.00',  usdTotal: '24.00',  pkrPerMonth: 360,  pkrTotal: 1080, bdtPerMonth: 157.33, bdtTotal: 472,  badge: 'Save 20%' },
    pro:     { usdPerMonth: '18.92', usdTotal: '56.76',  pkrPerMonth: 836,  pkrTotal: 2508, bdtPerMonth: 370.33, bdtTotal: 1111, badge: 'Save 12%' },
    teams:   { usdPerMonth: '39.60', usdTotal: '118.80', pkrPerMonth: 1755, pkrTotal: 5265, bdtPerMonth: 776,    bdtTotal: 2328, badge: 'Save 10%' },
  },
  sixMonth: {
    label: '6-Month',
    badge: 'Save up to 25%',
    months: 6,
    starter: { usdPerMonth: '7.50',  usdTotal: '45.00',  pkrPerMonth: 337.5, pkrTotal: 2025, bdtPerMonth: 147.67, bdtTotal: 886,  badge: 'Save 25%' },
    pro:     { usdPerMonth: '17.63', usdTotal: '105.78', pkrPerMonth: 779,   pkrTotal: 4674, bdtPerMonth: 345,    bdtTotal: 2070, badge: 'Save 18%' },
    teams:   { usdPerMonth: '37.40', usdTotal: '224.40', pkrPerMonth: 1657.5, pkrTotal: 9945, bdtPerMonth: 732.83, bdtTotal: 4397, badge: 'Save 15%' },
  },
  yearly: {
    label: 'Yearly',
    badge: 'Save up to 30%',
    months: 12,
    starter: { usdPerMonth: '7.00',   usdTotal: '84.00',  pkrPerMonth: 315,   pkrTotal: 3780,  bdtPerMonth: 137.75, bdtTotal: 1653, badge: 'Save 30%' },
    pro:     { usdPerMonth: '16.125', usdTotal: '193.50', pkrPerMonth: 712.5, pkrTotal: 8550,  bdtPerMonth: 315.5,  bdtTotal: 3786, badge: 'Save 25%' },
    teams:   { usdPerMonth: '35.20',  usdTotal: '422.40', pkrPerMonth: 1560,  pkrTotal: 18720, bdtPerMonth: 689.83, bdtTotal: 8278, badge: 'Save 20%' },
  },
};

/**
 * Convenience: monthly USD price for the Starter plan.
 * Used as fallback when Paddle webhook payload doesn't include a grand_total.
 * Mirror of: BILLING.monthly.starter.usdTotal in Paywalls.jsx
 */
export const STARTER_MONTHLY_USD: string = BILLING.monthly.starter.usdTotal;
