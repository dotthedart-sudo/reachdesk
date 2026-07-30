import React from 'react';
import {
  Folder, FileSpreadsheet, Sparkles, Users, ChevronRight,
} from 'lucide-react';

function SectionHeader({ title }) {
  return (
    <tr className="crm-lists-table-section">
      <td colSpan={4}>{title}</td>
    </tr>
  );
}

function ListRow({ icon: Icon, iconColor, name, typeLabel, count, onClick }) {
  return (
    <tr className="crm-lists-table-row" onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <td className="crm-lists-table-name">
        <span className="crm-lists-table-icon" style={{ color: iconColor || 'var(--accent-blue)' }}>
          <Icon size={18} />
        </span>
        <span className="crm-lists-table-name-text">{name}</span>
      </td>
      <td className="crm-lists-table-type">{typeLabel}</td>
      <td className="crm-lists-table-count">{count}</td>
      <td className="crm-lists-table-open">
        <ChevronRight size={16} aria-hidden />
      </td>
    </tr>
  );
}

export default function ListsTableView({
  folders = [],
  userFolders = [],
  systemFolderNames = {},
  systemViews = [],
  getLeadCount,
  totalLeads = 0,
  onSelectFolder,
}) {
  const unfiledCount = getLeadCount?.('unfiled') ?? 0;

  const hasAnyRows =
    folders.length > 0 ||
    userFolders.length > 0 ||
    systemViews.length > 0 ||
    totalLeads > 0 ||
    unfiledCount > 0;

  if (!hasAnyRows) {
    return (
      <div className="crm-lists-table-empty">
        <p>No lists yet. Create a manual list or auto list above, or import leads to get started.</p>
      </div>
    );
  }

  return (
    <div className="crm-lists-table-wrap">
      <table className="crm-lists-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Leads</th>
            <th aria-label="Open" />
          </tr>
        </thead>
        <tbody>
          {folders.length > 0 && (
            <>
              <SectionHeader title="Your lists" />
              {folders.map((f) => (
                <ListRow
                  key={f.id}
                  icon={FileSpreadsheet}
                  iconColor={f.color}
                  name={f.name}
                  typeLabel="Manual list"
                  count={getLeadCount?.(f.id) ?? 0}
                  onClick={() => onSelectFolder(f.id)}
                />
              ))}
            </>
          )}

          {userFolders.length > 0 && (
            <>
              <SectionHeader title="Auto lists" />
              {userFolders.map((uf) => (
                <ListRow
                  key={uf.id}
                  icon={Sparkles}
                  iconColor="var(--accent-blue)"
                  name={uf.name}
                  typeLabel="Auto list"
                  count={getLeadCount?.(uf.id) ?? 0}
                  onClick={() => onSelectFolder(uf.id)}
                />
              ))}
            </>
          )}

          <SectionHeader title="Quick views" />
          {systemViews.map((sys) => (
            <ListRow
              key={sys.id}
              icon={Folder}
              iconColor={sys.iconColor}
              name={systemFolderNames[sys.id] || sys.label}
              typeLabel="System view"
              count={getLeadCount?.(sys.id) ?? 0}
              onClick={() => onSelectFolder(sys.id)}
            />
          ))}
          <ListRow
            icon={Users}
            iconColor="var(--text-muted)"
            name={systemFolderNames.all || 'All leads'}
            typeLabel="System view"
            count={totalLeads}
            onClick={() => onSelectFolder('all')}
          />
          {unfiledCount > 0 && (
            <ListRow
              icon={Folder}
              iconColor="var(--text-muted)"
              name="Unfiled leads"
              typeLabel="System view"
              count={unfiledCount}
              onClick={() => onSelectFolder('unfiled')}
            />
          )}
        </tbody>
      </table>
    </div>
  );
}
