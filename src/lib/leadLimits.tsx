/**
 * ReachDesk — plan-based lead/template limit UI
 * Pair this with the DB-level enforcement trigger (check_lead_limit / check_template_limit).
 * The DB is the source of truth; this hook mirrors the same numbers so the UI
 * can warn *before* the user hits the wall, and shows a clean modal *when* they do.
 *
 * Drop into your ReachDesk React app. Uses your existing supabase client —
 * replace the import path below with wherever yours lives.
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase' // matches src/lib/supabase.js

// ---- Plan config -----------------------------------------------------
// null = no cap enforced. These are BASE limits (monthly billing).
// Yearly billing_cycle doubles the lead limit — see getPlanLeadLimit() below.
// Mirrors the CASE branches in check_lead_limit() / check_template_limit() in Supabase —
// keep both in sync if these numbers change.
export const PLAN_LIMITS: Record<string, { leads: number | null; templates: number | null }> = {
  trial:      { leads: 65,   templates: 2 },
  starter:    { leads: 1000, templates: 10 },
  pro:        { leads: 5000, templates: null }, // unlimited templates on Pro
  teams:      { leads: null, templates: null }, // unlimited leads + templates on Teams
  enterprise: { leads: null, templates: null },
}

/** Yearly billing doubles the base lead limit. Templates are not affected. */
export function getPlanLeadLimit(plan: string | null, billingCycle: string | null): number | null {
  const base = plan ? PLAN_LIMITS[plan]?.leads ?? null : null
  if (base === null) return null
  return (billingCycle ?? '').toLowerCase() === 'yearly' ? base * 2 : base
}

export const NEXT_PLAN: Record<string, string> = {
  trial: 'Starter',
  starter: 'Pro',
  pro: 'Teams',
  teams: 'Enterprise',
}

const LOW_THRESHOLD = 10 // show the warning banner once this many or fewer remain

// ---- Hook --------------------------------------------------------------

interface LimitStatus {
  loading: boolean
  plan: string | null
  leadCount: number
  leadLimit: number | null
  leadsRemaining: number | null   // null = unlimited
  isNearLeadLimit: boolean
  isAtLeadLimit: boolean
  refresh: () => void
}

export function useLeadLimitStatus(userId: string | undefined): LimitStatus {
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<string | null>(null)
  const [leadCount, setLeadCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    const [{ data: profile }, { count }] = await Promise.all([
      supabase.from('user_profiles').select('plan, billing_cycle').eq('id', userId).single(),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ])

    setPlan(profile?.plan ?? null)
    setBillingCycle(profile?.billing_cycle ?? null)
    setLeadCount(count ?? 0)
    setLoading(false)
  }, [userId])

  useEffect(() => { refresh() }, [refresh])

  const leadLimit = getPlanLeadLimit(plan, billingCycle)
  const leadsRemaining = leadLimit === null ? null : Math.max(leadLimit - leadCount, 0)
  const isAtLeadLimit = leadLimit !== null && leadCount >= leadLimit
  const isNearLeadLimit = leadsRemaining !== null && leadsRemaining > 0 && leadsRemaining <= LOW_THRESHOLD

  return { loading, plan, leadCount, leadLimit, leadsRemaining, isNearLeadLimit, isAtLeadLimit, refresh }
}


// ---- Persistent top bar — shown continuously while AT the limit ---------
// Unlike the toast (transient, countdown, fires per-add), this stays visible
// on every page load until the user upgrades or cleans up. Mount it once,
// high in your app layout — it reads status itself and shows/hides on its own.

