const OUTCOME_BADGE = {
  Answered: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' },
  'No Answer': { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
  'Voicemail Left': { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
  Busy: { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' },
  'Wrong Number': { bg: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af' },
  'Callback Requested': { bg: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' },
  'Not Interested': { bg: 'rgba(224, 82, 82, 0.15)', color: '#E05252' },
};

export default function OutcomeBadge({ outcome }) {
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

export { OUTCOME_BADGE };
