import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logLeadTimelineEvent } from '../../lib/leadTimeline';
import { captureDeviceTimestamp } from '../../lib/dateTime';
import { leadDisplayName } from '../../lib/outreachQueue';

function toLocalInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad2 = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Log offline / backdated message outreach (email, LinkedIn, etc.). */
export default function LogMessageModal({
  open,
  onClose,
  lead,
  userId,
  teamId = null,
  timeZone = null,
  onLogged,
}) {
  const [channel, setChannel] = useState('email');
  const [note, setNote] = useState('');
  const [occurredLocal, setOccurredLocal] = useState('');
  const [updateLastContacted, setUpdateLastContacted] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const stamp = captureDeviceTimestamp(timeZone);
    setChannel('email');
    setNote('');
    setOccurredLocal(toLocalInputValue(stamp.occurredAt));
    setUpdateLastContacted(true);
    setError('');
  }, [open, timeZone]);

  if (!open || !lead) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setError('');
    try {
      const occurredAt = occurredLocal ? new Date(occurredLocal).toISOString() : new Date().toISOString();
      const channelLabel = channel === 'linkedin' ? 'LinkedIn' : channel === 'other' ? 'Message' : 'Email';
      const row = await logLeadTimelineEvent({
        leadId: lead.id,
        userId,
        teamId,
        eventType: 'message_sent',
        summary: `${channelLabel} sent`,
        detail: { channel, note: note.trim() || null },
        timeZone,
        occurredAt,
      });
      if (!row) throw new Error('Could not save message log.');

      let leadPatch = null;
      if (updateLastContacted) {
        const { data, error: upErr } = await supabase
          .from('leads')
          .update({ last_contacted_at: occurredAt })
          .eq('id', lead.id)
          .select('*')
          .single();
        if (upErr) throw upErr;
        leadPatch = data;
      }

      onLogged?.({ event: row, leadUpdates: leadPatch });
      onClose();
    } catch (err) {
      console.error('[LogMessageModal]', err);
      setError(err.message || 'Failed to log message.');
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
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Log message</h3>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          For <strong style={{ color: 'var(--text-primary)' }}>{leadDisplayName(lead)}</strong>
        </p>

        <form onSubmit={handleSubmit} className="flex-col gap-3">
          <div className="form-group">
            <label className="form-label">When you messaged</label>
            <input
              type="datetime-local"
              className="form-input"
              value={occurredLocal}
              onChange={(e) => setOccurredLocal(e.target.value)}
              required
            />
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Backdate if you reached out outside ReachDesk.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Channel</label>
            <select className="form-input" value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="email">Email</option>
              <option value="linkedin">LinkedIn</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <textarea
              className="form-input"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What you sent or noted…"
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={updateLastContacted}
              onChange={(e) => setUpdateLastContacted(e.target.checked)}
            />
            Update last contacted time
          </label>

          {error && <div style={{ color: 'var(--danger-color)', fontSize: '0.85rem' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
