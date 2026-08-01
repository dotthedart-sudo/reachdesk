import React, { useState } from 'react';
import { Users, LogOut } from 'lucide-react';

export default function TeamPanel({
  isMember = false,
  ownerLabel,
  onOpenTeams,
  onLeaveWorkspace,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState('');

  const handleLeave = async () => {
    if (!onLeaveWorkspace) return;
    setLeaving(true);
    setError('');
    try {
      await onLeaveWorkspace();
      setConfirmOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave workspace.');
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className="card flex-col gap-3">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
        <Users size={18} style={{ color: 'var(--primary-magenta)' }} />
        <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Team workspace</h3>
      </div>

      {isMember ? (
        <>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            You are a member of {ownerLabel ? <strong>{ownerLabel}&apos;s</strong> : 'a team'} workspace.
            Billing and subscription are managed by the workspace owner — not from your account.
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            Leaving removes access to shared team lists. Your personal leads stay on your account and you can subscribe later from Billing.
          </p>
          {error && (
            <p style={{ fontSize: '0.85rem', color: 'var(--status-hot)', margin: 0 }}>{error}</p>
          )}
          {!confirmOpen ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setConfirmOpen(true)}
              style={{ alignSelf: 'flex-start', color: 'var(--status-hot)', borderColor: 'color-mix(in srgb, var(--status-hot) 35%, var(--border))' }}
            >
              <LogOut size={15} /> Leave workspace
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '3px' }}>
              <p style={{ fontSize: '0.85rem', margin: 0, color: 'var(--text-secondary)' }}>
                Leave this workspace? You can rejoin only if the owner invites you again.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirmOpen(false)} disabled={leaving}>
                  Stay
                </button>
                <button type="button" className="btn btn-sm" onClick={handleLeave} disabled={leaving} style={{ color: 'var(--status-hot)' }}>
                  {leaving ? 'Leaving…' : 'Yes, leave workspace'}
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Invite teammates, manage seats, and set sharing permissions from the Teams page.
          </p>
          <div>
            <button type="button" className="btn btn-primary" onClick={onOpenTeams}>
              Open Teams
            </button>
          </div>
        </>
      )}
    </div>
  );
}
