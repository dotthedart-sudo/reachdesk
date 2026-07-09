import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, FileText, Check, X } from 'lucide-react';

const SECTIONS = [
  'INITIAL TEMPLATES',
  'FOLLOW UPS',
  'BOOKING MESSAGES',
  'AFTER BOOKED',
  'AFTER CLIENT BOOKED'
];

export default function GroupedTemplateDropdown({
  value,
  onChange,
  templates = [],
  placeholder = '-- Select template (optional) --'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 260 });
  const [search, setSearch] = useState('');
  
  // Accordion state: default open for all groups
  const [expandedGroups, setExpandedGroups] = useState({
    'MY TEMPLATES': true,
    'INITIAL TEMPLATES': true,
    'FOLLOW UPS': true,
    'BOOKING MESSAGES': true,
    'AFTER BOOKED': true,
    'AFTER CLIENT BOOKED': true,
    'OTHER TEMPLATES': true
  });

  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const isInsideTrigger = triggerRef.current && triggerRef.current.contains(e.target);
      const isInsideDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!isInsideTrigger && !isInsideDropdown) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openDropdown = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const width = Math.max(rect.width, 280);
      setDropdownPos({
        left: Math.min(rect.left, window.innerWidth - width - 8),
        width,
        top: rect.bottom + window.scrollY + 4 // Forces downward opening
      });
    }
    setIsOpen(prev => !prev);
  };

  const toggleGroup = (groupName, e) => {
    e.stopPropagation();
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const handleSelect = (tempId) => {
    onChange(tempId || null);
    setIsOpen(false);
  };

  // Group templates
  const myTemplates = [];
  const sectionTemplates = {};
  SECTIONS.forEach(sec => {
    sectionTemplates[sec] = [];
  });
  const otherTemplates = [];

  templates.forEach(t => {
    // Check if title or content matches search filter
    if (search.trim() && !t.title?.toLowerCase().includes(search.toLowerCase())) {
      return;
    }

    if (!t.is_starter) {
      myTemplates.push(t);
    } else if (SECTIONS.includes(t.platform)) {
      sectionTemplates[t.platform].push(t);
    } else {
      otherTemplates.push(t);
    }
  });

  const selectedTemplate = templates.find(t => t.id === value);
  const triggerLabel = selectedTemplate ? selectedTemplate.title : placeholder;

  const renderGroup = (groupName, items) => {
    if (items.length === 0 && !search.trim()) return null; // Hide empty categories unless searching
    if (items.length === 0 && search.trim()) return null; // Hide empty categories when no matches

    const isExpanded = expandedGroups[groupName];

    return (
      <div key={groupName} style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Accordion header */}
        <div
          onClick={(e) => toggleGroup(groupName, e)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 12px',
            fontSize: '0.68rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            backgroundColor: 'rgba(255,255,255,0.02)',
            borderBottom: '1px solid rgba(255,255,255,0.03)',
            cursor: 'pointer',
            userSelect: 'none',
            textTransform: 'uppercase'
          }}
        >
          <span>{groupName} ({items.length})</span>
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </div>

        {/* Collapsible list */}
        {isExpanded && (
          <div style={{ padding: '2px 0' }}>
            {items.map(item => {
              const isSelected = item.id === value;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  style={{
                    padding: '8px 24px',
                    fontSize: '0.8rem',
                    color: isSelected ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    backgroundColor: isSelected ? 'rgba(91,143,185,0.1)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = isSelected ? 'rgba(91,143,185,0.1)' : 'transparent'}
                >
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.title}
                  </span>
                  {isSelected && <Check size={14} style={{ color: 'var(--accent-blue)' }} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const dropdownPanel = isOpen && createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: `${dropdownPos.top}px`,
        left: `${dropdownPos.left}px`,
        zIndex: 99999,
        width: `${dropdownPos.width}px`,
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-strong)',
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        padding: '6px 0',
        maxHeight: '320px',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Search Header */}
      <div style={{ padding: '4px 12px 10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent' }}>
        <input
          type="text"
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          style={{
            width: '100%',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '6px 8px',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            outline: 'none'
          }}
        />
      </div>

      {/* Accordion Categories */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {/* Reset / Optional Item */}
        <div
          onClick={() => handleSelect(null)}
          style={{
            padding: '8px 12px',
            fontSize: '0.8rem',
            color: !value ? 'var(--accent-blue)' : 'var(--text-muted)',
            cursor: 'pointer',
            borderBottom: '1px solid var(--border)'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {placeholder}
        </div>

        {renderGroup('MY TEMPLATES', myTemplates)}
        {SECTIONS.map(sec => renderGroup(sec, sectionTemplates[sec]))}
        {renderGroup('OTHER TEMPLATES', otherTemplates)}

        {/* Empty search result */}
        {search.trim() && 
          myTemplates.length === 0 && 
          otherTemplates.length === 0 && 
          SECTIONS.every(sec => sectionTemplates[sec].length === 0) && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              No templates found
            </div>
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDropdown}
        className="form-select"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          cursor: 'pointer',
          padding: '0.5rem 0.75rem',
          height: 'auto'
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '8px' }}>
          {triggerLabel}
        </span>
        <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      </button>
      {dropdownPanel}
    </div>
  );
}
