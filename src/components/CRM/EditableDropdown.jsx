import React, { useState, useEffect, useRef } from 'react';
import { Pencil, Plus, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const PRESET_COLORS = [
  '#ef4444', // Red
  '#f59e0b', // Amber/Yellow
  '#10b981', // Emerald/Green
  '#3b82f6', // Blue
  '#8b5cf6', // Violet/Purple
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#6b7280'  // Slate/Gray
];

export default function EditableDropdown({
  value,
  columnDef,
  onChange,
  onUpdateColumnDef
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const dropdownRef = useRef(null);

  // Modal State
  const [options, setOptions] = useState([]);
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionColor, setNewOptionColor] = useState(PRESET_COLORS[0]);

  const rawOptions = columnDef?.dropdown_options || [];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenEditOptions = (e) => {
    e.stopPropagation();
    setOptions(JSON.parse(JSON.stringify(rawOptions))); // Deep copy
    setShowEditModal(true);
    setIsOpen(false);
  };

  const handleAddOption = () => {
    if (!newOptionLabel.trim()) return;
    if (options.some(opt => opt.label.trim().toLowerCase() === newOptionLabel.trim().toLowerCase())) {
      alert('Option already exists.');
      return;
    }
    const newOpt = {
      label: newOptionLabel.trim(),
      color: newOptionColor
    };
    setOptions([...options, newOpt]);
    setNewOptionLabel('');
  };

  const handleRemoveOption = (index) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleMoveOption = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= options.length) return;
    const updated = [...options];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setOptions(updated);
  };

  const handleSaveOptions = async () => {
    try {
      const { error } = await supabase
        .from('column_definitions')
        .update({ dropdown_options: options })
        .eq('id', columnDef.id);

      if (error) throw error;

      if (onUpdateColumnDef) {
        onUpdateColumnDef(columnDef.id, options);
      }
      setShowEditModal(false);
    } catch (err) {
      console.error('Error saving dropdown options:', err);
      alert('Failed to save options: ' + err.message);
    }
  };

  // Find current option style
  const currentOpt = rawOptions.find(opt => opt.label === value) || { label: value || 'None', color: '#6b7280' };
  const chipStyle = {
    background: `${currentOpt.color}18`,
    color: currentOpt.color,
    border: `1px solid ${currentOpt.color}44`,
    padding: '0.2rem 0.6rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    whiteSpace: 'nowrap'
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} style={chipStyle} type="button">
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: currentOpt.color }} />
        {currentOpt.label}
      </button>

      {isOpen && (
        <div 
          className="dropdown-menu"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            boxShadow: 'var(--glow-shadow)',
            zIndex: 1000,
            minWidth: '160px',
            marginTop: '4px',
            maxHeight: '220px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            padding: '4px'
          }}
        >
          {rawOptions.map(opt => (
            <button
              key={opt.label}
              type="button"
              className="dropdown-item"
              onClick={() => {
                onChange(opt.label);
                setIsOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                border: 'none',
                background: value === opt.label ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                color: 'var(--text-primary)',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: '6px',
                fontSize: '0.85rem'
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: opt.color }} />
              {opt.label}
            </button>
          ))}
          {rawOptions.length === 0 && (
            <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              No options configured.
            </div>
          )}
          <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
          <button
            type="button"
            className="dropdown-item text-primary"
            onClick={handleOpenEditOptions}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.75rem',
              border: 'none',
              background: 'transparent',
              color: 'var(--primary-purple)',
              cursor: 'pointer',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
          >
            <Pencil size={12} /> Edit Options
          </button>
        </div>
      )}

      {/* Edit Options Modal */}
      {showEditModal && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '450px', width: '90%', padding: '1.5rem' }}>
            <div className="modal-header">
              <h3>Edit {columnDef?.column_label || 'Options'}</h3>
              <button type="button" onClick={() => setShowEditModal(false)} className="theme-toggle"><X size={18} /></button>
            </div>

            <div className="flex-col gap-3" style={{ marginTop: '0.5rem' }}>
              {/* Option List */}
              <div 
                className="flex-col gap-2" 
                style={{ 
                  maxHeight: '200px', 
                  overflowY: 'auto', 
                  paddingRight: '4px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '8px',
                  background: 'var(--bg-secondary)'
                }}
              >
                {options.map((opt, idx) => (
                  <div 
                    key={idx} 
                    className="flex justify-between align-center" 
                    style={{ 
                      padding: '0.4rem 0.5rem', 
                      borderRadius: '6px', 
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      gap: '0.5rem'
                    }}
                  >
                    <div className="flex align-center gap-2" style={{ flex: 1 }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: opt.color }} />
                      <span style={{ fontSize: '0.85rem' }}>{opt.label}</span>
                    </div>

                    <div className="flex gap-1">
                      <button 
                        type="button" 
                        onClick={() => handleMoveOption(idx, -1)} 
                        disabled={idx === 0} 
                        className="btn-icon" 
                        style={{ padding: '0.2rem', color: idx === 0 ? 'var(--text-muted)' : 'var(--text-secondary)', background: 'none', border: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer' }}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleMoveOption(idx, 1)} 
                        disabled={idx === options.length - 1} 
                        className="btn-icon" 
                        style={{ padding: '0.2rem', color: idx === options.length - 1 ? 'var(--text-muted)' : 'var(--text-secondary)', background: 'none', border: 'none', cursor: idx === options.length - 1 ? 'not-allowed' : 'pointer' }}
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveOption(idx)} 
                        className="btn-icon" 
                        style={{ padding: '0.2rem', color: 'var(--danger-color)', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {options.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No options. Add one below.
                  </div>
                )}
              </div>

              {/* Add Option Form */}
              <div 
                className="flex-col gap-2" 
                style={{ 
                  borderTop: '1px solid var(--border-color)', 
                  paddingTop: '1rem',
                  marginTop: '0.5rem'
                }}
              >
                <label className="form-label">Add Option</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOptionLabel}
                    onChange={e => setNewOptionLabel(e.target.value)}
                    placeholder="e.g. High Priority"
                    className="form-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="btn btn-primary"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>

                {/* Color Choice */}
                <div style={{ marginTop: '0.5rem' }}>
                  <span className="form-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Option Color</span>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewOptionColor(c)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: c,
                          border: newOptionColor === c ? '2.5px solid white' : '1px solid rgba(255,255,255,0.15)',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div 
                className="flex justify-between mt-4" 
                style={{ 
                  borderTop: '1px solid var(--border-color)', 
                  paddingTop: '1rem' 
                }}
              >
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveOptions} 
                  className="btn btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
