import React, { useState, useRef, useEffect } from 'react';
import { Phone, ChevronDown, Copy } from 'lucide-react';
import { DIALER_OPTIONS, executeDial, getDialerPrefs } from '../../../lib/callDialer';

export default function CallButton({ phone, userId, onCopied, size = 'sm' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const prefs = getDialerPrefs(userId);
  const dialer = prefs.dialer || 'native';

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (!phone?.trim()) {
    return <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>;
  }

  const runDial = async (d) => {
    setOpen(false);
    await executeDial(d, phone, prefs, { onCopied });
  };

  const btnClass = size === 'sm' ? 'btn btn-primary btn-sm' : 'btn btn-primary';

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'stretch' }}>
      <button
        type="button"
        className={btnClass}
        style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
        onClick={(e) => { e.stopPropagation(); runDial(dialer); }}
        title={`Call via ${DIALER_OPTIONS.find((o) => o.id === dialer)?.label || dialer}`}
      >
        <Phone size={13} /> Call
      </button>
      <button
        type="button"
        className={`${btnClass} btn-secondary`}
        style={{
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          padding: '0 0.35rem',
          minWidth: 'auto',
          borderLeft: '1px solid var(--border)',
        }}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label="More dial options"
      >
        <ChevronDown size={12} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            marginTop: '2rem',
            zIndex: 1000,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-strong)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            minWidth: 180,
            padding: '0.25rem',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {DIALER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className="dropdown-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                width: '100%',
                background: 'transparent',
                border: 'none',
                padding: '0.45rem 0.65rem',
                textAlign: 'left',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
              onClick={() => runDial(opt.id)}
            >
              {opt.id === 'copy' ? <Copy size={13} /> : <Phone size={13} />}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
