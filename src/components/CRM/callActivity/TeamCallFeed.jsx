import React, { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { CALL_OUTCOMES, leadDisplayName, computeNextFollowUp } from '../../../lib/outreachQueue';
import OutcomeBadge from './OutcomeBadge';
import MemberActivityFilter from './MemberActivityFilter';

export default function TeamCallFeed({
  rows = [],
  members = [],
  loading,
  memberFilter,
  onMemberFilterChange,
  outcomeFilter,
  onOutcomeFilterChange,
  onOpenLead,
  canViewTeam = true,
}) {
  const enriched = useMemo(() => {
    return rows.map((row) => ({
      ...row,
      lead: {
        id: row.lead_id,
        first_name: row.lead_first_name,
        last_name: row.lead_last_name,
        email: row.lead_email,
        phone: row.lead_phone,
        company: row.lead_company,
      },
      nextFollowUp: computeNextFollowUp({ outcome: row.outcome, created_at: row.created_at }),
    }));
  }, [rows]);

  if (!canViewTeam) {
    return (
      <div className="card" style={{ padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Team call activity is off. Your owner can enable sharing on the Teams page, or use <strong>My Activity</strong> for your own logs.
      </div>
    );
  }

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', padding: '1.5rem 0' }}>Loading team activity…</div>;
  }

  return (
    <>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <MemberActivityFilter
          members={members}
          value={memberFilter}
          onChange={onMemberFilterChange}
        />
        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          Outcome
          <select
            className="form-input"
            style={{ width: 'auto', minWidth: 150 }}
            value={outcomeFilter}
            onChange={(e) => onOutcomeFilterChange(e.target.value)}
          >
            <option value="">All outcomes</option>
            {CALL_OUTCOMES.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>
      </div>

      {enriched.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No team call activity matches this filter.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 6 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', textAlign: 'left' }}>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>When</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Member</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Lead</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Outcome</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Note</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Follow-up</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }} />
              </tr>
            </thead>
            <tbody>
              {enriched.map((row) => (
                <tr key={row.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>{row.caller_name || row.caller_email || '—'}</td>
                  <td
                    style={{ padding: '0.65rem 0.75rem', cursor: 'pointer' }}
                    onClick={() => onOpenLead?.(row.lead, 'calls')}
                  >
                    <div style={{ fontWeight: 600 }}>{leadDisplayName(row.lead)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.lead.company || row.lead.phone || '—'}</div>
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    <OutcomeBadge outcome={row.outcome} />
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', maxWidth: 200, color: 'var(--text-secondary)' }}>
                    {!row.note_visible && row.note == null ? (
                      <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>(private)</span>
                    ) : (
                      row.note || '—'
                    )}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    {row.nextFollowUp ? row.nextFollowUp.toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                    <button type="button" className="btn-icon" onClick={() => onOpenLead?.(row.lead, 'calls')}>
                      <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
