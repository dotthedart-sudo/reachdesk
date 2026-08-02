import React from 'react';
import { Users } from 'lucide-react';
import { normalizePlan } from '../lib/planConfig';

const PLAN_NAMES = {
  starter: 'Starter',
  pro: 'Pro',
  teams: 'Teams',
};

export default function PaidInviteJoinModal({
  open,
  profile,
  loading = false,
  onConfirm,
  onDecline,
}) {
  if (!open) return null;

  const planKey = normalizePlan(profile?.plan);
  const planLabel = PLAN_NAMES[planKey] || planKey;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
        padding: '1rem',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="paid-invite-join-title"
    >
      <div
        className="card flex-col gap-4"
        style={{
          maxWidth: '480px',
          width: '100%',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '3px',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            aria-hidden
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'color-mix(in srgb, var(--accent-blue) 15%, transparent)',
              color: 'var(--accent-blue)',
              flexShrink: 0,
            }}
          >
            <Users size={18} />
          </div>
          <h3
            id="paid-invite-join-title"
            style={{
              fontSize: '1.15rem',
              margin: 0,
              color: 'var(--text-primary)',
              fontFamily: 'Mattone, sans-serif',
            }}
          >
            Join as a team member?
          </h3>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
          You currently have an active <strong style={{ color: 'var(--text-primary)' }}>{planLabel}</strong> plan.
          Accepting this invite makes you a <strong style={{ color: 'var(--text-primary)' }}>member</strong> of
          someone else&apos;s workspace.
        </p>

        <ul
          style={{
            margin: 0,
            paddingLeft: '1.15rem',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.55,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem',
          }}
        >
          <li>App access will follow the workspace owner&apos;s plan while you remain a member (your personal plan will not show as the active product plan).</li>
          <li>Your leads stay yours and remain visible under your account and sharing rules.</li>
          <li>
            Joining does <strong style={{ color: 'var(--text-primary)' }}>not cancel or refund</strong> your
            existing subscription — billing continues until you cancel it yourself.
          </li>
        </ul>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onDecline}
            disabled={loading}
          >
            Not now
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Joining…' : 'Join as member'}
          </button>
        </div>
      </div>
    </div>
  );
}
