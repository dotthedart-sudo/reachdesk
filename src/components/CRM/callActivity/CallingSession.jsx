import React, { useEffect, useState } from 'react';
import { Phone, SkipForward, PhoneCall, AlertCircle } from 'lucide-react';
import { CALL_OUTCOMES, leadDisplayName } from '../../../lib/outreachQueue';
import { insertCallAttempt, fetchRecentCallsOnLead } from '../../../lib/callActivity';
import CallWindowBadge from '../CallWindowBadge';
import { getLeadLocalTime } from '../../../lib/leadTimezone';
import LogCallModal from './LogCallModal';

export default function CallingSession({
  queue,
  userId,
  teamId,
  onClose,
  onLogged,
  onOpenLead,
  defaultCountryCode = '+92',
  showNoteSharing = false,
}) {
  const [index, setIndex] = useState(0);
  const [logOpen, setLogOpen] = useState(false);
  const [recentTeamCalls, setRecentTeamCalls] = useState([]);

  const lead = queue[index] || null;
  const remaining = Math.max(0, queue.length - index);
  const localTime = lead ? getLeadLocalTime(lead, new Date(), defaultCountryCode) : null;

  useEffect(() => {
    if (!lead?.id) {
      setRecentTeamCalls([]);
      return;
    }
    fetchRecentCallsOnLead(lead.id, userId, 7)
      .then(setRecentTeamCalls)
      .catch(() => setRecentTeamCalls([]));
  }, [lead?.id, userId]);

  if (!lead) {
    return (
      <div className="card flex-col gap-3" style={{ padding: '2rem', textAlign: 'center', alignItems: 'center' }}>
        <PhoneCall size={28} style={{ color: 'var(--text-muted)' }} />
        <h3 style={{ margin: 0 }}>Queue complete</h3>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          No more leads in this calling session.
        </p>
        <button type="button" className="btn btn-primary" onClick={onClose}>Back to activity</button>
      </div>
    );
  }

  const advance = () => setIndex((i) => i + 1);

  return (
    <div className="card flex-col gap-3" style={{ padding: '1.25rem', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          CALLING SESSION · {remaining} left
        </span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>End session</button>
      </div>

      {recentTeamCalls.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'flex-start',
            padding: '0.65rem 0.75rem',
            borderRadius: 6,
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2, color: '#f59e0b' }} />
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Teammate called recently</strong>
            {recentTeamCalls.slice(0, 2).map((c) => (
              <div key={c.id} style={{ marginTop: 2 }}>
                {c.caller_name || 'Teammate'} · {c.outcome} · {new Date(c.created_at).toLocaleDateString()}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
          <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.35rem' }}>{leadDisplayName(lead)}</h2>
          <CallWindowBadge lead={lead} defaultCountryCode={defaultCountryCode} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {localTime && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Their time: {localTime}</span>}
          {lead.company && <span>{lead.company}</span>}
          {lead.phone && (
            <a href={`tel:${lead.phone}`} style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>
              {lead.phone}
            </a>
          )}
          {lead.email && <span>{lead.email}</span>}
          {lead.status && <span>Status: {lead.status}</span>}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button type="button" className="btn btn-primary" onClick={() => setLogOpen(true)}>
          <Phone size={14} /> Log outcome
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => onOpenLead?.(lead, 'calls')}>
          Open lead
        </button>
        <button type="button" className="btn btn-secondary" onClick={advance}>
          <SkipForward size={14} /> Skip
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {CALL_OUTCOMES.map((o) => (
          <button
            key={o}
            type="button"
            className="btn btn-sm btn-secondary"
            style={{ fontSize: '0.75rem' }}
            onClick={async () => {
              try {
                const data = await insertCallAttempt({
                  userId,
                  leadId: lead.id,
                  outcome: o,
                  note: null,
                  teamId,
                });
                onLogged?.(data);
                advance();
              } catch (err) {
                alert(err.message || 'Failed to log call');
              }
            }}
          >
            {o}
          </button>
        ))}
      </div>

      <LogCallModal
        open={logOpen}
        onClose={() => setLogOpen(false)}
        leads={queue}
        userId={userId}
        teamId={teamId}
        fixedLead={lead}
        showNoteSharing={showNoteSharing}
        onLogged={(row) => {
          onLogged?.(row);
          advance();
        }}
      />
    </div>
  );
}
