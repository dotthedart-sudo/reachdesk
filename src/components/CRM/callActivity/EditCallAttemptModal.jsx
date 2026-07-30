import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { CALL_OUTCOMES } from '../../../lib/outreachQueue';
import { updateCallAttempt } from '../../../lib/callActivity';

export default function EditCallAttemptModal({ attempt, onClose, onSaved }) {
  const [outcome, setOutcome] = useState(attempt?.outcome || 'No Answer');
  const [note, setNote] = useState(attempt?.note || '');
  const [noteVisibility, setNoteVisibility] = useState(attempt?.note_visibility || 'team');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setOutcome(attempt?.outcome || 'No Answer');
    setNote(attempt?.note || '');
    setNoteVisibility(attempt?.note_visibility || 'team');
    setError('');
  }, [attempt]);

  if (!attempt) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await updateCallAttempt(attempt.id, {
        outcome,
        note,
        noteVisibility,
      });
      onSaved?.(updated);
    } catch (err) {
      setError(err.message || 'Failed to update call.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200 }}
      onClick={onClose}
    >
      <div className="card" style={{ width: 'min(400px, 92vw)', padding: '1.25rem' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Edit call log</h3>
          <button type="button" className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-col gap-3">
          <div className="form-group">
            <label className="form-label">Outcome</label>
            <select className="form-input" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
              {CALL_OUTCOMES.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Note</label>
            <textarea className="form-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <input
              type="checkbox"
              checked={noteVisibility === 'team'}
              onChange={(e) => setNoteVisibility(e.target.checked ? 'team' : 'private')}
            />
            Share note with team
          </label>
          {error && <div style={{ color: 'var(--danger-color)', fontSize: '0.85rem' }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
