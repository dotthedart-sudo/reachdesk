import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

export default function HelpPopover({ title, children, align = 'center', width = 240 }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPopoverStyle = () => {
    let leftOffset = '50%';
    let transformOffset = 'translateX(-50%)';

    if (align === 'right') {
      leftOffset = 'auto';
      transformOffset = 'none';
    } else if (align === 'left') {
      leftOffset = '0';
      transformOffset = 'none';
    }

    return {
      position: 'absolute',
      top: 'calc(100% + 8px)',
      left: leftOffset,
      right: align === 'right' ? '0' : 'auto',
      transform: transformOffset,
      width: `${width}px`,
      backgroundColor: 'var(--bg-card, #1A1D24)',
      border: '1px solid var(--border, #2E333D)',
      borderRadius: '6px',
      padding: '0.75rem',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
      zIndex: 99999,
      color: 'var(--text-secondary, #B0B5C1)',
      fontSize: '0.8rem',
      lineHeight: '1.4',
      textAlign: 'left',
      whiteSpace: 'normal',
    };
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted, #6B7280)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2px',
          borderRadius: '50%',
          outline: 'none',
          transition: 'color 0.15s ease, background-color 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text-primary, #FFFFFF)';
          e.currentTarget.style.backgroundColor = 'var(--bg-active-bg, rgba(255, 255, 255, 0.05))';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-muted, #6B7280)';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title="Help"
      >
        <HelpCircle size={14} />
      </button>

      {isOpen && (
        <div ref={popoverRef} style={getPopoverStyle()}>
          {title && (
            <div style={{ 
              fontWeight: 600, 
              color: 'var(--text-primary, #FFFFFF)', 
              marginBottom: '0.4rem',
              fontSize: '0.85rem',
              borderBottom: '1px solid var(--border, #2E333D)',
              paddingBottom: '0.25rem'
            }}>
              {title}
            </div>
          )}
          <div>{children}</div>
        </div>
      )}
    </div>
  );
}
