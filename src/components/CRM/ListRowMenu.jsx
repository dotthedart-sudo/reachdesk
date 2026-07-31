import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, FolderOpen, Pencil, Download, Trash2 } from 'lucide-react';

export default function ListRowMenu({
  onOpen,
  onRename,
  onDelete,
  onExport,
  canExport = true,
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

  const run = (fn) => (e) => {
    e.stopPropagation();
    setOpen(false);
    fn?.();
  };

  const toggle = (e) => {
    e.stopPropagation();
    setOpen((v) => !v);
  };

  return (
    <div className="crm-list-row-menu" ref={rootRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="crm-list-row-menu-trigger"
        aria-label="List actions"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={toggle}
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div className="crm-list-row-menu-panel" role="menu">
          <button type="button" className="crm-list-row-menu-item" role="menuitem" onClick={run(onOpen)}>
            <FolderOpen size={14} />
            Open
          </button>
          <button type="button" className="crm-list-row-menu-item" role="menuitem" onClick={run(onRename)}>
            <Pencil size={14} />
            Rename
          </button>
          {canExport && onExport && (
            <button type="button" className="crm-list-row-menu-item" role="menuitem" onClick={run(onExport)}>
              <Download size={14} />
              Export CSV
            </button>
          )}
          <button
            type="button"
            className="crm-list-row-menu-item crm-list-row-menu-item--danger"
            role="menuitem"
            onClick={run(onDelete)}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
