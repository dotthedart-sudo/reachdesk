import React from 'react';
import { Phone, RefreshCw, CheckCircle2, StickyNote, CalendarCheck, AlertCircle } from 'lucide-react';
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
};

export default function ActivityTimelineRow({
  event,
  showLead = true,
  onOpenLead,
  compact = false,
}) {
  const Icon = ICONS[event?.event_type] || RefreshCw;
  const when = formatActivityDateTime(event, { showZone: true });
  const who = actorDisplayName(event);
  const leadName = leadDisplayFromTimeline(event);
  const note = event?.detail?.note || event?.detail?.outcome;

  return (
    <button
      type="button"
      onClick={() => {
        if (showLead && event?.lead_id && onOpenLead) onOpenLead(event.lead_id);
      }}
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
        cursor: showLead && onOpenLead ? 'pointer' : 'default',
        color: 'inherit',
      }}
    >
      <span
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
        }}
      >
        <Icon size={14} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {showLead && (
          <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 2 }}>{leadName}</div>
        )}
        <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{event?.summary}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
          {when}
          {' · '}
          {who}
          {note && typeof note === 'string' && note.trim() ? ` · ${note.trim().slice(0, 80)}` : ''}
        </div>
      </div>
    </button>
  );
}
