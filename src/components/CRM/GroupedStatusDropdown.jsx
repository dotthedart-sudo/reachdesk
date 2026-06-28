import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

export const STATUS_GROUPS = [
  {
    label: 'NEW',
    options: [
      { value: 'lead', label: 'Lead', color: '#8B949E' }
    ]
  },
  {
    label: 'ACTIVE',
    options: [
      { value: 'contacted', label: 'Contacted', color: '#5B8FB9' },
      { value: 'calendly_sent', label: 'Calendly Sent', color: '#6B9FD4' },
      { value: 'booked', label: 'Call Booked', color: '#E8A838' },
      { value: 'follow_up', label: 'Follow Up', color: '#F97316' }
    ]
  },
  {
    label: 'REPLIED',
    options: [
      { value: 'positive_reply', label: 'Positive Reply', color: '#7FB5A0' }
    ]
  },
  {
    label: 'CLOSED',
    options: [
      { value: 'client', label: 'Client', color: '#4ADE80' },
      { value: 'not_interested', label: 'Not Interested', color: '#E05252' },
      { value: 'no_show', label: 'No Show', color: '#6B7280' }
    ]
  }
];

export const STATUS_MAP = STATUS_GROUPS.reduce((acc, group) => {
  group.options.forEach(opt => {
    acc[opt.value] = opt;
  });
  return acc;
}, {});

export default function GroupedStatusDropdown({ value, onChange, isTableInline = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  const currentOpt = STATUS_MAP[value] || { value, label: value || 'Select Status', color: '#8B949E' };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  const filteredGroups = STATUS_GROUPS.map(group => {
    const matchingOptions = group.options.filter(opt =>
      opt.label.toLowerCase().includes(search.toLowerCase())
    );
    return { ...group, options: matchingOptions };
  }).filter(group => group.options.length > 0);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block', width: isTableInline ? 'auto' : '100%' }}>
      {isTableInline ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            backgroundColor: `${currentOpt.color}22`,
            color: currentOpt.color,
            border: `1px solid ${currentOpt.color}55`,
            borderRadius: '6px',
            padding: '0.25rem 0.6rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            outline: 'none',
            whiteSpace: 'nowrap'
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: currentOpt.color, display: 'inline-block', flexShrink: 0 }} />
          {currentOpt.label}
          <ChevronDown size={12} style={{ opacity: 0.7 }} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="form-input"
          style={{
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
            backgroundColor: 'var(--bg-tertiary, #161B22)',
            color: 'var(--text-primary, #F0F6FC)',
            borderColor: isOpen ? 'var(--accent-blue, #58A6FF)' : 'var(--border, #30363D)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: currentOpt.color, display: 'inline-block', flexShrink: 0 }} />
            <span>{currentOpt.label}</span>
          </div>
          <ChevronDown size={14} style={{ opacity: 0.7 }} />
        </button>
      )}

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 1200,
            minWidth: '200px',
            width: isTableInline ? '220px' : '100%',
            backgroundColor: '#161B22',
            border: '1px solid #30363D',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            padding: '8px 0'
          }}
        >
          {/* Search Header */}
          <div style={{ padding: '0 8px 8px 8px', borderBottom: '1px solid #21262D', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={14} style={{ color: '#8B949E', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#C9D1D9',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Options List */}
          <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '4px 0' }}>
            {filteredGroups.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#8B949E', textAlign: 'center' }}>
                No matching statuses
              </div>
            ) : (
              filteredGroups.map(group => (
                <div key={group.label} style={{ marginBottom: '4px' }}>
                  <div
                    style={{
                      padding: '4px 12px',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#8B949E',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      userSelect: 'none'
                    }}
                  >
                    {group.label}
                  </div>
                  {group.options.map(opt => {
                    const isSelected = opt.value === value;
                    return (
                      <div
                        key={opt.value}
                        onClick={() => handleSelect(opt.value)}
                        style={{
                          padding: '6px 12px 6px 20px',
                          fontSize: '0.82rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'rgba(88, 166, 255, 0.15)' : 'transparent',
                          color: isSelected ? '#58A6FF' : '#C9D1D9',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#21262D';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: opt.color, display: 'inline-block', flexShrink: 0 }} />
                        <span>{opt.label}</span>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
