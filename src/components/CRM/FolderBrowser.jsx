import React from 'react';
import {
  FolderPlus, Sparkles, Users, Upload, Database,
} from 'lucide-react';
import QuickViewChips from './QuickViewChips';
import ListsTableView from './ListsTableView';
import './FolderBrowser.css';

export const SYSTEM_VIEWS = [
  { id: 'hot', label: 'Hot', iconColor: 'var(--status-hot)' },
  { id: 'warm', label: 'Warm', iconColor: 'var(--status-warm)' },
  { id: 'cold', label: 'Cold', iconColor: 'var(--status-cold)' },
  { id: 'needs-followup', label: 'Needs Follow-Up', iconColor: 'var(--accent-blue)' },
  { id: 'recently-followed-up', label: 'Recently Followed Up', iconColor: 'var(--accent-green)' },
  { id: 'calendly', label: 'Calendly Sent', iconColor: 'var(--accent-blue)' },
  { id: 'clients', label: 'Clients', iconColor: 'var(--accent-blue)' },
];

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
  onRenameFolder,
  onDeleteFolder,
  onDeleteSmartFolder,
  onExportFolder,
  canBulkImport = false,
  canUseIntegrations = false,
  hasLeads = true,
}) {
  return (
    <div className="crm-folder-browser crm-folder-browser--full">
      <div className="crm-folder-browser-header">
        <div>
          <h2 className="crm-folder-browser-title">Lists</h2>
          <p className="crm-folder-browser-desc">
            Your lists hold assigned leads. Quick views filter by priority or status.
          </p>
        </div>
        <div className="crm-folder-browser-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={onCreateList}>
            <FolderPlus size={14} /> Manual list
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCreateSmartList}>
            <Sparkles size={14} /> Auto list
          </button>
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

      {!hasLeads && (
        <div className="crm-folder-browser-empty-inline">
          <div className="crm-folder-browser-empty-icon">
            <Users size={24} />
          </div>
          <div>
            <strong>No leads yet</strong>
            <p>Use Import CSV or Import from Sheets above — each import can become its own list.</p>
          </div>
        </div>
      )}

      <QuickViewChips
        systemViews={SYSTEM_VIEWS}
        systemFolderNames={systemFolderNames}
        getLeadCount={getLeadCount}
        totalLeads={totalLeads}
        onSelectFolder={onSelectFolder}
      />

      <ListsTableView
        folders={folders}
        userFolders={userFolders}
        getLeadCount={getLeadCount}
        onSelectFolder={onSelectFolder}
        onRenameFolder={onRenameFolder}
        onDeleteFolder={onDeleteFolder}
        onDeleteSmartFolder={onDeleteSmartFolder}
        onExportFolder={onExportFolder}
      />
    </div>
  );
}
