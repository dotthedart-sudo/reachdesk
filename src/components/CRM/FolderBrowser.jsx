import React from 'react';
import {
  Folder, FolderPlus, FileSpreadsheet, Sparkles, Users, ChevronRight,
  Upload, Database,
} from 'lucide-react';
import './FolderBrowser.css';

const SYSTEM_VIEWS = [
  { id: 'hot', label: 'Hot', iconColor: 'var(--status-hot)' },
  { id: 'warm', label: 'Warm', iconColor: 'var(--status-warm)' },
  { id: 'cold', label: 'Cold', iconColor: 'var(--status-cold)' },
  { id: 'needs-followup', label: 'Needs Follow-Up', iconColor: 'var(--accent-blue)' },
  { id: 'recently-followed-up', label: 'Recently Followed Up', iconColor: 'var(--accent-green)' },
  { id: 'calendly', label: 'Calendly Sent', iconColor: 'var(--accent-blue)' },
  { id: 'clients', label: 'Clients', iconColor: 'var(--accent-blue)' },
];

function ListCard({ icon: Icon, iconColor, name, count, subtitle, onClick, accent }) {
  return (
    <button type="button" className={`crm-list-card${accent ? ' crm-list-card--accent' : ''}`} onClick={onClick}>
      <div className="crm-list-card-icon" style={{ color: iconColor || 'var(--accent-blue)' }}>
        <Icon size={22} />
      </div>
      <div className="crm-list-card-body">
        <span className="crm-list-card-name">{name}</span>
        {subtitle && <span className="crm-list-card-sub">{subtitle}</span>}
      </div>
      <div className="crm-list-card-meta">
        <span className="crm-list-card-count">{count}</span>
        <ChevronRight size={16} className="crm-list-card-chevron" />
      </div>
    </button>
  );
}

export default function FolderBrowser({
  folders = [],
  userFolders = [],
  systemFolderNames = {},
  getLeadCount,
  totalLeads = 0,
  onSelectFolder,
  onCreateList,
  onCreateSmartList,
  onImportCsv,
  onImportSheets,
  canBulkImport = false,
  canUseIntegrations = false,
  hasLeads = true,
}) {
  const unfiledCount = getLeadCount?.('unfiled') ?? 0;

  return (
    <div className="crm-folder-browser">
      <div className="crm-folder-browser-header">
        <div>
          <h2 className="crm-folder-browser-title">Lead lists</h2>
          <p className="crm-folder-browser-desc">
            Open a list to work on a focused set of leads — like files in Google Drive. Your full pipeline stays organized without loading every lead at once.
          </p>
        </div>
        <div className="crm-folder-browser-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={onCreateList}>
            <FolderPlus size={14} /> New list
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCreateSmartList}>
            <Sparkles size={14} /> Smart list
          </button>
        </div>
      </div>

      {!hasLeads && (
        <div className="crm-folder-browser-empty card">
          <div className="crm-folder-browser-empty-icon">
            <Users size={28} />
          </div>
          <h3>No leads yet</h3>
          <p>Create a list after you import or add your first leads.</p>
          <div className="crm-folder-browser-empty-actions">
            {canBulkImport && onImportCsv && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={onImportCsv}>
                <Upload size={14} /> Import CSV
              </button>
            )}
            {canUseIntegrations && onImportSheets && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={onImportSheets}>
                <Database size={14} /> Import from Sheets
              </button>
            )}
          </div>
        </div>
      )}

      <section className="crm-folder-browser-section">
        <h3 className="crm-folder-browser-section-title">Your lists</h3>
        {folders.length === 0 ? (
          <p className="crm-folder-browser-hint">
            No lists yet. Create one manually or import from Google Sheets — each import can become its own list.
          </p>
        ) : (
          <div className="crm-list-grid">
            {folders.map((f) => (
              <ListCard
                key={f.id}
                icon={FileSpreadsheet}
                iconColor={f.color}
                name={f.name}
                count={getLeadCount?.(f.id) ?? 0}
                subtitle="Manual list"
                onClick={() => onSelectFolder(f.id)}
              />
            ))}
          </div>
        )}
      </section>

      {userFolders.length > 0 && (
        <section className="crm-folder-browser-section">
          <h3 className="crm-folder-browser-section-title">Smart lists</h3>
          <p className="crm-folder-browser-hint">Auto-updated by rules you define (status, priority, etc.).</p>
          <div className="crm-list-grid">
            {userFolders.map((uf) => (
              <ListCard
                key={uf.id}
                icon={Sparkles}
                iconColor="var(--accent-blue)"
                name={uf.name}
                count={getLeadCount?.(uf.id) ?? 0}
                subtitle="Smart filter"
                onClick={() => onSelectFolder(uf.id)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="crm-folder-browser-section">
        <h3 className="crm-folder-browser-section-title">System views</h3>
        <div className="crm-list-grid crm-list-grid--compact">
          {SYSTEM_VIEWS.map((sys) => (
            <ListCard
              key={sys.id}
              icon={Folder}
              iconColor={sys.iconColor}
              name={systemFolderNames[sys.id] || sys.label}
              count={getLeadCount?.(sys.id) ?? 0}
              onClick={() => onSelectFolder(sys.id)}
            />
          ))}
        </div>
      </section>

      <section className="crm-folder-browser-section crm-folder-browser-section--footer">
        <div className="crm-list-grid">
          <ListCard
            icon={Users}
            iconColor="var(--text-muted)"
            name={systemFolderNames.all || 'All leads'}
            count={totalLeads}
            subtitle="Full pipeline table"
            onClick={() => onSelectFolder('all')}
            accent
          />
          {unfiledCount > 0 && (
            <ListCard
              icon={Folder}
              iconColor="var(--text-muted)"
              name="Unfiled leads"
              count={unfiledCount}
              subtitle="Not in any list"
              onClick={() => onSelectFolder('unfiled')}
            />
          )}
        </div>
      </section>
    </div>
  );
}
