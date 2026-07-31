import React, { useEffect, useMemo, useState } from 'react';
import { PhoneCall, Settings as Gear, Lightbulb } from 'lucide-react';
import CopyableCell from '../CopyableCell';
import GroupedStatusDropdown from '../GroupedStatusDropdown';
import PriorityDropdown from '../PriorityDropdown';
import EditableDropdown from '../EditableDropdown';
import CallWindowBadge from '../CallWindowBadge';
import DateTimePickerCell from '../DateTimePickerCell';
import CallButton from './CallButton';
import LogCallModal from './LogCallModal';
import QuickLogChips from './QuickLogChips';
import OutcomeBadge from './OutcomeBadge';
import ResizableTh from '../ResizableTh';
import ResizableTr from '../ResizableTr';
import { getTableColumns, CALL_QUEUE_DEFAULT_DEFS } from '../crmTableColumns';
import { logCallWithUpdates, fetchMyCallAttempts } from '../../../lib/callActivity';
import { getCallActionForStatus, displayCallStatus } from '../../../lib/callOutcomeRules';
import { attemptsByLeadMap, buildOutreachSessionQueue } from '../../../lib/outreachQueue';
import { formatLocalTime, getEffectiveUserTimeZone } from '../../../lib/dateTime';
import CallingSession from './CallingSession';
export default function CallQueueTable({
  leads = [],
  columnDefs = [],
  getWidth,
  setWidth,
  resetWidth,
  getRowHeight,
  setRowHeight,
  resetRowHeight,
  currentUser,
  teamId,
  onOpenLead,
  onCallStatusChange,
  onFieldChange,
  onCopied,
  onRefresh,
  onLeadUpdated,
  onOpenColumnManager,
  showNoteSharing = false,
  suggestionRules = [],
  onUpdateColumnDef,
}) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logLead, setLogLead] = useState(null);
  const [sessionOpen, setSessionOpen] = useState(false);

  const userId = currentUser?.id;
  const userTimeZone = useMemo(() => getEffectiveUserTimeZone(currentUser), [currentUser?.timezone]);
  const defaultCountryCode = currentUser?.default_country_code || '+92';
  const suggestionsEnabled = currentUser?.suggestions_enabled !== false;

  const tableCols = useMemo(() => {
    const cols = getTableColumns(columnDefs, 'call_queue');
    if (cols.length > 0) return cols;
    return CALL_QUEUE_DEFAULT_DEFS.map((d, i) => ({ ...d, id: `default-${d.column_key}`, sort_order: i }));
  }, [columnDefs]);

  const callActionColDef = useMemo(
    () => tableCols.find((c) => c.column_key === 'call_action') || {
      column_key: 'call_action',
      column_label: 'Call next step',
      column_type: 'dropdown',
      is_default: true,
      dropdown_options: [],
    },
    [tableCols],
  );

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
    () => buildOutreachSessionQueue(leads, scopedAttempts, userTimeZone),
    [leads, scopedAttempts, userTimeZone],
  );

  const handleLogged = ({ attempt, leadUpdates } = {}) => {
    if (attempt) setAttempts((prev) => [attempt, ...prev]);
    setLogLead(null);
    if (leadUpdates?.id) {
      onLeadUpdated?.(leadUpdates);
    }
  };

  const handleCallStatusChange = async (leadId, newStatus) => {
    const result = await onCallStatusChange?.(leadId, newStatus);
    if (result?.attempt) {
      setAttempts((prev) => [result.attempt, ...prev]);
    }
    return result;
  };

  const handleQuickLog = async (lead, outcome) => {
    if (!userId || !lead?.id) return;
    const result = await logCallWithUpdates({
      userId,
      leadId: lead.id,
      outcome,
      teamId,
      updateLeadFields: true,
      timeZone: userTimeZone,
    });
    handleLogged(result);
  };

  const handleLastCalledChange = (lead, iso) => {
    onFieldChange?.(lead.id, 'last_called_at', iso);
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
        return (
          <CallWindowBadge
            lead={lead}
            defaultCountryCode={defaultCountryCode}
            showLocalTime
            editable
            onTimezoneChange={(tz) => onFieldChange?.(lead.id, 'timezone', tz || '')}
          />
        );
      case 'status':
        return (
          <GroupedStatusDropdown
            channel="calls"
            value={displayCallStatus(lead.call_status)}
            onChange={(val) => handleCallStatusChange(lead.id, val)}
            isTableInline
            onUpdate={onRefresh}
          />
        );
      case 'call_action': {
        const callStatusLabel = displayCallStatus(lead.call_status);
        const expected = suggestionsEnabled
          ? getCallActionForStatus(callStatusLabel, userId, suggestionRules)
          : null;
        const isMismatch = expected && lead.call_action !== expected;

        return (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <EditableDropdown
              value={lead.call_action || ''}
              columnDef={callActionColDef}
              onChange={(val) => onFieldChange?.(lead.id, 'call_action', val)}
              onUpdateColumnDef={onUpdateColumnDef}
            />
            {isMismatch && (
              <button
                type="button"
                className="btn-icon"
                title={`Apply suggested: ${expected}`}
                style={{ color: 'var(--status-warm)', padding: 2 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onFieldChange?.(lead.id, 'call_action', expected);
                }}
              >
                <Lightbulb size={14} />
              </button>
            )}
          </div>
        );
      }
      case 'last_called':
        return (
          <DateTimePickerCell
            compact
            value={lead.last_called_at || last?.created_at || null}
            timeZone={userTimeZone}
            onChange={(iso) => handleLastCalledChange(lead, iso)}
            placeholder="—"
          />
        );
      case 'last_contacted_at':
        return (
          <DateTimePickerCell
            compact
            value={lead.last_contacted_at || null}
            timeZone={userTimeZone}
            onChange={(iso) => onFieldChange?.(lead.id, 'last_contacted_at', iso)}
            placeholder="—"
          />
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 180 }}>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <CallButton phone={lead.phone} userId={userId} onCopied={onCopied} />
            </div>
            <QuickLogChips
              compact
              onLog={(outcome) => handleQuickLog(lead, outcome)}
              onMore={() => setLogLead(lead)}
            />
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
        timeZone={userTimeZone}
      />
    );
  }

  const colSpan = Math.max(tableCols.length, 1);

  return (
    <div className="flex-col gap-3">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {loading ? 'Loading call data…' : `${leads.length} lead${leads.length === 1 ? '' : 's'} in this list · ${sessionQueue.length} in calling queue`}
          {!loading && (
            <span style={{ marginLeft: '0.75rem', color: 'var(--text-secondary)' }}>
              Your time: {formatLocalTime(new Date(), { timeZone: userTimeZone, showZone: true })}
            </span>
          )}
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
        <table className="data-table data-table--resizable" style={{ width: '100%' }}>
          <thead>
            <tr>
              {tableCols.map((col) => (
                <ResizableTh
                  key={col.id || col.column_key}
                  columnKey={col.column_key}
                  width={getWidth?.(col.column_key) || 130}
                  onResize={setWidth}
                  onReset={resetWidth}
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
                <ResizableTr
                  key={lead.id}
                  rowKey={lead.id}
                  height={getRowHeight?.(lead.id) || 44}
                  onResize={setRowHeight}
                  onReset={resetRowHeight}
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
                </ResizableTr>
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
        timeZone={userTimeZone}
      />
    </div>
  );
}
