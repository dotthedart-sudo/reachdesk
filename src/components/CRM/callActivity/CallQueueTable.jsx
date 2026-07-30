import React, { useEffect, useMemo, useState } from 'react';
import { PhoneCall, Settings as Gear } from 'lucide-react';
import CopyableCell from '../CopyableCell';
import GroupedStatusDropdown from '../GroupedStatusDropdown';
import PriorityDropdown from '../PriorityDropdown';
import EditableDropdown from '../EditableDropdown';
import CallWindowBadge from '../CallWindowBadge';
import CallButton from './CallButton';
import LogCallModal from './LogCallModal';
import OutcomeBadge from './OutcomeBadge';
import ResizableTh from '../ResizableTh';
import { getTableColumns, CALL_QUEUE_DEFAULT_DEFS } from '../crmTableColumns';
import { fetchMyCallAttempts } from '../../../lib/callActivity';
import { attemptsByLeadMap, buildOutreachSessionQueue } from '../../../lib/outreachQueue';
import CallingSession from './CallingSession';

const CALL_ACTION_COL = {
  column_key: 'call_action',
  column_label: 'Call next step',
  column_type: 'dropdown',
  is_default: true,
};

export default function CallQueueTable({
  leads = [],
  columnDefs = [],
  getWidth,
  setWidth,
  currentUser,
  teamId,
  onOpenLead,
  onStatusChange,
  onFieldChange,
  onCopied,
  onRefresh,
  onOpenColumnManager,
  showNoteSharing = false,
}) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logLead, setLogLead] = useState(null);
  const [sessionOpen, setSessionOpen] = useState(false);

  const userId = currentUser?.id;
  const defaultCountryCode = currentUser?.default_country_code || '+92';

  const tableCols = useMemo(() => {
    const cols = getTableColumns(columnDefs, 'call_queue');
    if (cols.length > 0) return cols;
    return CALL_QUEUE_DEFAULT_DEFS.map((d, i) => ({ ...d, id: `default-${d.column_key}`, sort_order: i }));
  }, [columnDefs]);

  const cellWidth = (key) => ({
    width: getWidth?.(key),
    minWidth: getWidth?.(key),
    maxWidth: getWidth?.(key),
  });

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchMyCallAttempts(userId)
      .then((data) => { if (!cancelled) setAttempts(data); })
      .catch(() => { if (!cancelled) setAttempts([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, leads.length]);

  const leadIdSet = useMemo(() => new Set(leads.map((l) => l.id)), [leads]);

  const scopedAttempts = useMemo(
    () => attempts.filter((a) => leadIdSet.has(a.lead_id)),
    [attempts, leadIdSet],
  );

  const byLead = useMemo(() => attemptsByLeadMap(scopedAttempts), [scopedAttempts]);

  const sessionQueue = useMemo(
    () => buildOutreachSessionQueue(leads, scopedAttempts),
    [leads, scopedAttempts],
  );

  const handleLogged = (row) => {
    setAttempts((prev) => [row, ...prev]);
    setLogLead(null);
    onRefresh?.();
  };

  const renderCell = (col, lead, last, attemptList) => {
    const displayName = [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim() || '—';

    switch (col.column_key) {
      case 'name':
        return <span style={{ fontWeight: 600 }} data-ph-mask>{displayName}</span>;
      case 'phone':
        return (
          <CopyableCell value={lead.phone || ''} onCopied={onCopied}>
            <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.9rem' }} data-ph-mask>
              {lead.phone || '—'}
            </span>
          </CopyableCell>
        );
      case 'local_time':
        return <CallWindowBadge lead={lead} defaultCountryCode={defaultCountryCode} />;
      case 'status':
        return (
          <GroupedStatusDropdown
            value={lead.status || 'Lead'}
            onChange={(val) => onStatusChange?.(lead.id, val)}
            isTableInline
            onUpdate={onRefresh}
          />
        );
      case 'call_action':
        return (
          <EditableDropdown
            value={lead.call_action || ''}
            columnDef={CALL_ACTION_COL}
            onChange={(val) => onFieldChange?.(lead.id, 'call_action', val)}
          />
        );
      case 'last_called':
        return (
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {last ? new Date(last.created_at).toLocaleDateString() : '—'}
          </span>
        );
      case 'outcome':
        return last ? <OutcomeBadge outcome={last.outcome} /> : '—';
      case 'attempts':
        return <span style={{ textAlign: 'center', display: 'block' }}>{attemptList.length || '—'}</span>;
      case 'priority':
        return (
          <PriorityDropdown
            value={lead.priority || 'Warm'}
            onChange={(val) => onFieldChange?.(lead.id, 'priority', val)}
          />
        );
      case '_actions':
        return (
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <CallButton phone={lead.phone} userId={userId} onCopied={onCopied} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLogLead(lead)}>
              Log
            </button>
          </div>
        );
      default:
        return lead[col.column_key] ?? '—';
    }
  };

  if (sessionOpen) {
    return (
      <CallingSession
        queue={sessionQueue}
        userId={userId}
        teamId={teamId}
        onClose={() => setSessionOpen(false)}
        onOpenLead={(lead) => onOpenLead?.(lead, 'calls')}
        defaultCountryCode={defaultCountryCode}
        showNoteSharing={showNoteSharing}
        onLogged={handleLogged}
      />
    );
  }

  const colSpan = Math.max(tableCols.length, 1);

  return (
    <div className="flex-col gap-3">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {loading ? 'Loading call data…' : `${leads.length} lead${leads.length === 1 ? '' : 's'} in this list · ${sessionQueue.length} in calling queue`}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {onOpenColumnManager && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={onOpenColumnManager}>
              <Gear size={14} /> Columns
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={sessionQueue.length === 0}
            onClick={() => setSessionOpen(true)}
          >
            <PhoneCall size={14} /> Start calling session
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              {tableCols.map((col) => (
                <ResizableTh
                  key={col.id || col.column_key}
                  columnKey={col.column_key}
                  width={getWidth?.(col.column_key) || 130}
                  onResize={setWidth}
                >
                  {col.column_label}
                </ResizableTh>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={colSpan} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No leads in this list.
                </td>
              </tr>
            ) : leads.map((lead) => {
              const last = byLead.get(lead.id);
              const attemptList = scopedAttempts.filter((a) => a.lead_id === lead.id);
              const interactiveKeys = new Set(['status', 'call_action', 'priority', 'phone', '_actions']);

              return (
                <tr
                  key={lead.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onOpenLead?.(lead, 'calls')}
                >
                  {tableCols.map((col) => (
                    <td
                      key={col.id || col.column_key}
                      style={cellWidth(col.column_key)}
                      onClick={interactiveKeys.has(col.column_key) ? (e) => e.stopPropagation() : undefined}
                    >
                      {renderCell(col, lead, last, attemptList)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <LogCallModal
        open={!!logLead}
        onClose={() => setLogLead(null)}
        leads={leads}
        userId={userId}
        teamId={teamId}
        fixedLead={logLead}
        showNoteSharing={showNoteSharing}
        onLogged={handleLogged}
      />
    </div>
  );
}
