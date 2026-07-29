import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, Plus, Lock, X, ChevronRight, SkipForward, PhoneCall,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PLAN_LIMITS, normalizePlan } from '../../lib/utils';
import {
  CALL_OUTCOMES,
  TERMINAL_OUTCOMES,
  leadDisplayName,
  buildOutreachSessionQueue,
  computeNextFollowUp,
  sortByCallability,
  startOfToday,
} from '../../lib/outreachQueue';
import CallWindowBadge from './CallWindowBadge';
import { getLeadLocalTime } from '../../lib/leadTimezone';

export { CALL_OUTCOMES };

const OUTCOME_BADGE = {
  Answered: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' },
  'No Answer': { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
  'Voicemail Left': { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
  Busy: { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' },
  'Wrong Number': { bg: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af' },
  'Callback Requested': { bg: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' },
  'Not Interested': { bg: 'rgba(224, 82, 82, 0.15)', color: '#E05252' },
};

function OutcomeBadge({ outcome }) {
  if (!outcome) return <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>;
  const style = OUTCOME_BADGE[outcome] || { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' };
  return (
    <span
      className="badge"
      style={{
        background: style.bg,
        color: style.color,
        border: 'none',
        fontSize: '0.7rem',
        fontWeight: 600,
      }}
    >
      {outcome}
    </span>
  );
}

export function LogCallModal({
  open,
  onClose,
  leads,
  defaultLeadId,
  userId,
  onLogged,
  fixedLead = null,
}) {
  const [leadId, setLeadId] = useState(defaultLeadId || '');
  const [outcome, setOutcome] = useState('No Answer');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLeadId(fixedLead?.id || defaultLeadId || '');
    setOutcome('No Answer');
    setNote('');
    setError('');
  }, [open, defaultLeadId, fixedLead?.id]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const resolvedLeadId = fixedLead?.id || leadId;
    if (!resolvedLeadId || !outcome) {
      setError('Pick a lead and outcome.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data, error: insertError } = await supabase
        .from('lead_call_attempts')
        .insert({
          lead_id: resolvedLeadId,
          user_id: userId,
          outcome,
          note: note.trim() || null,
        })
        .select('*')
        .single();
      if (insertError) throw insertError;
      onLogged?.(data);
      onClose();
    } catch (err) {
      console.error('[Outreach] log call failed:', err);
      setError(err.message || 'Failed to log call.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100 }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: 'min(440px, 92vw)', padding: '1.25rem', background: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Log Call</h3>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-col gap-3">
          {!fixedLead && (
            <div className="form-group">
              <label className="form-label">Lead</label>
              <select
                className="form-input"
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                required
              >
                <option value="">Select a lead…</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {leadDisplayName(lead)}
                    {lead.phone ? ` · ${lead.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {fixedLead && (
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Logging call for <strong style={{ color: 'var(--text-primary)' }}>{leadDisplayName(fixedLead)}</strong>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Outcome</label>
            <select
              className="form-input"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              required
            >
              {CALL_OUTCOMES.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <textarea
              className="form-input"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What happened on the call…"
            />
          </div>

          {error && <div style={{ color: 'var(--danger-color)', fontSize: '0.85rem' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save call'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CallingSession({
  queue,
  userId,
  onClose,
  onLogged,
  onOpenLead,
  defaultCountryCode = '+92',
}) {
  const [index, setIndex] = useState(0);
  const [logOpen, setLogOpen] = useState(false);

  const lead = queue[index] || null;
  const remaining = Math.max(0, queue.length - index);
  const localTime = lead ? getLeadLocalTime(lead, new Date(), defaultCountryCode) : null;

  if (!lead) {
    return (
      <div className="card flex-col gap-3" style={{ padding: '2rem', textAlign: 'center', alignItems: 'center' }}>
        <PhoneCall size={28} style={{ color: 'var(--text-muted)' }} />
        <h3 style={{ margin: 0 }}>Queue complete</h3>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          No more leads in this calling session.
        </p>
        <button type="button" className="btn btn-primary" onClick={onClose}>Back to table</button>
      </div>
    );
  }

  const advance = () => {
    setIndex((i) => i + 1);
  };

  return (
    <div className="card flex-col gap-3" style={{ padding: '1.25rem', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          CALLING SESSION · {remaining} left
        </span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>End session</button>
      </div>

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
        <button type="button" className="btn btn-secondary" onClick={() => onOpenLead?.(lead)}>
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
                const { data, error } = await supabase
                  .from('lead_call_attempts')
                  .insert({
                    lead_id: lead.id,
                    user_id: userId,
                    outcome: o,
                    note: null,
                  })
                  .select('*')
                  .single();
                if (error) throw error;
                onLogged?.(data);
                advance();
              } catch (err) {
                console.error('[Outreach] quick log failed:', err);
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
        fixedLead={lead}
        onLogged={(row) => {
          onLogged?.(row);
          advance();
        }}
      />
    </div>
  );
}

export default function OutreachTracker({
  currentUser,
  leads = [],
  onOpenLead,
}) {
  const navigate = useNavigate();
  const planKey = normalizePlan(currentUser?.plan);
  const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.trial;
  const locked = !limits.coldOutreach;

  const myLeads = useMemo(
    () => (leads || []).filter((l) => l.user_id === currentUser?.id),
    [leads, currentUser?.id],
  );

  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [prioritizeCallable, setPrioritizeCallable] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [error, setError] = useState('');

  const loadAttempts = useCallback(async () => {
    if (!currentUser?.id || locked) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('lead_call_attempts')
        .select('id, lead_id, user_id, outcome, note, created_at')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setAttempts(data || []);
    } catch (err) {
      console.error('[Outreach] load failed:', err);
      setError(err.message || 'Failed to load call history.');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, locked]);

  useEffect(() => {
    loadAttempts();
  }, [loadAttempts]);

  const attemptsByLead = useMemo(() => {
    const map = new Map();
    for (const attempt of attempts) {
      if (!map.has(attempt.lead_id)) map.set(attempt.lead_id, []);
      map.get(attempt.lead_id).push(attempt);
    }
    return map;
  }, [attempts]);

  const rows = useMemo(() => {
    const today = startOfToday();
    const result = [];

    for (const lead of myLeads) {
      const leadAttempts = attemptsByLead.get(lead.id) || [];
      if (leadAttempts.length === 0) continue;

      const last = leadAttempts[0];
      const nextFollowUp = computeNextFollowUp(last);
      const needsFollowUpToday =
        nextFollowUp && nextFollowUp.getTime() <= today.getTime() && !TERMINAL_OUTCOMES.has(last.outcome);

      result.push({
        lead,
        attemptCount: leadAttempts.length,
        lastOutcome: last.outcome,
        lastAt: last.created_at,
        nextFollowUp,
        needsFollowUpToday,
      });
    }

    let filtered = result;
    if (filter === 'needs_followup') {
      filtered = result.filter((r) => r.needsFollowUpToday);
    } else if (filter.startsWith('outcome:')) {
      const outcome = filter.slice('outcome:'.length);
      filtered = result.filter((r) => r.lastOutcome === outcome);
    }

    const sorted = [...filtered];
    if (sort === 'recent') {
      sorted.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
    } else if (sort === 'oldest') {
      sorted.sort((a, b) => new Date(a.lastAt) - new Date(b.lastAt));
    } else if (sort === 'attempts') {
      sorted.sort((a, b) => b.attemptCount - a.attemptCount || new Date(b.lastAt) - new Date(a.lastAt));
    } else if (sort === 'followup') {
      sorted.sort((a, b) => {
        const at = a.nextFollowUp ? a.nextFollowUp.getTime() : Number.POSITIVE_INFINITY;
        const bt = b.nextFollowUp ? b.nextFollowUp.getTime() : Number.POSITIVE_INFINITY;
        return at - bt;
      });
    }

    return sorted;
  }, [myLeads, attemptsByLead, filter, sort]);

  const defaultCountryCode = currentUser?.default_country_code || '+92';

  const sessionQueue = useMemo(() => {
    const flatAttempts = [];
    for (const [, list] of attemptsByLead) {
      if (list[0]) flatAttempts.push(list[0]);
    }
    let q = buildOutreachSessionQueue(myLeads, flatAttempts);
    if (prioritizeCallable) {
      q = sortByCallability(q, new Date(), defaultCountryCode);
    }
    return q;
  }, [myLeads, attemptsByLead, prioritizeCallable, defaultCountryCode]);

  if (locked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, gap: '1rem', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        <Lock size={32} />
        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Cold Outreach Tracker is on Pro</h3>
        <p style={{ margin: 0, maxWidth: 420, fontSize: '0.9rem' }}>
          Log call outcomes, track follow-ups, and run focused calling sessions. Available on Trial, Pro, and Teams.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/upgrade')}>
          Upgrade to Pro
        </button>
      </div>
    );
  }

  if (sessionOpen) {
    return (
      <CallingSession
        queue={sessionQueue}
        userId={currentUser.id}
        onClose={() => setSessionOpen(false)}
        onOpenLead={onOpenLead}
        defaultCountryCode={defaultCountryCode}
        onLogged={(row) => {
          setAttempts((prev) => [row, ...prev]);
        }}
      />
    );
  }

  return (
    <div className="flex-col gap-3">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Phone size={16} style={{ color: 'var(--primary-magenta)' }} /> Outreach
          </h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Your call activity only — not shared with teammates.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSessionOpen(true)}
            disabled={sessionQueue.length === 0}
            title={sessionQueue.length === 0 ? 'No leads need calling right now' : `${sessionQueue.length} in queue`}
          >
            <PhoneCall size={14} /> Start Calling Session
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setLogOpen(true)}>
            <Plus size={14} /> Log Call
          </button>
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={prioritizeCallable}
          onChange={(e) => setPrioritizeCallable(e.target.checked)}
        />
        Prioritize callable leads in calling session (9am–6pm lead local time)
      </label>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          Filter
          <select className="form-input" style={{ width: 'auto', minWidth: 160 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="needs_followup">Needs Follow-up Today</option>
            {CALL_OUTCOMES.map((o) => (
              <option key={o} value={`outcome:${o}`}>{o}</option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          Sort
          <select className="form-input" style={{ width: 'auto', minWidth: 150 }} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">Most recent</option>
            <option value="oldest">Oldest</option>
            <option value="attempts">Most attempts</option>
            <option value="followup">Follow-up date</option>
          </select>
        </label>
      </div>

      {error && <div style={{ color: 'var(--danger-color)', fontSize: '0.85rem' }}>{error}</div>}

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: '1.5rem 0' }}>Loading call activity…</div>
      ) : rows.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ margin: '0 0 0.75rem' }}>No call activity yet.</p>
          <button type="button" className="btn btn-primary" onClick={() => setLogOpen(true)}>
            <Plus size={14} /> Log your first call
          </button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 6 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', textAlign: 'left' }}>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Lead</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Local time</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Last outcome</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Attempts</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Next follow-up</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.lead.id}
                  onClick={() => onOpenLead?.(row.lead)}
                  style={{ borderTop: '1px solid var(--border-color)', cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    <div style={{ fontWeight: 600 }}>{leadDisplayName(row.lead)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {row.lead.phone || row.lead.email || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    <CallWindowBadge lead={row.lead} defaultCountryCode={defaultCountryCode} showLocalTime />
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    <OutcomeBadge outcome={row.lastOutcome} />
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>{row.attemptCount}</td>
                  <td style={{ padding: '0.65rem 0.75rem', color: row.needsFollowUpToday ? 'var(--status-hot)' : 'var(--text-secondary)' }}>
                    {row.nextFollowUp
                      ? row.nextFollowUp.toLocaleDateString()
                      : '—'}
                    {row.needsFollowUpToday && (
                      <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>Due today</span>
                    )}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LogCallModal
        open={logOpen}
        onClose={() => setLogOpen(false)}
        leads={myLeads}
        userId={currentUser.id}
        onLogged={(row) => setAttempts((prev) => [row, ...prev])}
      />
    </div>
  );
}
