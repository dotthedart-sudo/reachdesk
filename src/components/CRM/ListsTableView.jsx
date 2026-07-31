import React from 'react';
import {
  FileSpreadsheet, Sparkles, ChevronRight,
} from 'lucide-react';
import ListRowMenu from './ListRowMenu';

function SectionHeader({ title }) {
  return (
    <tr className="crm-lists-table-section">
      <td colSpan={4}>{title}</td>
    </tr>
  );
}

function formatListDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return null;
  }
}

function ListRow({
  icon: Icon,
  iconColor,
  name,
  typeLabel,
  typeVariant,
  count,
  createdAt,
  onClick,
  onRename,
  onDelete,
  onExport,
  canExport = true,
}) {
  const dateLine = formatListDate(createdAt);

  return (
    <tr
      className="crm-lists-table-row"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <td className="crm-lists-table-name">
        <span className="crm-lists-table-icon" style={{ color: iconColor || 'var(--accent-blue)' }}>
          <Icon size={18} />
        </span>
        <span className="crm-lists-table-name-col">
          <span className="crm-lists-table-name-text">{name}</span>
          {dateLine && (
            <span className="crm-lists-table-name-sub">{dateLine}</span>
          )}
        </span>
      </td>
      <td className="crm-lists-table-type">
        <span className={`crm-lists-table-type-pill crm-lists-table-type-pill--${typeVariant}`}>
          {typeLabel}
        </span>
      </td>
      <td className="crm-lists-table-count">{count}</td>
      <td className="crm-lists-table-actions">
        <ListRowMenu
          onOpen={onClick}
          onRename={onRename}
          onDelete={onDelete}
          onExport={onExport}
          canExport={canExport}
        />
        <ChevronRight size={16} className="crm-lists-table-chevron" aria-hidden />
      </td>
    </tr>
  );
}

export default function ListsTableView({
  folders = [],
  userFolders = [],
  getLeadCount,
  onSelectFolder,
  onRenameFolder,
  onDeleteFolder,
  onDeleteSmartFolder,
  onExportFolder,
}) {
  const hasOwnedLists = folders.length > 0 || userFolders.length > 0;

  if (!hasOwnedLists) {
    return (
      <div className="crm-lists-table-empty">
        <p>Create a manual list or auto list above, or import leads to get started.</p>
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
            <th aria-label="Actions" />
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
                  typeLabel="Manual"
                  typeVariant="manual"
                  count={getLeadCount?.(f.id) ?? 0}
                  createdAt={f.created_at}
                  onClick={() => onSelectFolder(f.id)}
                  onRename={() => onRenameFolder?.(f.id, f.name)}
                  onDelete={() => onDeleteFolder?.(f.id)}
                  onExport={() => onExportFolder?.(f.id)}
                  canExport
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
                  typeLabel="Auto"
                  typeVariant="auto"
                  count={getLeadCount?.(uf.id) ?? 0}
                  createdAt={uf.created_at}
                  onClick={() => onSelectFolder(uf.id)}
                  onRename={() => onRenameFolder?.(uf.id, uf.name)}
                  onDelete={() => onDeleteSmartFolder?.(uf.id)}
                  canExport={false}
                />
              ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
