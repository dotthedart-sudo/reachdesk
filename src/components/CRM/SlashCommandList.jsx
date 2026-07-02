import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

export const SlashCommandList = forwardRef((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = index => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  if (!props.items || props.items.length === 0) {
    return null;
  }

  return (
    <div className="slash-menu-container" style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      overflow: 'hidden',
      padding: '0.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      minWidth: '280px',
      zIndex: 9999
    }}>
      {props.items.map((item, index) => {
        const isSelected = index === selectedIndex;
        const Icon = item.icon;
        
        return (
          <button
            className={`slash-menu-item ${isSelected ? 'is-selected' : ''}`}
            key={index}
            onClick={() => selectItem(index)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 12px',
              background: isSelected ? 'var(--bg-secondary)' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'background 0.1s ease',
            }}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              background: 'var(--bg-tertiary)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              flexShrink: 0
            }}>
              <Icon size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.title}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
});
