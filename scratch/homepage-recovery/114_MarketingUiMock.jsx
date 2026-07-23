import React from 'react';

/** Fallback UI illustrations when WebP screenshots are not yet in public/marketing/ */

function MockFrame({ theme, children, label }) {
  const isLight = theme === 'light';
  return (
    <svg
      viewBox="0 0 400 260"
      className="hp-ui-mock-svg"
      role="img"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="400" height="260" rx="8" fill={isLight ? '#FFFFFF' : '#161B22'} stroke={isLight ? '#DDE3EC' : '#21262D'} strokeWidth="1" />
      {children}
    </svg>
  );
}

export function PipelineMock({ theme = 'dark' }) {
  const isLight = theme === 'light';
  const text = isLight ? '#3D444D' : '#C9D1D9';
  const muted = isLight ? '#5A6478' : '#8B949E';
  const row = isLight ? '#F8F9FB' : '#1C2130';
  const hot = '#E05252';
  const warm = '#E8A838';
  const cold = '#5B8FB9';
  return (
    <MockFrame theme={theme} label="CRM pipeline with Hot, Warm, Cold priorities">
      <text x="20" y="28" fill={muted} fontSize="10" fontFamily="system-ui,sans-serif">LEADS</text>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="16" y={40 + i * 48} width="368" height="40" rx="4" fill={row} />
          <rect x="28" y={52 + i * 48} width="48" height="16" rx="3" fill={[hot, warm, cold, muted][i]} opacity="0.85" />
          <rect x="88" y={54 + i * 48} width="100" height="12" rx="2" fill={text} opacity="0.5" />
          <rect x="280" y={54 + i * 48} width="80" height="12" rx="2" fill={muted} opacity="0.4" />
        </g>
      ))}
    </MockFrame>
  );
}

export function RemindersMock({ theme = 'dark' }) {
  const isLight = theme === 'light';
  const text = isLight ? '#3D444D' : '#C9D1D9';
  const muted = isLight ? '#5A6478' : '#8B949E';
  const accent = isLight ? '#3E7BB8' : '#5B8FB9';
  return (
    <MockFrame theme={theme} label="Follow-up reminders after marking Contacted">
      <text x="20" y="28" fill={muted} fontSize="10" fontFamily="system-ui,sans-serif">REMINDERS</text>
      <rect x="16" y="44" width="368" height="56" rx="6" fill={accent} opacity="0.12" stroke={accent} strokeWidth="1" />
      <text x="32" y="68" fill={accent} fontSize="11" fontWeight="600" fontFamily="system-ui,sans-serif">Checkpoint 2 · Due today</text>
      <text x="32" y="86" fill={text} fontSize="10" fontFamily="system-ui,sans-serif">Follow up with Alex — no reply yet</text>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx="32" cy={130 + i * 36} r="6" fill="none" stroke={muted} strokeWidth="1.5" />
          <rect x="48" y={122 + i * 36} width="140" height="10" rx="2" fill={text} opacity="0.35" />
          <rect x="240" y={122 + i * 36} width="60" height="10" rx="2" fill={muted} opacity="0.3" />
        </g>
      ))}
    </MockFrame>
  );
}

export function TemplatesMock({ theme = 'dark' }) {
  const isLight = theme === 'light';
  const text = isLight ? '#3D444D' : '#C9D1D9';
  const muted = isLight ? '#5A6478' : '#8B949E';
  const row = isLight ? '#F8F9FB' : '#1C2130';
  const sage = isLight ? '#4E9A83' : '#7FB5A0';
  return (
    <MockFrame theme={theme} label="Outreach template with placeholders">
      <text x="20" y="28" fill={muted} fontSize="10" fontFamily="system-ui,sans-serif">TEMPLATE</text>
      <rect x="16" y="44" width="368" height="200" rx="6" fill={row} />
      <text x="32" y="72" fill={text} fontSize="11" fontFamily="system-ui,sans-serif">Hi </text>
      <rect x="52" y="58" width="72" height="18" rx="3" fill={sage} opacity="0.25" />
      <text x="58" y="71" fill={sage} fontSize="10" fontFamily="monospace">{'{{name}}'}</text>
      <text x="32" y="100" fill={muted} fontSize="10" fontFamily="system-ui,sans-serif">I saw your </text>
      <rect x="98" y="86" width="80" height="18" rx="3" fill={sage} opacity="0.25" />
      <text x="104" y="99" fill={sage} fontSize="10" fontFamily="monospace">{'{{niche}}'}</text>
      <text x="32" y="130" fill={muted} fontSize="10" fontFamily="system-ui,sans-serif">project and wanted to reach out...</text>
    </MockFrame>
  );
}

