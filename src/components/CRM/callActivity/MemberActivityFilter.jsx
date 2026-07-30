import React from 'react';

export default function MemberActivityFilter({ members = [], value, onChange, disabled = false }) {
  return (
    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      Member
      <select
        className="form-input"
        style={{ width: 'auto', minWidth: 160 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">All members</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.full_name || m.email?.split('@')[0] || 'Member'}
            {(m.team_role || '').toLowerCase() === 'owner' ? ' (owner)' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
