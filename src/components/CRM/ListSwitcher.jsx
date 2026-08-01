import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown, Folder, FileSpreadsheet, Sparkles, LayoutGrid, Users,
} from 'lucide-react';
import { SYSTEM_VIEWS } from './FolderBrowser';
import './FolderBrowser.css';

function SwitcherItem({ icon: Icon, iconColor, label, count, active, onClick }) {
  return (
    <button
      type="button"
      className={`crm-list-switcher-item${active ? ' crm-list-switcher-item--active' : ''}`}
      onClick={onClick}
    >
      <Icon size={14} style={{ color: iconColor, flexShrink: 0 }} />
      <span className="crm-list-switcher-item-label">{label}</span>
      {count != null && (
        <span className="crm-list-switcher-item-count">{count}</span>
      )}
    </button>
  );
}

function SwitcherSection({ title, children }) {
  if (!children) return null;
  return (
    <div className="crm-list-switcher-section">
      <div className="crm-list-switcher-section-title">{title}</div>
      {children}
    </div>
  );
}

export default function ListSwitcher({
  activeFolderId,
  currentLabel,
  folders = [],
  userFolders = [],
  systemFolderNames = {},
  getLeadCount,
  onSelectFolder,
  teamProfilesMap = {},
  currentUserId,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const pick = (id) => {
    setOpen(false);
    onSelectFolder(id);
  };

  const creatorSuffix = (userId) => {
    if (!userId || userId === currentUserId) return '';
    const p = teamProfilesMap[userId];
    const name = p?.full_name || p?.email;
    return name ? ` · ${name.split(' ')[0]}` : '';
  };

  const unfiledCount = getLeadCount?.('unfiled') ?? 0;

  return (
    <div className="crm-list-switcher" ref={rootRef}>
      <button
        type="button"
        className="crm-list-switcher-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="crm-list-switcher-trigger-label">{currentLabel}</span>
        <ChevronDown size={14} className={`crm-list-switcher-chevron${open ? ' crm-list-switcher-chevron--open' : ''}`} />
      </button>

      {open && (
        <div className="crm-list-switcher-menu" role="listbox">
          {folders.length > 0 && (
            <SwitcherSection title="Your lists">
              {folders.map((f) => (
                <SwitcherItem
                  key={f.id}
                  icon={FileSpreadsheet}
                  iconColor={f.color}
                  label={`${f.name}${creatorSuffix(f.user_id)}`}
                  count={getLeadCount?.(f.id)}
                  active={activeFolderId === f.id}
                  onClick={() => pick(f.id)}
                />
              ))}
            </SwitcherSection>
          )}

          {userFolders.length > 0 && (
            <SwitcherSection title="Auto lists">
              {userFolders.map((uf) => (
                <SwitcherItem
                  key={uf.id}
                  icon={Sparkles}
                  iconColor="var(--accent-blue)"
                  label={uf.name}
                  count={getLeadCount?.(uf.id)}
                  active={activeFolderId === uf.id}
                  onClick={() => pick(uf.id)}
                />
              ))}
            </SwitcherSection>
          )}

          <SwitcherSection title="Quick views">
            {SYSTEM_VIEWS.map((sys) => (
              <SwitcherItem
                key={sys.id}
                icon={Folder}
                iconColor={sys.iconColor}
                label={systemFolderNames[sys.id] || sys.label}
                count={getLeadCount?.(sys.id)}
                active={activeFolderId === sys.id}
                onClick={() => pick(sys.id)}
              />
            ))}
            <SwitcherItem
              icon={LayoutGrid}
              iconColor="var(--text-muted)"
              label={systemFolderNames.all || 'All leads'}
              count={getLeadCount?.('all')}
              active={activeFolderId === 'all'}
              onClick={() => pick('all')}
            />
            {unfiledCount > 0 && (
              <SwitcherItem
                icon={Users}
                iconColor="var(--text-muted)"
                label="Unfiled leads"
                count={unfiledCount}
                active={activeFolderId === 'unfiled'}
                onClick={() => pick('unfiled')}
              />
            )}
          </SwitcherSection>
        </div>
      )}
    </div>
  );
}
