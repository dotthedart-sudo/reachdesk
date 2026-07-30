import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { CALL_OUTCOMES, leadDisplayName } from '../../../lib/outreachQueue';
import { insertCallAttempt } from '../../../lib/callActivity';

export default function LogCallModal({
  open,
  onClose,
  leads,
  defaultLeadId,
  userId,
  teamId = null,
  onLogged,
  fixedLead = null,
  showNoteSharing = false,
}) {
  const [leadId, setLeadId] = useState(defaultLeadId || '');
  const [outcome, setOutcome] = useState('No Answer');
  const [note, setNote] = useState('');
  const [noteVisibility, setNoteVisibility] = useState('team');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLeadId(fixedLead?.id || defaultLeadId || '');
    setOutcome('No Answer');
    setNote('');
    setNoteVisibility('team');
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
      const data = await insertCallAttempt({
        userId,
        leadId: resolvedLeadId,
        outcome,
        note,
        noteVisibility: showNoteSharing ? noteVisibility : 'team',
        teamId,
      });
      onLogged?.(data);
      onClose();
    } catch (err) {
      console.error('[LogCallModal] failed:', err);
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
              {leads.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  No callable leads in your workspace scope. Add or import leads in CRM first.
                </p>
              ) : (
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
              )}
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

          {showNoteSharing && note.trim() && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={noteVisibility === 'team'}
                onChange={(e) => setNoteVisibility(e.target.checked ? 'team' : 'private')}
              />
              Share note with team (outcome is always visible when team sharing is on)
            </label>
          )}

          {error && <div style={{ color: 'var(--danger-color)', fontSize: '0.85rem' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || (!fixedLead && leads.length === 0)}>
              {saving ? 'Saving…' : 'Save call'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