export function LeadLimitTopBar({
  status,
  onExport,
  onUpgrade,
  onCleanup,
}: {
  status: LimitStatus
  onExport: () => void
  onUpgrade: () => void
  onCleanup: () => void
}) {
  if (status.loading || !status.isAtLeadLimit) return null

  return (
    <div
      style={{
        width: '100%',
        background: '#E0525215',
        borderBottom: '1px solid #E05252',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        flexWrap: 'wrap',
        fontFamily: 'Inter, sans-serif',
        fontSize: 13,
        color: '#E05252',
        zIndex: 1600,
        position: 'sticky',
        top: 0,
      }}
    >
      <span style={{ fontWeight: 600 }}>
        Lead limit reached — export your leads to save them, then upgrade or do a quick cleanup.
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onExport} style={{ background: 'transparent', color: '#E05252', border: '1px solid #E0525260', borderRadius: 3, padding: '4px 10px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
          Export leads
        </button>
        <button onClick={onCleanup} style={{ background: 'transparent', color: '#E6EDF3', border: '1px solid #21262D', borderRadius: 3, padding: '4px 10px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
          Quick cleanup
        </button>
        <button onClick={onUpgrade} style={{ background: '#5B8FB9', color: '#0D1117', border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
          Upgrade
        </button>
      </div>
    </div>
  )
}

// ---- Countdown toast — fires once per successful add while <=10 remain ---
// NOT a persistent banner. Call showLeadCountdownToast() manually right after
// a successful lead insert (see wiring example at the bottom of this file).
// It auto-dismisses after a few seconds; the next add (if still <=10 remain)
// pops it again with the updated count, giving the "countdown" feel.

export function LeadLimitToast({
  remaining,
  onUpgrade,
  onCleanup,
  onDismiss,
  autoHideMs = 6000,
}: {
  remaining: number
  onUpgrade: () => void
  onCleanup: () => void
  onDismiss: () => void
  autoHideMs?: number
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, autoHideMs)
    return () => clearTimeout(t)
  }, [remaining, autoHideMs, onDismiss])

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        maxWidth: 340,
        background: '#0D1117',
        border: '1px solid #E0525240',
        borderRadius: 3,
        padding: '14px 16px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        zIndex: 1500,
        fontFamily: 'Inter, sans-serif',
        animation: 'reachdesk-toast-in 0.2s ease-out',
      }}
    >
      <div style={{ color: '#E05252', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
        {remaining} lead{remaining === 1 ? '' : 's'} remaining
      </div>
      <div style={{ color: '#8B949E', fontSize: 12.5, lineHeight: 1.5, marginBottom: 10 }}>
        You're close to your plan's lead limit. Upgrade or do a quick cleanup to keep adding leads.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onCleanup}
          style={{ background: 'transparent', color: '#E6EDF3', border: '1px solid #21262D', borderRadius: 3, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
        >
          Quick cleanup
        </button>
        <button
          onClick={onUpgrade}
          style={{ background: '#5B8FB9', color: '#0D1117', border: 'none', borderRadius: 3, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
        >
          Upgrade
        </button>
      </div>
    </div>
  )
}

/** Helper: does this remaining count warrant showing the toast? */
export function shouldShowCountdownToast(remaining: number | null): remaining is number {
  return remaining !== null && remaining > 0 && remaining <= LOW_THRESHOLD
}

// ---- Blocking modal (shown when the add-lead action is actually rejected) --

export function LeadLimitModal({
  open,
  plan,
  limit,
  onCleanup,
  onUpgrade,
  onClose,
}: {
  open: boolean
  plan: string
  limit: number
  onCleanup: () => void
  onUpgrade: () => void
  onClose: () => void
}) {
  if (!open) return null
  const nextPlan = NEXT_PLAN[plan] ?? 'a higher plan'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0D1117',
          border: '1px solid #21262D',
          borderRadius: 3,
          padding: 32,
          maxWidth: 420,
          width: '90%',
          fontFamily: 'Inter, sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ color: '#E05252', fontSize: 15, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Lead limit reached
        </div>
        <p style={{ color: '#E6EDF3', fontSize: 14.5, lineHeight: 1.6, marginBottom: 24 }}>
          You've hit your plan's limit of {limit} leads. You won't be able to add more until you
          do a quick cleanup or upgrade to <strong>{nextPlan}</strong>.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={onCleanup}
            style={{
              background: 'transparent',
              color: '#E6EDF3',
              border: '1px solid #21262D',
              borderRadius: 3,
              padding: '10px 18px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Quick cleanup
          </button>
          <button
            onClick={onUpgrade}
            style={{
              background: '#5B8FB9',
              color: '#0D1117',
              border: 'none',
              borderRadius: 3,
              padding: '10px 18px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Upgrade to {nextPlan}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Bulk CSV import: truncate to remaining quota, warn about the rest ---

export async function getRemainingLeadQuota(userId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc('get_remaining_lead_quota', { p_user_id: userId })
  if (error) throw error
  return data // null = unlimited
}

/**
 * Call this BEFORE inserting a parsed CSV batch.
 * Slices the batch to what actually fits, and tells you how many were skipped
 * so you can show BulkImportLimitModal.
 */
export async function prepareBulkImport(userId: string, parsedLeads: any[]) {
  const remaining = await getRemainingLeadQuota(userId)
  if (remaining === null) {
    return { toImport: parsedLeads, skippedCount: 0 }
  }
  const toImport = parsedLeads.slice(0, remaining)
  const skippedCount = parsedLeads.length - toImport.length
  return { toImport, skippedCount }
}

export function BulkImportLimitModal({
  open,
  importedCount,
  skippedCount,
  plan,
  onCleanup,
  onUpgrade,
  onClose,
}: {
  open: boolean
  importedCount: number
  skippedCount: number
  plan: string
  onCleanup: () => void
  onUpgrade: () => void
  onClose: () => void
}) {
  if (!open) return null
  const nextPlan = NEXT_PLAN[plan] ?? 'a higher plan'

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#0D1117', border: '1px solid #21262D', borderRadius: 3, padding: 32, maxWidth: 440, width: '90%', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}
      >
        <div style={{ color: '#E05252', fontSize: 15, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Import limit reached
        </div>
        <p style={{ color: '#E6EDF3', fontSize: 14.5, lineHeight: 1.6, marginBottom: 24 }}>
          {importedCount} lead{importedCount === 1 ? '' : 's'} imported. The remaining {skippedCount} lead{skippedCount === 1 ? '' : 's'} {skippedCount === 1 ? 'was' : 'were'} skipped because it would exceed your plan's lead limit.
          Do a quick cleanup or upgrade to <strong>{nextPlan}</strong> to import the rest.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onCleanup} style={{ background: 'transparent', color: '#E6EDF3', border: '1px solid #21262D', borderRadius: 3, padding: '10px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
            Quick cleanup
          </button>
          <button onClick={onUpgrade} style={{ background: '#5B8FB9', color: '#0D1117', border: 'none', borderRadius: 3, padding: '10px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
            Upgrade to {nextPlan}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Example wiring into your "Add Lead" flow ---------------------------
//
// const status = useLeadLimitStatus(userId)
//
// // Mount once, near the top of your app layout — shows itself automatically
// // whenever the user is actually at their limit, on every page load:
// <LeadLimitTopBar
//   status={status}
//   onExport={() => triggerLeadsExport()}
//   onCleanup={() => navigate('/leads?sort=oldest')}
//   onUpgrade={() => navigate('/upgrade')}
// />
//
// const [showLimitModal, setShowLimitModal] = useState(false)
// const [toastRemaining, setToastRemaining] = useState<number | null>(null)
//
// async function handleAddLead(leadData) {
//   const { error } = await supabase.from('leads').insert(leadData)
//   if (error?.message?.includes('Lead limit reached')) {
//     setShowLimitModal(true)   // DB already blocked it — just show the modal
//     return
//   }
//   await status.refresh()
//   // fire the countdown toast if we're now close to the limit
//   const remaining = await getRemainingLeadQuota(userId)
//   if (shouldShowCountdownToast(remaining)) setToastRemaining(remaining)
// }
//
// {toastRemaining !== null && (
//   <LeadLimitToast
//     remaining={toastRemaining}
//     onUpgrade={() => navigate('/upgrade')}
//     onCleanup={() => navigate('/leads?sort=oldest')}
//     onDismiss={() => setToastRemaining(null)}
//   />
// )}
//
// <LeadLimitModal
//   open={showLimitModal}
//   plan={status.plan ?? 'trial'}
//   limit={status.leadLimit ?? 0}
//   onCleanup={() => navigate('/leads?sort=oldest')}
//   onUpgrade={() => navigate('/upgrade')}
//   onClose={() => setShowLimitModal(false)}
// />
//
// ---- Example wiring for CSV bulk import ---------------------------------
//
// const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)
//
// async function handleCsvImport(parsedRows) {
//   const { toImport, skippedCount } = await prepareBulkImport(userId, parsedRows)
//   if (toImport.length > 0) {
//     await supabase.from('leads').insert(toImport)
//   }
//   if (skippedCount > 0) {
//     setImportResult({ imported: toImport.length, skipped: skippedCount })
//   }
//   status.refresh()
// }
//
// <BulkImportLimitModal
//   open={!!importResult}
//   importedCount={importResult?.imported ?? 0}
//   skippedCount={importResult?.skipped ?? 0}
//   plan={status.plan ?? 'trial'}
//   onCleanup={() => navigate('/leads?sort=oldest')}
//   onUpgrade={() => navigate('/upgrade')}
//   onClose={() => setImportResult(null)}
// />
