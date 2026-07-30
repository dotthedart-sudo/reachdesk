import React from 'react';

export default function TeamCallStats({ stats = [], loading }) {
  if (loading || stats.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        marginBottom: '0.75rem',
      }}
    >
      {stats.map((s) => (
        <div
          key={s.user_id}
          className="card"
          style={{
            padding: '0.5rem 0.75rem',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.caller_name}</span>
          <span style={{ color: 'var(--text-muted)' }}>{s.call_count} call{s.call_count === 1 ? '' : 's'}</span>
        </div>
      ))}
    </div>
  );
}
