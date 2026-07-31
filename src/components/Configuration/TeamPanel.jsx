import React from 'react';
import { Users } from 'lucide-react';

export default function TeamPanel({ onOpenTeams }) {
  return (
    <div className="card flex-col gap-3">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
        <Users size={18} style={{ color: 'var(--primary-magenta)' }} />
        <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Team workspace</h3>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
        Invite teammates, manage seats, and set sharing permissions from the Teams page.
      </p>
      <div>
        <button type="button" className="btn btn-primary" onClick={onOpenTeams}>
          Open Teams
        </button>
      </div>
    </div>
  );
}
