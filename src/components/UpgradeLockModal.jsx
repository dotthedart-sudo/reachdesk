import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Download, FileText, Database } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { exportLeads, exportNotes } from '../utils/exportUtils';
import ExportSheetsModal from './CRM/ExportSheetsModal';

// ─────────────────────────────────────────────────────────────────────────────

export default function UpgradeLockModal({ profile, handleLogout, theme }) {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(null); // 'leads' | 'notes' | null
  const [sheetsConnected, setSheetsConnected] = useState(false);
  const [showSheetsExportModal, setShowSheetsExportModal] = useState(false);
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    async function checkConnectionAndFetchLeads() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const userId = session.user.id;

        // Check sheets integration
        const { data: sheetsData } = await supabase
          .from('sheets_integrations')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        
        setSheetsConnected(!!sheetsData);

        // Fetch leads for exporting to Sheets if connected
        if (sheetsData) {
          const { data: pProfile } = await supabase
            .from('user_profiles')
            .select('team_id')
            .eq('id', userId)
            .maybeSingle();

          let ids = [userId];
          if (pProfile?.team_id) {
            const { data: members } = await supabase
              .from('user_profiles')
              .select('id')
              .eq('team_id', pProfile.team_id);
            if (members && members.length > 0) {
              ids = members.map(m => m.id);
            }
          }

          const { data: leadsData } = await supabase
            .from('leads')
            .select('*')
            .in('user_id', ids)
            .order('created_at', { ascending: false });

          if (leadsData) {
            setLeads(leadsData);
          }
        }
      } catch (err) {
        console.error('Error checking sheets connection in UpgradeLockModal:', err);
      }
    }
    checkConnectionAndFetchLeads();
  }, []);

  if (profile?.plan_status === 'active') return null;
  const isTrial = profile?.plan === 'trial';

  // ── Export Leads ────────────────────────────────────────────────────────────
  const handleExportLeads = async () => {
    if (exporting) return;
    setExporting('leads');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { alert('Not logged in.'); return; }
      await exportLeads(session.user.id);
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
      await exportNotes(session.user.id);
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
            ? 'Your free trial has ended. Upgrade your plan to continue accessing your ReachDesk CRM workspace.'
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

            <button
              onClick={async () => {
                if (!sheetsConnected) {
                  // Start OAuth — return user to dashboard after connecting
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) return;
                  sessionStorage.setItem('sheets_oauth_return', '/dashboard');
                  const redirectUri = `${window.location.origin}/auth/google-sheets/callback`;
                  const clientId = import.meta.env.VITE_GOOGLE_SHEETS_CLIENT_ID;
                  const scope = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';
                  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
                  window.location.href = authUrl;
                } else {
                  setShowSheetsExportModal(true);
                }
              }}
              disabled={!!exporting}
              style={{
                ...ghostBtnStyle,
                opacity: exporting ? 0.6 : 1
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--accent-blue)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              title={sheetsConnected ? 'Export all your leads directly to Google Sheets' : 'Connect Google Sheets to export your leads'}
            >
              <Database size={12} />
              <span>{sheetsConnected ? 'Export to Sheets' : 'Connect Sheets to Export'}</span>
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

      {showSheetsExportModal && (
        <ExportSheetsModal
          onClose={() => setShowSheetsExportModal(false)}
          leads={leads}
          currentUser={profile}
        />
      )}
    </div>
  );
}
