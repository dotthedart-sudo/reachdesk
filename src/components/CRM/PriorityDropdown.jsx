import React, { useState, useEffect, useRef } from 'react';
import { Flame, Sun, Snowflake, ChevronDown, Pencil, Plus, Trash2, Check, X } from 'lucide-react';
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

const DEFAULT_PRIORITIES = [
  { label: 'Hot', color: '#ef4444' },
  { label: 'Warm', color: '#f59e0b' },
  { label: 'Cold', color: '#3b82f6' }
];

export default function PriorityDropdown({ value, onChange, onUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [priorities, setPriorities] = useState(DEFAULT_PRIORITIES);
  const [columnDefId, setColumnDefId] = useState(null);
  const [userId, setUserId] = useState(null);
  
  // Edit mode inputs
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [editingColor, setEditingColor] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setIsEditing(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch current user and column definition for priorities
  useEffect(() => {
    async function loadPriorities() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const uid = session.user.id;
        setUserId(uid);

        const { data, error } = await supabase
          .from('column_definitions')
          .select('*')
          .eq('user_id', uid)
          .eq('column_key', 'priority')
          .maybeSingle();

        if (!error && data) {
          setColumnDefId(data.id);
          if (data.dropdown_options && data.dropdown_options.length > 0) {
            setPriorities(data.dropdown_options);
          }
        }
      } catch (err) {
        console.error('Error loading priorities:', err);
      }
    }
    loadPriorities();
  }, []);

  const savePrioritiesToDb = async (updatedList) => {
    if (!userId) return;
    try {
      if (columnDefId) {
        await supabase
          .from('column_definitions')
          .update({ dropdown_options: updatedList })
          .eq('id', columnDefId);
      } else {
        // Create it if it doesn't exist
        const { data, error } = await supabase
          .from('column_definitions')
          .insert({
            user_id: userId,
            table_view: 'pipeline',
            column_key: 'priority',
            column_label: 'Priority',
            column_type: 'dropdown',
            is_visible: true,
            is_default: true,
            sort_order: 1,
            dropdown_options: updatedList
          })
          .select()
          .single();
        if (!error && data) {
          setColumnDefId(data.id);
        }
      }
    } catch (err) {
      console.error('Error saving priorities:', err);
    }
  };

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    if (priorities.some(p => p.label.toLowerCase() === newLabel.trim().toLowerCase())) {
      alert('Priority label already exists.');
      return;
    }
    const updated = [...priorities, { label: newLabel.trim(), color: newColor }];
    setPriorities(updated);
    setNewLabel('');
    await savePrioritiesToDb(updated);
    if (onUpdate) onUpdate();
  };

  const handleStartEdit = (index) => {
    setEditingIndex(index);
    setEditingLabel(priorities[index].label);
    setEditingColor(priorities[index].color);
  };

  const handleSaveEdit = async (index) => {
    if (!editingLabel.trim()) return;
    const oldLabel = priorities[index].label;
    const newL = editingLabel.trim();

    if (priorities.some((p, idx) => idx !== index && p.label.toLowerCase() === newL.toLowerCase())) {
      alert('Priority label already exists.');
      return;
    }

    const updated = [...priorities];
    updated[index] = { label: newL, color: editingColor };
    setPriorities(updated);
    setEditingIndex(null);

    // If label changed, update all leads that use the old label
    if (oldLabel !== newL && userId) {
      await supabase
        .from('leads')
        .update({ priority: newL })
        .eq('user_id', userId)
        .eq('priority', oldLabel);
    }

    await savePrioritiesToDb(updated);
    if (onUpdate) onUpdate();
  };

  const handleDelete = async (index) => {
    const labelToDelete = priorities[index].label;
    if (!userId) return;

    // Check if any leads use this priority
    const { count, error } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('priority', labelToDelete);

    if (!error && count > 0) {
      if (!confirm(`Warning: ${count} lead(s) are currently set to "${labelToDelete}". Deleting this will reassign them to "Cold". Proceed?`)) {
        return;
      }
      // Reassign leads to 'Cold'
      await supabase
        .from('leads')
        .update({ priority: 'Cold' })
        .eq('user_id', userId)
        .eq('priority', labelToDelete);
    }

    const updated = priorities.filter((_, idx) => idx !== index);
    setPriorities(updated);
    await savePrioritiesToDb(updated);
    if (onUpdate) onUpdate();
  };

  // Find priority match
  const normalizedVal = value ? value.trim() : 'Cold';
  const currentPriority = priorities.find(p => p.label.toLowerCase() === normalizedVal.toLowerCase()) || { label: normalizedVal, color: '#6b7280' };

  const getPriorityStyle = (color) => {
    return {
      background: `${color}18`,
      color: color,
      border: `1px solid ${color}44`,
      padding: '0.25rem 0.65rem',
      borderRadius: '12px',
      fontSize: '0.8rem',
      fontWeight: 600,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      whiteSpace: 'nowrap',
      transition: 'all 0.15s ease'
    };
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={dropdownRef} onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setIsEditing(false);
        }}
        style={getPriorityStyle(currentPriority.color)}
      >
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: currentPriority.color }} />
        <span>{currentPriority.label}</span>
        <ChevronDown size={12} style={{ opacity: 0.7 }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            background: 'var(--bg-tertiary, #161B22)',
            border: '1px solid var(--border-color, #30363D)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 9999,
            minWidth: '220px',
            marginTop: '4px',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {!isEditing ? (
            <>
              {/* Normal Selection List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '180px', overflowY: 'auto' }}>
                {priorities.map(opt => {
                  const isSelected = normalizedVal.toLowerCase() === opt.label.toLowerCase();
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        onChange(opt.label);
                        setIsOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.45rem 0.65rem',
                        border: 'none',
                        background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                        color: opt.color,
                        textAlign: 'left',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        width: '100%'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent'}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: opt.color }} />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ borderTop: '1px solid var(--border-color, #30363D)', margin: '4px 0' }} />
              
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary-purple, #8b5cf6)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '6px',
                  width: '100%',
                  borderRadius: '4px'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Pencil size={12} />
                Edit Priorities
              </button>
            </>
          ) : (
            /* Editable Management Mode */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Manage Priorities</span>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                >
                  Back
                </button>
              </div>

              {/* Editable Option List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '140px', overflowY: 'auto' }}>
                {priorities.map((opt, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255,255,255,0.03)',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      gap: '4px'
                    }}
                  >
                    {editingIndex === idx ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                        <div style={{ position: 'relative', width: '16px', height: '16px', borderRadius: '50%', background: editingColor }}>
                          <input
                            type="color"
                            value={editingColor}
                            onChange={e => setEditingColor(e.target.value)}
                            style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                          />
                        </div>
                        <input
                          type="text"
                          value={editingLabel}
                          onChange={e => setEditingLabel(e.target.value)}
                          style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '0.78rem',
                            padding: '2px 4px',
                            borderRadius: '3px',
                            width: '80px'
                          }}
                        />
                        <button type="button" onClick={() => handleSaveEdit(idx)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: '2px' }}><Check size={12} /></button>
                        <button type="button" onClick={() => setEditingIndex(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}><X size={12} /></button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: opt.color }} />
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{opt.label}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button type="button" onClick={() => handleStartEdit(idx)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}><Pencil size={11} /></button>
                          <button type="button" onClick={() => handleDelete(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}><Trash2 size={11} /></button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Add New Priority */}
              <div style={{ borderTop: '1px solid var(--border-color, #30363D)', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Add New</span>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: '18px', height: '18px', borderRadius: '50%', background: newColor, border: '1px solid rgba(255,255,255,0.2)' }}>
                    <input
                      type="color"
                      value={newColor}
                      onChange={e => setNewColor(e.target.value)}
                      style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Label..."
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.78rem',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      flex: 1,
                      minWidth: 0
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAdd}
                    style={{
                      background: 'var(--primary-purple, #8b5cf6)',
                      border: 'none',
                      color: '#fff',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Preset Colors */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: c,
                        border: newColor === c ? '1.5px solid white' : 'none',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
