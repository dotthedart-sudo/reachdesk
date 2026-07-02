import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Download, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

// ── helpers ──────────────────────────────────────────────────────────────────
function triggerDownload(content, filename, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

function toCSVRow(cells) {
  return cells.map(c => {
    const s = String(c ?? '').replace(/"/g, '""');
    return `"${s}"`;
  }).join(',');
}

function stripHTML(html = '') {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
}

// ─────────────────────────────────────────────────────────────────────────────

export default function UpgradeLockModal({ profile, handleLogout, theme }) {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(null); // 'leads' | 'notes' | null

  if (profile?.plan_status === 'active') return null;
  const isTrial = profile?.plan === 'trial';

  // ── Export Leads ────────────────────────────────────────────────────────────
  const handleExportLeads = async () => {
    if (exporting) return;
    setExporting('leads');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { alert('Not logged in.'); return; }

      const { data: leads, error } = await supabase
        .from('leads')
        .select('full_name,email,phone,company_name,niche,status,priority,custom_fields,notes')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!leads || leads.length === 0) { alert('No leads found.'); return; }

      const headers = ['Name', 'Email', 'Phone', 'Company', 'Niche', 'Status', 'Priority', 'Links', 'Notes'];
      const rows = leads.map(l => {
        // Collect links from custom_fields.links array
        const links = Array.isArray(l.custom_fields?.links)
          ? l.custom_fields.links.map(lk => lk.url || lk).join('; ')
          : [l.custom_fields?.linkedin_url, l.custom_fields?.instagram_url, l.custom_fields?.twitter_url, l.custom_fields?.website].filter(Boolean).join('; ');

        return toCSVRow([
          l.full_name,
          l.email,
          l.phone,
          l.company_name,
          l.niche,
          l.status,
          l.priority,
          links,
          l.notes
        ]);
      });

      const csv = [toCSVRow(headers), ...rows].join('\r\n');
      triggerDownload(csv, 'reachdesk-leads.csv', 'text/csv;charset=utf-8;');
    } catch (err) {
      console.error('Export leads error:', err);
      alert('Failed to export leads: ' + err.message);
    } finally {
      setExporting(null);
    }
  };

  // ── Export Notes ────────────────────────────────────────────────────────────
  const handleExportNotes = async () => {
    if (exporting) return;
    setExporting('notes');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { alert('Not logged in.'); return; }

      const { data: notes, error } = await supabase
        .from('notes')
        .select('title,content,updated_at')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      if (!notes || notes.length === 0) { alert('No notes found.'); return; }

      const lines = notes.map(n => {
        const title = n.title || 'Untitled';
        const date = n.updated_at ? new Date(n.updated_at).toLocaleDateString() : '';
        const body = stripHTML(n.content || '');
        return `== ${title} ==${ date ? `  [${date}]` : '' }\n${body}\n`;
      });

      const txt = lines.join('\n' + '─'.repeat(60) + '\n\n');
      triggerDownload(txt, 'reachdesk-notes.txt', 'text/plain;charset=utf-8;');
    } catch (err) {
      console.error('Export notes error:', err);
      alert('Failed to export notes: ' + err.message);
    } finally {
      setExporting(null);
    }
  };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    backdropFilter: 'blur(6px)',
    backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
    overflowY: 'auto'
  };

  const modalStyle = {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--accent-blue)',
    borderRadius: '3px',
    width: '100%',
    maxWidth: '420px',
    padding: '2.5rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
    textAlign: 'center',
    position: 'relative'
  };

  const ghostBtnStyle = {
    background: 'none',
    border: '1px solid var(--border-strong)',
    color: 'var(--text-muted)',
    borderRadius: '3px',
    padding: '0.45rem 0.85rem',
    fontSize: '0.78rem',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'border-color 0.15s ease, color 0.15s ease',
  };

  return (
    <div style={overlayStyle} onClick={(e) => e.stopPropagation()}>
      <div style={modalStyle}>
        {/* Icon */}
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(224, 82, 82, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--danger-color)',
            margin: '0 auto'
          }}
        >
          <ShieldAlert size={28} />
        </div>

        {/* Title */}
        <h2 style={{
          fontFamily: "'Mattone', sans-serif",
          fontSize: '1.85rem',
          marginBottom: '0.25rem',
          color: 'var(--text-primary)',
          fontWeight: 'normal'
        }}>
          {isTrial ? 'Trial Expired' : 'Subscription Expired'}
        </h2>

        {/* Description */}
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          {isTrial
            ? 'Your free trial has ended. Upgrade your plan to continue accessing your ReachDesk workspace.'
            : 'Your subscription has expired. Renew your plan to unlock client data.'}
        </p>

        {/* Upgrade CTA */}
        <button
          onClick={() => navigate('/upgrade')}
          className="btn btn-primary"
          style={{
            width: '100%',
            backgroundColor: 'var(--accent-blue)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '3px',
            padding: '0.75rem',
            fontWeight: 'bold',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            cursor: 'pointer',
            justifyContent: 'center'
          }}
        >
          Upgrade Plan
        </button>

        {/* ── Export section ─────────────────────────────────────────────── */}
        <div style={{ width: '100%' }}>
          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '0.85rem'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Or export your data first
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          {/* Export buttons row */}
          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleExportLeads}
              disabled={!!exporting}
              style={{
                ...ghostBtnStyle,
                opacity: exporting === 'leads' ? 0.6 : 1
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--accent-blue)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              title="Download all your leads as a CSV file"
            >
              <Download size={12} />
              {exporting === 'leads' ? 'Exporting…' : 'Export Leads (CSV)'}
            </button>

            <button
              onClick={handleExportNotes}
              disabled={!!exporting}
              style={{
                ...ghostBtnStyle,
                opacity: exporting === 'notes' ? 0.6 : 1
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--accent-blue)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              title="Download all your notes as a plain text file"
            >
              <FileText size={12} />
              {exporting === 'notes' ? 'Exporting…' : 'Export Notes (TXT)'}
            </button>
          </div>
        </div>
        {/* ─────────────────────────────────────────────────────────────────── */}

        {/* Log out */}
        <button
          onClick={handleLogout}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--danger-color)',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginTop: '0.5rem'
          }}
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
