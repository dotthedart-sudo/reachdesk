import React from 'react';
import {
  FileSpreadsheet, Sparkles, ChevronRight,
} from 'lucide-react';
import ListRowMenu from './ListRowMenu';
import ResizableTh from './ResizableTh';
import ResizableTr from './ResizableTr';
import { useCrmTableLayout } from './useCrmTableLayout';
import './DataTableEnhancements.css';

function SectionHeader({ title, colSpan = 5 }) {
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

function creatorLabel(userId, teamProfilesMap, currentUserId) {
  if (!userId) return '—';
  if (userId === currentUserId) return 'You';
  const p = teamProfilesMap?.[userId];
  return p?.full_name || p?.email || 'Teammate';
}

function ListRow({
  icon: Icon,
  iconColor,
  name,
  typeLabel,
  typeVariant,
  count,
  createdAt,
  createdBy,
  shareBadge,
  onClick,
  onRename,
  onDelete,
  onExport,
  onExportSheets,
  onShare,
  canShare = false,
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
          <span className="crm-lists-table-name-sub">
            {shareBadge || (dateLine ? dateLine : null)}
          </span>
        </span>
      </td>
      <td className="crm-lists-table-type" style={w('type')}>
        <span className={`crm-lists-table-type-pill crm-lists-table-type-pill--${typeVariant}`}>
          {typeLabel}
        </span>
      </td>
      <td className="crm-lists-table-count" style={w('leads_count')}>{count}</td>
      <td style={{ ...w('created_by'), fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
        {createdBy}
      </td>
      <td className="crm-lists-table-actions" style={w('_actions')}>
        <ListRowMenu
          onOpen={onClick}
          onRename={onRename}
          onDelete={onDelete}
          onExport={onExport}
          onExportSheets={onExportSheets}
          onShare={onShare}
          canShare={canShare}
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

function renderFolderRows({
  list,
  getWidth,
  getRowHeight,
  setRowHeight,
  resetRowHeight,
  getLeadCount,
  teamProfilesMap,
  currentUserId,
  shareCountForFolder,
  onSelectFolder,
  onRenameFolder,
  onDeleteFolder,
  onExportFolder,
  onExportFolderSheets,
  onShareFolder,
  canExportSheets,
  getFolderSettings,
  onToggleFolderLocalTime,
  canShareFolder,
}) {
  return list.map((f) => {
    const shares = shareCountForFolder?.(f.id) || 0;
    const isOwn = f.user_id === currentUserId;
    const shareBadge = isOwn && shares > 0
      ? `Shared · ${shares} member${shares === 1 ? '' : 's'}`
      : (!isOwn ? 'Shared with you' : null);

    return (
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
        createdBy={creatorLabel(f.user_id, teamProfilesMap, currentUserId)}
        shareBadge={shareBadge}
        onClick={() => onSelectFolder(f.id)}
        onRename={isOwn ? () => onRenameFolder?.(f.id, f.name) : undefined}
        onDelete={isOwn ? () => onDeleteFolder?.(f.id) : undefined}
        onExport={() => onExportFolder?.(f.id)}
        onExportSheets={() => onExportFolderSheets?.(f.id)}
        onShare={canShareFolder?.(f) ? () => onShareFolder?.(f) : undefined}
        canShare={!!canShareFolder?.(f)}
        canExport
        canExportSheets={canExportSheets}
        showLocalTime={!!getFolderSettings?.(f.id)?.showLocalTime}
        onToggleLocalTime={(val) => onToggleFolderLocalTime?.(f.id, val)}
      />
    );
  });
}

export default function ListsTableView({
  folders = [],
  userFolders = [],
  listSections = null,
  getLeadCount,
  onSelectFolder,
  onRenameFolder,
  onDeleteFolder,
  onDeleteSmartFolder,
  onExportFolder,
  onExportFolderSheets,
  onShareFolder,
  canExportSheets = false,
  getFolderSettings,
  onToggleFolderLocalTime,
  teamProfilesMap = {},
  currentUserId,
  shareCountForFolder,
  canShareFolder,
}) {
  const { getWidth, setWidth, resetWidth, getRowHeight, setRowHeight, resetRowHeight } =
    useCrmTableLayout('lists_home');

  const sections = listSections || {
    mine: folders.filter((f) => f.user_id === currentUserId),
    sharedWithMe: folders.filter((f) => f.user_id !== currentUserId),
    team: [],
    auto: userFolders,
  };

  const hasLists = (sections.mine?.length || 0)
    + (sections.sharedWithMe?.length || 0)
    + (sections.team?.length || 0)
    + (sections.auto?.length || 0) > 0;

  if (!hasLists) {
    return (
      <div className="crm-lists-table-empty">
        <p>No lists in this view. Create a list or switch filters.</p>
      </div>
    );
  }

  const rowProps = {
    getWidth,
    getRowHeight,
    setRowHeight,
    resetRowHeight,
    getLeadCount,
    teamProfilesMap,
    currentUserId,
    shareCountForFolder,
    onSelectFolder,
    onRenameFolder,
    onDeleteFolder,
    onExportFolder,
    onExportFolderSheets,
    onShareFolder,
    canExportSheets,
    getFolderSettings,
    onToggleFolderLocalTime,
    canShareFolder,
  };

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
            <ResizableTh columnKey="created_by" width={getWidth('created_by')} onResize={setWidth} onReset={resetWidth}>
              Created by
            </ResizableTh>
            <ResizableTh columnKey="_actions" width={getWidth('_actions')} onResize={setWidth} onReset={resetWidth} aria-label="Actions">
              {' '}
            </ResizableTh>
          </tr>
        </thead>
        <tbody>
          {sections.mine?.length > 0 && (
            <>
              <SectionHeader title="My lists" />
              {renderFolderRows({ list: sections.mine, ...rowProps })}
            </>
          )}
          {sections.sharedWithMe?.length > 0 && (
            <>
              <SectionHeader title="Shared with me" />
              {renderFolderRows({ list: sections.sharedWithMe, ...rowProps })}
            </>
          )}
          {sections.team?.length > 0 && (
            <>
              <SectionHeader title="Team lists" />
              {renderFolderRows({ list: sections.team, ...rowProps })}
            </>
          )}
          {sections.auto?.length > 0 && (
            <>
              <SectionHeader title="Auto lists" />
              {sections.auto.map((uf) => (
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
                  createdBy={creatorLabel(uf.user_id, teamProfilesMap, currentUserId)}
                  onClick={() => onSelectFolder(uf.id)}
                  onRename={uf.user_id === currentUserId ? () => onRenameFolder?.(uf.id, uf.name) : undefined}
                  onDelete={uf.user_id === currentUserId ? () => onDeleteSmartFolder?.(uf.id) : undefined}
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
