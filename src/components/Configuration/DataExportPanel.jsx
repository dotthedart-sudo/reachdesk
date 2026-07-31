import React from 'react';
import { Download, FileText } from 'lucide-react';

export default function DataExportPanel({
  exporting,
  onExportLeads,
  onExportNotes,
}) {
  return (
    <div className="card flex-col gap-3">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
        <Download size={18} style={{ color: 'var(--primary-purple)' }} />
        <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Data Export (Backup)</h3>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
        Download a proactive backup of your freelance data at any time. Leads are exported as a CSV spreadsheet, and notes are exported as a structured plain text document.
      </p>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onExportLeads}
          disabled={exporting === 'leads'}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Download size={14} />
          {exporting === 'leads' ? 'Exporting...' : 'Export Leads (CSV)'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onExportNotes}
          disabled={exporting === 'notes'}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <FileText size={14} />
          {exporting === 'notes' ? 'Exporting...' : 'Export Notes (TXT)'}
        </button>
      </div>
    </div>
  );
}
