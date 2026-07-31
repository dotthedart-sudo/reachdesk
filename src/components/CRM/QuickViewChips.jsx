import React from 'react';
import { Folder, Users, LayoutGrid } from 'lucide-react';

function QuickViewChip({
  icon: Icon, iconColor, label, count, onClick,
}) {
  return (
    <button type="button" className="crm-quick-view-chip" onClick={onClick}>
      <Icon size={14} className="crm-quick-view-chip-icon" style={{ color: iconColor }} aria-hidden />
      <span className="crm-quick-view-chip-label">{label}</span>
      {count != null && (
        <span className="crm-quick-view-chip-count">{count}</span>
      )}
    </button>
  );
}

export default function QuickViewChips({
  systemViews = [],
  systemFolderNames = {},
  getLeadCount,
  totalLeads = 0,
  onSelectFolder,
}) {
  const unfiledCount = getLeadCount?.('unfiled') ?? 0;

  return (
    <div className="crm-quick-view-chips">
      <div className="crm-quick-view-chips-label">Quick views</div>
      <div className="crm-quick-view-chips-row">
        {systemViews.map((sys) => (
          <QuickViewChip
            key={sys.id}
            icon={Folder}
            iconColor={sys.iconColor}
            label={systemFolderNames[sys.id] || sys.label}
            count={getLeadCount?.(sys.id) ?? 0}
            onClick={() => onSelectFolder(sys.id)}
          />
        ))}
        <QuickViewChip
          icon={LayoutGrid}
          iconColor="var(--text-muted)"
          label={systemFolderNames.all || 'All leads'}
          count={totalLeads}
          onClick={() => onSelectFolder('all')}
        />
        {unfiledCount > 0 && (
          <QuickViewChip
            icon={Users}
            iconColor="var(--text-muted)"
            label="Unfiled leads"
            count={unfiledCount}
            onClick={() => onSelectFolder('unfiled')}
          />
        )}
      </div>
    </div>
  );
}
