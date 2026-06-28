import React, { useState, useRef, useEffect } from 'react';
import { SiInstagram, SiX, SiWhatsapp } from '@icons-pack/react-simple-icons';
import { Mail, Globe, Phone } from 'lucide-react';

// ── Inline LinkedIn SVG (no extra dependency) ─────────────────────────────────
const SiLinkedin = ({ size = 24, color = 'currentColor', ...props }) => (
  <svg role="img" viewBox="0 0 24 24" width={size} height={size} fill={color} {...props}>
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
);

// ── Platform map ──────────────────────────────────────────────────────────────
const PLATFORM_MAP = {
  linkedin:  { icon: SiLinkedin,  color: '#0A66C2', urlKey: 'linkedin_url' },
  instagram: { icon: SiInstagram, color: '#E4405F', urlKey: 'instagram_url' },
  twitter:   { icon: SiX,         color: '#1a1a1a', urlKey: 'twitter_url' },
  x:         { icon: SiX,         color: '#1a1a1a', urlKey: 'twitter_url' },
  email:     { icon: Mail,        color: '#6B7280', urlKey: null },
  website:   { icon: Globe,       color: '#6B7280', urlKey: 'website' },
};

// ── Phone popup — used standalone in table cells ───────────────────────────────
export const PhonePopup = ({ phone }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!phone) return <span style={{ color: '#6B7280' }}>—</span>;

  const clean = phone.replace(/\D/g, '');

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <span
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{ cursor: 'pointer', color: 'var(--text-primary)' }}
        title="Click to call or WhatsApp"
      >
        {phone}
      </span>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 1000,
          background: 'var(--bg-secondary, #1a1a2e)',
          border: '1px solid var(--border-color, #2d2d3d)',
          borderRadius: '8px', padding: '4px 0',
          minWidth: '160px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          <a
            href={`tel:${clean}`}
            onClick={() => setOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 12px', color: 'var(--text-primary, #fff)',
              textDecoration: 'none', fontSize: '13px'
            }}
          >
            <Phone size={14} /> Call via SIM
          </a>
          <a
            href={`https://wa.me/${clean}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 12px', color: 'var(--text-primary, #fff)',
              textDecoration: 'none', fontSize: '13px'
            }}
          >
            <SiWhatsapp size={14} color="#25D366" /> Open WhatsApp
          </a>
        </div>
      )}
    </div>
  );
};

// ── Build the icon link list from a lead object ───────────────────────────────
const getLeadLinks = (lead) => {
  const links = [];
  const added = new Set();

  const tryAdd = (platform, url) => {
    if (url && !added.has(platform)) {
      links.push({ platform, url });
      added.add(platform);
    }
  };

  tryAdd('linkedin',  lead.linkedin_url);
  tryAdd('instagram', lead.instagram_url);
  tryAdd('twitter',   lead.twitter_url);
  tryAdd(
    'website',
    lead.website
      ? lead.website.startsWith('http') ? lead.website : `https://${lead.website}`
      : null
  );
  if (lead.email) tryAdd('email', `mailto:${lead.email}`);

  return links;
};

// ── ReachIcons — shown in the "Reach" column of the CRM table ─────────────────
export const ReachIcons = ({ lead }) => {
  const [phoneOpen, setPhoneOpen] = useState(false);
  const phoneRef = useRef();
  const links = getLeadLinks(lead);
  const hasPhone = !!lead.phone;
  const isWhatsApp = (lead.platform || '').toLowerCase() === 'whatsapp';
  const clean = lead.phone?.replace(/\D/g, '') || '';

  useEffect(() => {
    const handler = (e) => {
      if (phoneRef.current && !phoneRef.current.contains(e.target)) setPhoneOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (links.length === 0 && !hasPhone) {
    return <span style={{ color: '#6B7280', fontSize: '0.85rem' }}>—</span>;
  }

  const visible = links.slice(0, 3);
  const extra = links.length - 3;

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Platform icon links */}
      {visible.map(({ platform, url }) => {
        const config = PLATFORM_MAP[platform];
        if (!config) return null;
        const IconComp = config.icon;
        return (
          <a
            key={platform}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={platform.charAt(0).toUpperCase() + platform.slice(1)}
            style={{
              display: 'flex', alignItems: 'center', lineHeight: 1,
              opacity: 0.85, transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.85')}
          >
            <IconComp size={15} color={config.color} />
          </a>
        );
      })}

      {extra > 0 && <span style={{ fontSize: '11px', color: '#6B7280' }}>+{extra}</span>}

      {/* Phone icon — opens call / WhatsApp popup */}
      {hasPhone && (
        <div ref={phoneRef} style={{ position: 'relative', display: 'inline-flex' }}>
          <span
            onClick={(e) => { e.stopPropagation(); setPhoneOpen(!phoneOpen); }}
            style={{
              display: 'flex', alignItems: 'center', cursor: 'pointer',
              color: isWhatsApp ? '#25D366' : '#3B82F6',
              opacity: 0.85, transition: 'opacity 0.15s ease',
            }}
            title={isWhatsApp ? 'WhatsApp' : 'Phone'}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.85')}
          >
            {isWhatsApp
              ? <SiWhatsapp size={15} color="#25D366" />
              : <Phone size={15} />
            }
          </span>
          {phoneOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 1000,
              background: 'var(--bg-secondary, #1a1a2e)',
              border: '1px solid var(--border-color, #2d2d3d)',
              borderRadius: '8px', padding: '4px 0',
              minWidth: '160px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              <a
                href={`tel:${clean}`}
                onClick={() => setPhoneOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 12px', color: 'var(--text-primary, #fff)',
                  textDecoration: 'none', fontSize: '13px'
                }}
              >
                <Phone size={14} /> Call via SIM
              </a>
              <a
                href={`https://wa.me/${clean}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setPhoneOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 12px', color: 'var(--text-primary, #fff)',
                  textDecoration: 'none', fontSize: '13px'
                }}
              >
                <SiWhatsapp size={14} color="#25D366" /> Open WhatsApp
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
