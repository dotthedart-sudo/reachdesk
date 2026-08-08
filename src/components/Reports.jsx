import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart2, Lock, Mail, ArrowRight, Download, ChevronDown, Folder, Check, Calendar,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAppContext } from '../App';
import { getTeamIds } from '../lib/utils';
import { isTeamOwner } from '../lib/teamWorkspace';
import { fetchSharesForUser } from '../lib/folderShares';
import { BRAND_NAME } from '../config/brand';
import HelpPopover from './HelpPopover';
import { softBadgeStyle } from '../lib/softBadgeStyle';
import { exportElementToPdf } from '../utils/exportReportsPdf';
import {
  MESSAGE_PIPELINE_STAGES,
  MESSAGE_STAGE_COLORS,
  countCumulativeMessagePipeline,
  computeStageConversionRates,
} from '../lib/dashboardMetrics';

const UNFILED_ID = 'unfiled';
const DATE_PRESETS = [
  { id: 'all', label: 'All time' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: 'custom', label: 'Custom' },
];

/** Soft-deleted leads are hard-deleted today; keep a defensive guard for future columns. */
function isActiveLead(lead) {
  if (!lead) return false;
  if (lead.deleted_at) return false;
  if (lead.is_deleted === true) return false;
  return true;
}

function startOfLocalDay(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function endOfLocalDay(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function leadEnteredAt(lead) {
  const raw = lead?.created_at;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const d = startOfLocalDay(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function ListFilterDropdown({ folders, selectedIds, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const allSelected = selectedIds.length === 0;
  const label = (() => {
    if (allSelected) return 'All leads';
    if (selectedIds.length === 1) {
      if (selectedIds[0] === UNFILED_ID) return 'Unfiled';
      return folders.find((f) => f.id === selectedIds[0])?.name || '1 list';
    }
    return `${selectedIds.length} lists`;
  })();

  const toggle = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div ref={rootRef} style={{ position: 'relative', minWidth: 180 }}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => setOpen((v) => !v)}
        style={{ width: '100%', justifyContent: 'space-between', gap: '0.5rem' }}
        aria-expanded={open}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
          <Folder size={14} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        </span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 40,
            minWidth: 240,
            maxHeight: 280,
            overflowY: 'auto',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            padding: '0.35rem',
          }}
        >
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => { onChange([]); setOpen(false); }}
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              background: allSelected ? 'var(--bg-hover)' : 'transparent',
              border: 'none',
              marginBottom: '0.25rem',
            }}
          >
            <Check size={14} style={{ opacity: allSelected ? 1 : 0 }} />
            All leads
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => toggle(UNFILED_ID)}
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              background: selectedIds.includes(UNFILED_ID) ? 'var(--bg-hover)' : 'transparent',
              border: 'none',
            }}
          >
            <Check size={14} style={{ opacity: selectedIds.includes(UNFILED_ID) ? 1 : 0 }} />
            Unfiled
          </button>
          {folders.length > 0 && (
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', padding: '0.5rem 0.5rem 0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Lists
            </div>
          )}
          {folders.map((f) => {
            const active = selectedIds.includes(f.id);
            return (
              <button
                key={f.id}
                type="button"
                className="btn btn-sm"
                onClick={() => toggle(f.id)}
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  background: active ? 'var(--bg-hover)' : 'transparent',
                  border: 'none',
                }}
              >
                <Check size={14} style={{ opacity: active ? 1 : 0, color: f.color || undefined }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Reports({ currentUser }) {
  const navigate = useNavigate();
  const { reportsUnlocked } = useAppContext() || {};
  const allowed = !!reportsUnlocked;
  const exportRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [allLeads, setAllLeads] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedListIds, setSelectedListIds] = useState([]);
  const [datePreset, setDatePreset] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => {
    if (!currentUser?.id || !allowed) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const teamIds = await getTeamIds(currentUser.id);
        const owner = isTeamOwner(currentUser);
        const shares = owner ? [] : await fetchSharesForUser(currentUser.id);
        const sharedFolderIds = shares.map((s) => s.folder_id).filter(Boolean);

        const foldersPromise = owner
          ? supabase.from('folders').select('id, name, color, user_id, sort_order').in('user_id', teamIds).order('sort_order', { ascending: true })
          : (async () => {
            const [ownRes, sharedRes] = await Promise.all([
              supabase.from('folders').select('id, name, color, user_id, sort_order').eq('user_id', currentUser.id).order('sort_order', { ascending: true }),
              sharedFolderIds.length
                ? supabase.from('folders').select('id, name, color, user_id, sort_order').in('id', sharedFolderIds).order('sort_order', { ascending: true })
                : Promise.resolve({ data: [] }),
            ]);
            const byId = new Map();
            [...(ownRes.data || []), ...(sharedRes.data || [])].forEach((f) => byId.set(f.id, f));
            return { data: [...byId.values()] };
          })();

        const leadsOrClause = sharedFolderIds.length
          ? `user_id.in.(${teamIds.join(',')}),folder_id.in.(${sharedFolderIds.join(',')})`
          : null;

        const leadsPromise = leadsOrClause
          ? supabase
            .from('leads')
            .select('id, status, reply_type, folder_id, created_at')
            .or(leadsOrClause)
            .order('created_at', { ascending: false })
          : supabase
            .from('leads')
            .select('id, status, reply_type, folder_id, created_at')
            .in('user_id', teamIds)
            .order('created_at', { ascending: false });

        const [foldersRes, leadsRes] = await Promise.all([foldersPromise, leadsPromise]);
        if (leadsRes.error) throw leadsRes.error;
        if (foldersRes.error) throw foldersRes.error;

        if (cancelled) return;

        setFolders(foldersRes.data || []);
        setAllLeads((leadsRes.data || []).filter(isActiveLead));
      } catch (err) {
        console.error('[Reports] Failed to load data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, currentUser?.team_id, currentUser?.team_role, allowed]);

  const dateBounds = useMemo(() => {
    const now = new Date();
    if (datePreset === '7d') {
      return { from: new Date(now.getTime() - 7 * 86400000), to: now };
    }
    if (datePreset === '30d') {
      return { from: new Date(now.getTime() - 30 * 86400000), to: now };
    }
    if (datePreset === '90d') {
      return { from: new Date(now.getTime() - 90 * 86400000), to: now };
    }
    if (datePreset === 'custom') {
      return {
        from: startOfLocalDay(customFrom),
        to: endOfLocalDay(customTo),
      };
    }
    return { from: null, to: null };
  }, [datePreset, customFrom, customTo]);

  const filteredLeads = useMemo(() => {
    return allLeads.filter((lead) => {
      if (!isActiveLead(lead)) return false;

      if (selectedListIds.length > 0) {
        const inUnfiled = selectedListIds.includes(UNFILED_ID) && !lead.folder_id;
        const inFolder = lead.folder_id && selectedListIds.includes(lead.folder_id);
        if (!inUnfiled && !inFolder) return false;
      }

      const entered = leadEnteredAt(lead);
      if (dateBounds.from && (!entered || entered < dateBounds.from)) return false;
      if (dateBounds.to && (!entered || entered > dateBounds.to)) return false;

      return true;
    });
  }, [allLeads, selectedListIds, dateBounds]);

  const cumulativeCounts = useMemo(
    () => countCumulativeMessagePipeline(filteredLeads),
    [filteredLeads],
  );
  const conversionRates = useMemo(
    () => computeStageConversionRates(cumulativeCounts),
    [cumulativeCounts],
  );

  const listFilterSummary = useMemo(() => {
    if (selectedListIds.length === 0) return 'All leads';
    const names = selectedListIds.map((id) => {
      if (id === UNFILED_ID) return 'Unfiled';
      return folders.find((f) => f.id === id)?.name || 'List';
    });
    return names.join(', ');
  }, [selectedListIds, folders]);

  const dateFilterSummary = useMemo(() => {
    if (datePreset === 'all') return 'All time';
    if (datePreset === '7d') return 'Last 7 days';
    if (datePreset === '30d') return 'Last 30 days';
    if (datePreset === '90d') return 'Last 90 days';
    if (datePreset === 'custom') {
      if (customFrom && customTo) return `${formatShortDate(customFrom)} – ${formatShortDate(customTo)}`;
      if (customFrom) return `From ${formatShortDate(customFrom)}`;
      if (customTo) return `Through ${formatShortDate(customTo)}`;
      return 'Custom range';
    }
    return 'All time';
  }, [datePreset, customFrom, customTo]);

  const handleExportPdf = async () => {
    if (!exportRef.current || exporting) return;
    setExporting(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      await exportElementToPdf(exportRef.current, {
        filename: `reachdesk-pipeline-report-${stamp}.pdf`,
      });
    } catch (err) {
      console.error('[Reports] PDF export failed:', err);
      alert('Could not export PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (!allowed) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 320,
          gap: '1rem',
          textAlign: 'center',
          padding: '2rem',
          color: 'var(--text-muted)',
        }}
      >
        <Lock size={32} />
        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Reports are on Trial, Pro, and Teams</h3>
        <p style={{ margin: 0, maxWidth: 420 }}>
          See how many leads reached each pipeline stage — cumulative counts that stay accurate even when deals move forward.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/upgrade')}>
          Upgrade to Pro
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="loading-container">Loading reports...</div>;
  }

  const totalLeads = filteredLeads.length;
  const generatedLabel = new Date().toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="flex-col gap-4" style={{ maxWidth: 960, textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart2 size={22} style={{ color: 'var(--accent-blue)' }} />
            Reports
          </h2>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Cumulative pipeline reach — each stage counts leads that reached it or moved beyond it.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleExportPdf}
          disabled={exporting || totalLeads === 0}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Download size={14} />
          {exporting ? 'Exporting…' : 'Export PDF'}
        </button>
      </div>

      {/* Filters — excluded from PDF capture */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.85rem',
          alignItems: 'flex-end',
          padding: '0.9rem 1rem',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Lists
          </label>
          <ListFilterDropdown
            folders={folders}
            selectedIds={selectedListIds}
            onChange={setSelectedListIds}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Entered pipeline
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
            {DATE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`btn btn-sm ${datePreset === p.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setDatePreset(p.id)}
              >
                {p.id === 'custom' ? <Calendar size={12} style={{ marginRight: 4 }} /> : null}
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {datePreset === 'custom' && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label htmlFor="reports-from" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>From</label>
              <input
                id="reports-from"
                type="date"
                className="form-input"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{ minWidth: 140 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label htmlFor="reports-to" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>To</label>
              <input
                id="reports-to"
                type="date"
                className="form-input"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{ minWidth: 140 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Branded report body — captured for PDF */}
      <div
        ref={exportRef}
        className="card reports-export-root"
        style={{
          background: '#ffffff',
          color: '#0a0a0a',
          border: '1px solid #e5e5e5',
          padding: '1.25rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
            borderBottom: '2px solid #0a0a0a',
            paddingBottom: '1rem',
            marginBottom: '1.1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/logo.png" alt="" width={36} height={36} style={{ borderRadius: 8 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.02em', color: '#0a0a0a' }}>
                {BRAND_NAME}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#525252' }}>Pipeline Report</div>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#525252', lineHeight: 1.45 }}>
            <div>Generated {generatedLabel}</div>
            <div>Lists: {listFilterSummary}</div>
            <div>Entered: {dateFilterSummary}</div>
          </div>
        </div>

        <h3
          style={{
            fontSize: '0.9rem',
            margin: '0 0 0.35rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#404040',
          }}
        >
          <Mail size={16} />
          Messages pipeline
          <span className="no-export-help">
            <HelpPopover title="Cumulative stage counts">
              Unlike the Dashboard funnel (which shows where leads sit right now), these numbers count every lead that reached each stage or progressed further — even if they have since moved on. Date filter uses lead created date (when they entered the pipeline).
            </HelpPopover>
          </span>
        </h3>
        <p style={{ fontSize: '0.75rem', color: '#737373', margin: '0 0 1rem' }}>
          {totalLeads} lead{totalLeads === 1 ? '' : 's'} matching filters
          {allLeads.length !== totalLeads ? ` (${allLeads.length} total in workspace)` : ''}.
        </p>

        {totalLeads === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#737373' }}>
            <p style={{ margin: '0 0 1rem' }}>
              {allLeads.length === 0
                ? 'Add leads in the CRM to see pipeline reports here.'
                : 'No leads match the selected lists and date range.'}
            </p>
            {allLeads.length === 0 && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/leads')}>
                Go to CRM Leads
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {MESSAGE_PIPELINE_STAGES.map((stage, idx) => {
              const count = cumulativeCounts[stage] ?? 0;
              const color = MESSAGE_STAGE_COLORS[stage] || '#737373';
              const prevStage = idx > 0 ? MESSAGE_PIPELINE_STAGES[idx - 1] : null;
              const rate = prevStage ? conversionRates[stage] : null;
              const pctOfTotal = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;

              return (
                <div
                  key={stage}
                  style={{
                    padding: '0.85rem',
                    margin: 0,
                    border: `1px solid ${count > 0 ? color : '#e5e5e5'}`,
                    borderRadius: 10,
                    background: '#fafafa',
                    opacity: count > 0 ? 1 : 0.75,
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.62rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: '#737373',
                      fontWeight: 600,
                      marginBottom: '0.35rem',
                      lineHeight: 1.2,
                    }}
                  >
                    {stage}
                  </div>
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: count > 0 ? color : '#a3a3a3',
                      lineHeight: 1,
                    }}
                  >
                    {count}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#737373', marginTop: '0.35rem' }}>
                    {pctOfTotal}% of filtered leads
                  </div>
                  {prevStage && rate != null && (
                    <div
                      style={{
                        marginTop: '0.5rem',
                        fontSize: '0.65rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        color: '#525252',
                      }}
                    >
                      <ArrowRight size={10} />
                      {rate}% from {prevStage}
                    </div>
                  )}
                  {count > 0 && (
                    <div
                      style={{
                        marginTop: '0.5rem',
                        display: 'inline-flex',
                        ...softBadgeStyle(color),
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.4rem',
                        borderRadius: '999px',
                      }}
                    >
                      Reached
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div
          style={{
            marginTop: '1.25rem',
            paddingTop: '0.85rem',
            borderTop: '1px solid #e5e5e5',
            fontSize: '0.68rem',
            color: '#a3a3a3',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          <span>Cumulative reach · Active leads only</span>
          <span>{BRAND_NAME}</span>
        </div>
      </div>
    </div>
  );
}
