import React from 'react';
import { CreditCard, Check, AlertCircle } from 'lucide-react';
import { PLAN_LIMITS, getEffectivePlan, getEffectiveBillingCycle } from '../../lib/utils';
import { getPlanLeadLimit } from '../../lib/leadLimits';
import { getAiCreditLimit } from '../../lib/aiCredits';

export default function BillingPanel({
  currentUser,
  cancelSuccessMsg,
  cancelErrorMsg,
  leadsCount,
  templatesCount,
  aiUsage,
  isProOwner,
  teamLoading,
  seatsUsed,
  seatLimit,
  seatsAtCap,
  onManagePlan,
  onCancelSubscription,
}) {
  const planKey = getEffectivePlan(currentUser);
  const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.trial;
  const maxLeads = getPlanLeadLimit(planKey, getEffectiveBillingCycle(currentUser)) ?? limits.leads;
  const maxTemplates = limits.templates;
  const maxAi = aiUsage.limit || getAiCreditLimit(planKey);

  return (
    <div className="card flex-col gap-3">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
        <CreditCard size={18} style={{ color: 'var(--accent-blue)' }} />
        <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Billing &amp; Subscription</h3>
      </div>

      {cancelSuccessMsg && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Check size={15} style={{ flexShrink: 0 }} />
          <span>{cancelSuccessMsg}</span>
        </div>
      )}

      {cancelErrorMsg && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(224, 82, 82, 0.1)', border: '1px solid rgba(224, 82, 82, 0.2)', color: 'var(--status-hot)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{cancelErrorMsg}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', minWidth: '100px' }}>Current Plan</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
            {currentUser?.plan || 'Trial'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', minWidth: '100px' }}>Status</span>
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            padding: '2px 10px',
            borderRadius: '3px',
            background: currentUser?.plan_status === 'active'
              ? 'rgba(16, 185, 129, 0.1)'
              : 'rgba(245, 158, 11, 0.1)',
            color: currentUser?.plan_status === 'active'
              ? '#10b981'
              : 'var(--warning-color)',
            border: `1px solid ${
              currentUser?.plan_status === 'active'
                ? '#10b981'
                : 'rgba(245, 158, 11, 0.4)'
            }`,
          }}
          >
            {currentUser?.plan_status === 'active'
              ? 'Active'
              : currentUser?.plan_status === 'cancelling'
                ? 'Cancelling'
                : currentUser?.plan === 'trial'
                  ? 'Trial'
                  : 'Inactive'}
          </span>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Leads</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {leadsCount} / {maxLeads === Infinity || maxLeads === null ? 'Unlimited' : maxLeads.toLocaleString()}
            </span>
          </div>
          <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: 'var(--accent-blue)',
              width: `${maxLeads === Infinity || maxLeads === null ? 0 : Math.min(100, (leadsCount / maxLeads) * 100)}%`,
              borderRadius: '4px',
            }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Templates</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {templatesCount} / {maxTemplates === Infinity || maxTemplates === null ? 'Unlimited' : maxTemplates}
            </span>
          </div>
          <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: 'var(--accent-blue)',
              width: `${maxTemplates === Infinity || maxTemplates === null ? 0 : Math.min(100, (templatesCount / maxTemplates) * 100)}%`,
              borderRadius: '4px',
            }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>AI credits {planKey === 'trial' ? '(trial)' : '(this month)'}</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {aiUsage.loading ? '…' : `${aiUsage.used} / ${maxAi}`}
            </span>
          </div>
          <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: 'var(--accent-blue)',
              width: `${maxAi ? Math.min(100, (aiUsage.used / maxAi) * 100) : 0}%`,
              borderRadius: '4px',
            }}
            />
          </div>
        </div>

        {isProOwner && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Team seats</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {teamLoading ? '…' : `${seatsUsed} / ${seatLimit}`}
              </span>
            </div>
            <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                background: seatsAtCap ? 'var(--warning-color)' : 'var(--accent-blue)',
                width: `${Math.min(100, (seatsUsed / seatLimit) * 100)}%`,
                borderRadius: '4px',
              }}
              />
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
        <button type="button" className="btn btn-primary" onClick={onManagePlan}>
          <CreditCard size={15} /> Manage Plan
        </button>

        {currentUser?.plan_status === 'active' && currentUser?.paddle_subscription_id && (
          <button
            type="button"
            onClick={onCancelSubscription}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--status-hot)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              padding: 0,
              marginTop: '0.25rem',
              textDecoration: 'underline',
              fontFamily: 'inherit',
            }}
          >
            Cancel Subscription
          </button>
        )}
      </div>
    </div>
  );
}