export function RevenueMock({ theme = 'dark' }) {
  const isLight = theme === 'light';
  const text = isLight ? '#3D444D' : '#C9D1D9';
  const muted = isLight ? '#5A6478' : '#8B949E';
  const row = isLight ? '#F8F9FB' : '#1C2130';
  const accent = isLight ? '#3E7BB8' : '#5B8FB9';
  return (
    <MockFrame theme={theme} label="Invoice and revenue tracking">
      <text x="20" y="28" fill={muted} fontSize="10" fontFamily="system-ui,sans-serif">INVOICE</text>
      <rect x="16" y="44" width="368" height="200" rx="6" fill={row} />
      <text x="32" y="72" fill={text} fontSize="12" fontWeight="600" fontFamily="system-ui,sans-serif">INV-482901</text>
      <text x="32" y="96" fill={muted} fontSize="10" fontFamily="system-ui,sans-serif">Client · Website redesign</text>
      <line x1="32" y1="110" x2="368" y2="110" stroke={muted} strokeOpacity="0.2" />
      <text x="32" y="140" fill={text} fontSize="22" fontWeight="700" fontFamily="system-ui,sans-serif">$2,400</text>
      <rect x="32" y="160" width="100" height="24" rx="4" fill={accent} opacity="0.2" />
      <text x="44" y="176" fill={accent} fontSize="10" fontWeight="600" fontFamily="system-ui,sans-serif">Paid</text>
    </MockFrame>
  );
}

export function AddLeadMock({ theme = 'dark' }) {
  const isLight = theme === 'light';
  const text = isLight ? '#3D444D' : '#C9D1D9';
  const muted = isLight ? '#5A6478' : '#8B949E';
  const field = isLight ? '#F8F9FB' : '#1C2130';
  return (
    <MockFrame theme={theme} label="Add a new lead">
      <text x="20" y="28" fill={muted} fontSize="10" fontFamily="system-ui,sans-serif">NEW LEAD</text>
      {['Name', 'Niche', 'Source'].map((label, i) => (
        <g key={label}>
          <text x="20" y={58 + i * 52} fill={muted} fontSize="9" fontFamily="system-ui,sans-serif">{label}</text>
          <rect x="16" y={64 + i * 52} width="368" height="32" rx="4" fill={field} stroke={muted} strokeOpacity="0.2" />
          {i === 0 && <rect x="28" y={74 + i * 52} width="120" height="12" rx="2" fill={text} opacity="0.4" />}
        </g>
      ))}
    </MockFrame>
  );
}

export function ContactedMock({ theme = 'dark' }) {
  const isLight = theme === 'light';
  const text = isLight ? '#3D444D' : '#C9D1D9';
  const muted = isLight ? '#5A6478' : '#8B949E';
  const accent = isLight ? '#3E7BB8' : '#5B8FB9';
  return (
    <MockFrame theme={theme} label="Mark lead as Contacted">
      <text x="20" y="28" fill={muted} fontSize="10" fontFamily="system-ui,sans-serif">STATUS</text>
      <rect x="16" y="48" width="160" height="36" rx="6" fill={accent} />
      <text x="36" y="71" fill={isLight ? '#FFF' : '#0D1117'} fontSize="12" fontWeight="600" fontFamily="system-ui,sans-serif">Contacted</text>
      <polygon points="160,66 172,66 166,74" fill={isLight ? '#FFF' : '#0D1117'} opacity="0.8" />
      <rect x="16" y="100" width="368" height="140" rx="6" fill={accent} opacity="0.08" stroke={accent} strokeWidth="1" />
      <text x="32" y="128" fill={accent} fontSize="11" fontWeight="600" fontFamily="system-ui,sans-serif">7 checkpoints scheduled</text>
      <text x="32" y="150" fill={text} fontSize="10" fontFamily="system-ui,sans-serif">Next reminder in 3 days</text>
    </MockFrame>
  );
}

export function FollowUpMock({ theme = 'dark' }) {
  const isLight = theme === 'light';
  const text = isLight ? '#3D444D' : '#C9D1D9';
  const muted = isLight ? '#5A6478' : '#8B949E';
  const sage = isLight ? '#4E9A83' : '#7FB5A0';
  return (
    <MockFrame theme={theme} label="Follow up until close">
      <text x="20" y="28" fill={muted} fontSize="10" fontFamily="system-ui,sans-serif">TODAY</text>
      {['Reply pending', 'Book call', 'Mark Won'].map((label, i) => (
        <g key={label}>
          <rect x="16" y={44 + i * 56} width="368" height="44" rx="6" fill={i === 0 ? sage : isLight ? '#F8F9FB' : '#1C2130'} opacity={i === 0 ? 0.15 : 1} stroke={i === 0 ? sage : muted} strokeOpacity={i === 0 ? 0.5 : 0.15} />
          <text x="32" y={70 + i * 56} fill={i === 0 ? sage : text} fontSize="11" fontWeight={i === 0 ? 600 : 400} fontFamily="system-ui,sans-serif">{label}</text>
        </g>
      ))}
    </MockFrame>
  );
}

export const FEATURE_MOCKS = {
  pipeline: PipelineMock,
  reminders: RemindersMock,
  templates: TemplatesMock,
  revenue: RevenueMock,
};

export const STEP_MOCKS = {
  1: AddLeadMock,
  2: ContactedMock,
  3: FollowUpMock,
};
