import React, { useState, useEffect } from 'react';
import { Settings as Gear, Trash2, Plus, ArrowUp, ArrowDown, X, RefreshCw, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const LOCKED_CONTACT = [
  { key: 'name',     label: 'Name' },
  { key: 'status',   label: 'Status' },
  { key: 'platform', label: 'Reach' }
];
const LOCKED_CONTACT_KEYS = new Set(['name', 'status', 'platform', 'reach']);

const LOCKED_PIPELINE = [
  { key: 'name',     label: 'Name' },
  { key: 'status',   label: 'Status' }
];
const LOCKED_PIPELINE_KEYS = new Set(['name', 'status']);

export default function ColumnManager({
  isOpen,
  onClose,
  view, // initial view tab: 'contact_details' | 'pipeline'
  columns, // full array of all columnDefs across views
  onUpdateColumns,
  onResetToDefault,
  userId
}) {
  const [activeTab, setActiveTab] = useState('contact_details');
  const [allCols, setAllCols] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingLabel, setEditingLabel] = useState('');
  
  // Add column form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newColLabel, setNewColLabel] = useState('');
  const [newColType, setNewColType] = useState('text');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(view === 'pipeline' ? 'pipeline' : 'contact_details');
      setAllCols(JSON.parse(JSON.stringify(columns || [])));
      setShowAddForm(false);
    }
  }, [isOpen, columns, view]);

  const isContactTab = activeTab === 'contact_details';
  const currentLockedDisplay = isContactTab ? LOCKED_CONTACT : LOCKED_PIPELINE;
  const currentLockedKeys = isContactTab ? LOCKED_CONTACT_KEYS : LOCKED_PIPELINE_KEYS;

  // Filter current tab columns
  const currentTabCols = allCols.filter(c => c.table_view === activeTab);

  // Keys that belong to the locked system section — never show in "Your Columns"
  const HIDDEN_FROM_EDITABLE = new Set(['reach', 'custom_reach', 'platform', 'name', 'status']);

  // Editable cols = current tab cols excluding system locked columns and any stale system keys
  const editableCols = currentTabCols
    .map((c, i) => ({ ...c, _realIdx: i }))
    .filter(c => !currentLockedKeys.has(c.column_key) && !HIDDEN_FROM_EDITABLE.has(c.column_key));

  const updateCurrentTabCols = (newTabCols) => {
    const otherCols = allCols.filter(c => c.table_view !== activeTab);
    setAllCols([...otherCols, ...newTabCols]);
  };

  const handleToggleVisible = (realIdx) => {
    const updated = currentTabCols.map((c, i) => i === realIdx ? { ...c, is_visible: !c.is_visible } : c);
    updateCurrentTabCols(updated);
  };

  const handleStartRename = (col) => {
    setEditingId(col.id);
    setEditingLabel(col.column_label);
  };

  const handleSaveRename = (id) => {
    if (!editingLabel.trim()) return;
    const updated = currentTabCols.map(c => c.id === id ? { ...c, column_label: editingLabel.trim() } : c);
    updateCurrentTabCols(updated);
    setEditingId(null);
  };

  const handleMove = (realIdx, direction) => {
    const editableIdxs = currentTabCols.map((c, i) => ({ c, i })).filter(({ c }) => !currentLockedKeys.has(c.column_key)).map(({ i }) => i);
    const pos = editableIdxs.indexOf(realIdx);
    const targetPos = pos + direction;
    if (targetPos < 0 || targetPos >= editableIdxs.length) return;
    
    const list = [...currentTabCols];
    const targetRealIdx = editableIdxs[targetPos];
    const temp = list[realIdx];
    list[realIdx] = list[targetRealIdx];
    list[targetRealIdx] = temp;
    updateCurrentTabCols(list);
  };

  const handleDeleteCustom = (id) => {
    if (!confirm('Delete this custom column? Data in custom_fields will remain but won\'t be visible.')) return;
    const updated = currentTabCols.filter(c => c.id !== id);
    updateCurrentTabCols(updated);
  };

  const handleAddColumn = () => {
    if (!newColLabel.trim()) return;
    
    const key = 'custom_' + newColLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (currentTabCols.some(c => c.column_key === key)) {
      alert('A column with a similar name already exists.');
      return;
    }

    const newCol = {
      id: crypto.randomUUID(),
      user_id: userId,
      table_view: activeTab,
      column_key: key,
      column_label: newColLabel.trim(),
      column_type: newColType,
      is_visible: true,
      is_default: false,
      sort_order: currentTabCols.length,
      dropdown_options: newColType === 'dropdown' ? [
        { label: 'Option 1', color: '#3b82f6' },
        { label: 'Option 2', color: '#10b981' }
      ] : []
    };

    updateCurrentTabCols([...currentTabCols, newCol]);
    setNewColLabel('');
    setShowAddForm(false);
  };

  const handleSaveAll = async () => {
    try {
      const originalCustom = (columns || []).filter(c => !c.is_default);
      const remainingCustomIds = allCols.filter(c => !c.is_default).map(c => c.id);
      const deletedCustomIds = originalCustom.filter(c => !remainingCustomIds.includes(c.id)).map(c => c.id);

      if (deletedCustomIds.length > 0) {
        await supabase.from('column_definitions').delete().in('id', deletedCustomIds);
      }

      // Group by table_view to maintain proper sort_order per view
      const contactDefs = allCols.filter(c => c.table_view === 'contact_details').map((c, idx) => ({ ...c, user_id: userId, sort_order: idx }));
      const pipelineDefs = allCols.filter(c => c.table_view === 'pipeline').map((c, idx) => ({ ...c, user_id: userId, sort_order: idx }));
      const otherDefs = allCols.filter(c => c.table_view !== 'contact_details' && c.table_view !== 'pipeline').map((c, idx) => ({ ...c, user_id: userId, sort_order: idx }));

      const upsertPayload = [...contactDefs, ...pipelineDefs, ...otherDefs].map(c => ({
        id: c.id,
        user_id: userId,
        table_view: c.table_view,
        column_key: c.column_key,
        column_label: c.column_label,
        column_type: c.column_type,
        is_visible: c.is_visible,
        is_default: c.is_default,
        sort_order: c.sort_order,
        dropdown_options: c.dropdown_options
      }));

      const { data, error } = await supabase
        .from('column_definitions')
        .upsert(upsertPayload)
        .select();

      if (error) throw error;

      if (onUpdateColumns) {
        onUpdateColumns(data);
      }
      onClose();
    } catch (err) {
      console.error('Error saving column configuration:', err);
      alert('Failed to save columns: ' + err.message);
    }
  };

  // Drag and Drop for editable columns only
  const [dragRealIdx, setDragRealIdx] = useState(null);

  const handleDragStart = (e, realIdx) => {
    setDragRealIdx(realIdx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, realIdx) => {
    e.preventDefault();
    if (dragRealIdx === null || dragRealIdx === realIdx) return;
    
    const list = [...currentTabCols];
    const draggedItem = list[dragRealIdx];
    list.splice(dragRealIdx, 1);
    list.splice(realIdx, 0, draggedItem);
    setDragRealIdx(realIdx);
    updateCurrentTabCols(list);
  };

  const handleDragEnd = () => setDragRealIdx(null);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" style={{ justifyContent: 'flex-end', backdropFilter: 'blur(3px)' }}>
      <div 
        className="modal-content"
        style={{
          maxWidth: '420px',
          height: '100vh',
          borderRadius: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.3)',
          borderLeft: '0.5px solid var(--border)',
          borderTop: 'none',
          borderRight: 'none',
          borderBottom: 'none',
          animation: 'slideInRight 0.3s ease-out',
          textAlign: 'left'
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-heading)' }}>
              <Gear size={16} /> Column Management
            </h3>
          </div>
          <button type="button" onClick={onClose} className="theme-toggle"><X size={18} /></button>
        </div>

        {/* View Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <button
            type="button"
            onClick={() => { setActiveTab('contact_details'); setShowAddForm(false); }}
            style={{
              flex: 1, padding: '0.6rem', border: 'none', background: 'transparent',
              color: activeTab === 'contact_details' ? 'var(--accent-blue)' : 'var(--text-muted)',
              borderBottom: activeTab === 'contact_details' ? '2px solid var(--accent-blue)' : '2px solid transparent',
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer'
            }}
          >
            Contact Details
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('pipeline'); setShowAddForm(false); }}
            style={{
              flex: 1, padding: '0.6rem', border: 'none', background: 'transparent',
              color: activeTab === 'pipeline' ? 'var(--accent-blue)' : 'var(--text-muted)',
              borderBottom: activeTab === 'pipeline' ? '2px solid var(--accent-blue)' : '2px solid transparent',
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer'
            }}
          >
            Pipeline
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem 1rem 1rem 0', paddingRight: '4px' }}>

          {/* ── SECTION 1: Always Visible ─────────────────── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <Lock size={11} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Always visible</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {currentLockedDisplay.map(item => (
                <div
                  key={item.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--bg-card)',
                    border: '0.5px solid var(--border)',
                    borderRadius: '4px',
                    opacity: 0.7,
                  }}
                >
                  <Lock size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-body)', flex: 1, color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.06em' }}>Locked</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── SECTION 2: Your Columns ───────────────────── */}
          <div>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Your columns</span>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginTop: '2px' }}>
                Drag to reorder · toggle to show/hide
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {editableCols.map((col, editIdx) => (
                <div
                  key={col.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, col._realIdx)}
                  onDragOver={(e) => handleDragOver(e, col._realIdx)}
                  onDragEnd={handleDragEnd}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.5rem 0.75rem',
                    background: dragRealIdx === col._realIdx ? 'rgba(91,143,185,0.08)' : 'var(--bg-card)',
                    border: dragRealIdx === col._realIdx ? '0.5px solid var(--accent-blue)' : '0.5px solid var(--border)',
                    borderRadius: '4px',
                    cursor: 'grab',
                    transition: 'background-color 0.15s'
                  }}
                >
                  {/* Drag handle */}
                  <div style={{ color: 'var(--text-muted)', fontSize: '1rem', cursor: 'grab', userSelect: 'none', lineHeight: 1 }}>⋮⋮</div>

                  {/* Toggle */}
                  <input
                    type="checkbox"
                    checked={col.is_visible}
                    onChange={() => handleToggleVisible(col._realIdx)}
                    style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: 'var(--accent-blue)' }}
                  />

                  {/* Label */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editingId === col.id ? (
                      <input
                        type="text"
                        value={editingLabel}
                        onChange={e => setEditingLabel(e.target.value)}
                        onBlur={() => handleSaveRename(col.id)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveRename(col.id)}
                        className="form-input"
                        style={{ padding: '0.15rem 0.35rem', fontSize: '0.82rem', width: '100%' }}
                        autoFocus
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span
                          onClick={() => handleStartRename(col)}
                          style={{ fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)', color: col.is_visible ? 'var(--text-primary)' : 'var(--text-muted)' }}
                          title="Click to rename"
                        >
                          {col.column_label}
                        </span>
                        {!col.is_default && (
                          <span style={{
                            fontSize: '0.6rem', background: 'rgba(91,143,185,0.12)', color: 'var(--accent-blue)',
                            border: '0.5px solid rgba(91,143,185,0.3)', borderRadius: '3px', padding: '1px 5px',
                            fontFamily: 'var(--font-body)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600
                          }}>
                            Custom
                          </span>
                        )}
                      </div>
                    )}
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', textTransform: 'capitalize' }}>
                      {col.column_type}
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleMove(col._realIdx, -1)}
                      disabled={editIdx === 0}
                      className="btn-icon"
                      style={{ padding: '0.15rem', color: editIdx === 0 ? 'var(--text-muted)' : 'var(--text-secondary)' }}
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(col._realIdx, 1)}
                      disabled={editIdx === editableCols.length - 1}
                      className="btn-icon"
                      style={{ padding: '0.15rem', color: editIdx === editableCols.length - 1 ? 'var(--text-muted)' : 'var(--text-secondary)' }}
                    >
                      <ArrowDown size={13} />
                    </button>
                    {!col.is_default && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustom(col.id)}
                        className="btn-icon"
                        style={{ padding: '0.15rem', color: 'var(--status-hot)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Custom Column Form */}
          {showAddForm ? (
            <div 
              style={{ 
                padding: '1rem', 
                background: 'var(--bg-card)', 
                border: '0.5px solid var(--border)',
                borderRadius: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              <h4 style={{ fontSize: '0.85rem', fontFamily: 'var(--font-heading)' }}>Add Custom Column ({isContactTab ? 'Contact Details' : 'Pipeline'})</h4>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Column Label</label>
                <input
                  type="text"
                  placeholder="e.g. Lead Source"
                  value={newColLabel}
                  onChange={e => setNewColLabel(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Data Type</label>
                <select
                  value={newColType}
                  onChange={e => setNewColType(e.target.value)}
                  className="form-select"
                >
                  <option value="text">Text</option>
                  <option value="dropdown">Dropdown</option>
                  <option value="date">Date</option>
                  <option value="number">Number</option>
                  <option value="link">URL Link</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end" style={{ marginTop: '0.25rem' }}>
                <button type="button" onClick={() => setShowAddForm(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="button" onClick={handleAddColumn} className="btn btn-primary btn-sm">Add Column</button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="btn btn-secondary w-full"
              style={{ justifyContent: 'center', fontSize: '0.8rem' }}
            >
              <Plus size={13} /> Add Custom Column
            </button>
          )}
        </div>

        {/* Footer actions */}
        <div 
          style={{ 
            borderTop: '0.5px solid var(--border)', 
            paddingTop: '1rem', 
            marginTop: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}
        >
          <button
            type="button"
            onClick={() => onResetToDefault(activeTab)}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center', borderColor: 'rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.8rem' }}
          >
            <RefreshCw size={13} /> Reset {isContactTab ? 'Contact Details' : 'Pipeline'} to Default
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1" style={{ justifyContent: 'center', fontSize: '0.8rem' }}>
              Cancel
            </button>
            <button type="button" onClick={handleSaveAll} className="btn btn-primary flex-1" style={{ justifyContent: 'center', fontSize: '0.8rem' }}>
              Save Layout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
