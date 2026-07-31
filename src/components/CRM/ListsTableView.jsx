import React from 'react';
import {
  FileSpreadsheet, Sparkles, ChevronRight,
} from 'lucide-react';
import ListRowMenu from './ListRowMenu';
import ResizableTh from './ResizableTh';
import ResizableTr from './ResizableTr';
import { useCrmTableLayout } from './useCrmTableLayout';
import './DataTableEnhancements.css';

function SectionHeader({ title, colSpan = 4 }) {
  return (
    <tr className="crm-lists-table-section">
      <td colSpan={colSpan}>{title}</td>
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
  onExportSheets,
  canExport = true,
  canExportSheets = false,
  showLocalTime = false,
  onToggleLocalTime,
  rowKey,
  height,
  onResizeRow,
  onResetRow,
  getWidth,
}) {
  const dateLine = formatListDate(createdAt);
  const w = (key) => {
    const width = getWidth?.(key);
    return width ? { width, minWidth: width, maxWidth: width } : undefined;
  };

  return (
    <ResizableTr
      className="crm-lists-table-row"
      rowKey={rowKey}
      height={height}
      onResize={onResizeRow}
      onReset={onResetRow}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <td className="crm-lists-table-name" style={w('list_name')}>
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
      <td className="crm-lists-table-type" style={w('type')}>
        <span className={`crm-lists-table-type-pill crm-lists-table-type-pill--${typeVariant}`}>
          {typeLabel}
        </span>
      </td>
      <td className="crm-lists-table-count" style={w('leads_count')}>{count}</td>
      <td className="crm-lists-table-actions" style={w('_actions')}>
        <ListRowMenu
          onOpen={onClick}
          onRename={onRename}
          onDelete={onDelete}
          onExport={onExport}
          onExportSheets={onExportSheets}
          canExport={canExport}
          canExportSheets={canExportSheets}
          showLocalTime={showLocalTime}
          onToggleLocalTime={onToggleLocalTime}
        />
        <ChevronRight size={16} className="crm-lists-table-chevron" aria-hidden />
      </td>
    </ResizableTr>
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
  onExportFolderSheets,
  canExportSheets = false,
  getFolderSettings,
  onToggleFolderLocalTime,
}) {
  const { getWidth, setWidth, resetWidth, getRowHeight, setRowHeight, resetRowHeight } =
    useCrmTableLayout('lists_home');

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
      <table className="crm-lists-table data-table--resizable">
        <thead>
          <tr>
            <ResizableTh columnKey="list_name" width={getWidth('list_name')} onResize={setWidth} onReset={resetWidth}>
              Name
            </ResizableTh>
            <ResizableTh columnKey="type" width={getWidth('type')} onResize={setWidth} onReset={resetWidth}>
              Type
            </ResizableTh>
            <ResizableTh columnKey="leads_count" width={getWidth('leads_count')} onResize={setWidth} onReset={resetWidth}>
              Leads
            </ResizableTh>
            <ResizableTh columnKey="_actions" width={getWidth('_actions')} onResize={setWidth} onReset={resetWidth} aria-label="Actions">
              {' '}
            </ResizableTh>
          </tr>
        </thead>
        <tbody>
          {folders.length > 0 && (
            <>
              <SectionHeader title="Your lists" />
              {folders.map((f) => (
                <ListRow
                  key={f.id}
                  rowKey={f.id}
                  height={getRowHeight(f.id)}
                  onResizeRow={setRowHeight}
                  onResetRow={resetRowHeight}
                  getWidth={getWidth}
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
                  onExportSheets={() => onExportFolderSheets?.(f.id)}
                  canExport
                  canExportSheets={canExportSheets}
                  showLocalTime={!!getFolderSettings?.(f.id)?.showLocalTime}
                  onToggleLocalTime={(val) => onToggleFolderLocalTime?.(f.id, val)}
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
                  rowKey={uf.id}
                  height={getRowHeight(uf.id)}
                  onResizeRow={setRowHeight}
                  onResetRow={resetRowHeight}
                  getWidth={getWidth}
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
