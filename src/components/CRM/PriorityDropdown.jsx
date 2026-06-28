import React, { useState, useEffect, useRef } from 'react';
import { Flame, Sun, Snowflake, ChevronDown } from 'lucide-react';

const PRIORITY_CONFIG = {
  Hot:  { label: 'Hot',  color: '#ef4444', icon: Flame,     bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)' },
  Warm: { label: 'Warm', color: '#f59e0b', icon: Sun,       bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' },
  Cold: { label: 'Cold', color: '#3b82f6', icon: Snowflake, bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)' },
};

export default function PriorityDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalizedVal = value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : 'Warm';
  const currentConfig = PRIORITY_CONFIG[normalizedVal] || PRIORITY_CONFIG.Warm;
  const Icon = currentConfig.icon;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={dropdownRef} onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: currentConfig.bg,
          color: currentConfig.color,
          border: `1px solid ${currentConfig.border}`,
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
        }}
      >
        <Icon size={13} style={{ color: currentConfig.color }} />
        <span>{currentConfig.label}</span>
        <ChevronDown size={12} style={{ opacity: 0.7 }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            background: 'var(--bg-tertiary, #1e293b)',
            border: '1px solid var(--border-color, #334155)',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
            zIndex: 9999,
            minWidth: '130px',
            marginTop: '4px',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}
        >
          {Object.values(PRIORITY_CONFIG).map(opt => {
            const OptIcon = opt.icon;
            const isSelected = normalizedVal === opt.label;
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
                  fontWeight: 600
                }}
              >
                <OptIcon size={14} style={{ color: opt.color }} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
