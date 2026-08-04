import React, { useEffect, useState } from 'react';
import { Phone, RefreshCw, CheckCircle2, StickyNote, CalendarCheck, AlertCircle, Mail, Pencil } from 'lucide-react';
import { formatActivityDateTime } from '../../lib/dateTime';
import { actorDisplayName, leadDisplayFromTimeline } from '../../lib/leadTimeline';

const ICONS = {
  call_logged: Phone,
  status_changed: RefreshCw,
  field_changed: RefreshCw,
  timestamp_corrected: RefreshCw,
  plan_completed: CalendarCheck,
  plan_missed: AlertCircle,
  plan_cancelled: AlertCircle,
  checkpoint_done: CheckCircle2,
  note_added: StickyNote,
  reply_logged: StickyNote,
  message_sent: Mail,
};

function toLocalInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad2 = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export default function ActivityTimelineRow({
  event,
  showLead = true,
  onOpenLead,
  compact = false,
  editableWhen = false,
  onSaveWhen,
}) {
  const Icon = ICONS[event?.event_type] || RefreshCw;
  const when = formatActivityDateTime(event, { showZone: true });
  const who = actorDisplayName(event);
  const leadName = leadDisplayFromTimeline(event);
  const note = event?.detail?.note || event?.detail?.outcome;
  const [editing, setEditing] = useState(false);
  const [localWhen, setLocalWhen] = useState(toLocalInputValue(event?.occurred_at || event?.created_at));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalWhen(toLocalInputValue(event?.occurred_at || event?.created_at));
    setEditing(false);
  }, [event?.id, event?.occurred_at, event?.created_at]);

  const handleSaveWhen = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!localWhen || !onSaveWhen) return;
    setSaving(true);
    try {
      await onSaveWhen(event, new Date(localWhen).toISOString());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.65rem',
        alignItems: 'flex-start',
        width: '100%',
        textAlign: 'left',
        padding: compact ? '0.5rem 0.6rem' : '0.65rem 0.75rem',
        borderRadius: 6,
        border: '1px solid var(--border-color)',
        background: 'var(--bg-tertiary)',
        color: 'inherit',
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (showLead && event?.lead_id && onOpenLead) onOpenLead(event.lead_id);
        }}
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: 'var(--bg-hover)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: 'var(--text-secondary)',
          border: 'none',
          cursor: showLead && onOpenLead ? 'pointer' : 'default',
          padding: 0,
        }}
        aria-label={showLead && onOpenLead ? 'Open lead' : undefined}
      >
        <Icon size={14} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        {showLead && (
          <button
            type="button"
            onClick={() => {
              if (event?.lead_id && onOpenLead) onOpenLead(event.lead_id);
            }}
            style={{
              fontWeight: 600,
              fontSize: '0.88rem',
              marginBottom: 2,
              border: 'none',
              background: 'transparent',
              color: 'inherit',
              padding: 0,
              cursor: onOpenLead ? 'pointer' : 'default',
              textAlign: 'left',
            }}
          >
            {leadName}
          </button>
        )}
        <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{event?.summary}</div>
        {editing ? (
          <form onSubmit={handleSaveWhen} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: 6, alignItems: 'center' }}>
            <input
              type="datetime-local"
              className="form-input"
              value={localWhen}
              onChange={(e) => setLocalWhen(e.target.value)}
              style={{ fontSize: '0.75rem', maxWidth: 220 }}
              required
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving} style={{ fontSize: '0.7rem' }}>
              {saving ? '…' : 'Save'}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem' }} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span>
              {when}
              {' · '}
              {who}
              {note && typeof note === 'string' && note.trim() ? ` · ${note.trim().slice(0, 80)}` : ''}
            </span>
            {editableWhen && onSaveWhen && (
              <button
                type="button"
                className="btn-icon"
                title="Edit when this happened"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(true);
                }}
                style={{ width: 22, height: 22, color: 'var(--text-muted)' }}
              >
                <Pencil size={12} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
