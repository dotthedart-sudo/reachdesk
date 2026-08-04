import React from 'react';
import { softBadgeStyle } from '../../lib/softBadgeStyle';

/** Horizontal stage stepper used for Messages / Calls dashboard strips. */
export default function PipelineStepper({ stages, counts, getColor, getLabel }) {
  if (!stages?.length) return null;

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '0.35rem' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: stages.map((_, i) => (i < stages.length - 1 ? '72px 1fr' : '72px')).join(' '),
          minWidth: `${stages.length * 72 + (stages.length - 1) * 40}px`,
          rowGap: '0.4rem',
        }}
      >
        {stages.map((st, i) => {
          const count = counts[st] ?? counts[getLabel?.(st) || st] ?? 0;
          const hasLeads = count > 0;
          const stageColor = getColor(st) || 'var(--text-muted)';
          const nextKey = stages[i + 1];
          const nextCount = nextKey != null ? (counts[nextKey] ?? 0) : 0;
          const connectorActive = hasLeads || nextCount > 0;
          const label = getLabel ? getLabel(st) : st;

          return [
            <div key={`node-${st}`} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 28 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  ...(hasLeads
                    ? softBadgeStyle(stageColor)
                    : {
                        background: 'transparent',
                        border: '2px solid var(--border-strong)',
                        color: 'var(--text-muted)',
                      }),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {count}
              </div>
            </div>,
            i < stages.length - 1 && (
              <div key={`conn-${st}`} style={{ display: 'flex', alignItems: 'center', height: 28 }}>
                <div
                  style={{
                    width: '100%',
                    height: 2,
                    borderTop: `2px ${connectorActive ? 'solid' : 'dashed'} ${
                      connectorActive ? 'var(--text-muted)' : 'var(--border-strong)'
                    }`,
                  }}
                />
              </div>
            ),
          ];
        })}

        {stages.map((st, i) => {
          const count = counts[st] ?? 0;
          const hasLeads = count > 0;
          const stageColor = getColor(st) || 'var(--text-muted)';
          const label = getLabel ? getLabel(st) : st;
          return [
            <div key={`label-${st}`} style={{ display: 'flex', justifyContent: 'center' }}>
              <span
                style={{
                  fontSize: '0.62rem',
                  color: hasLeads ? stageColor : 'var(--text-muted)',
                  fontWeight: hasLeads ? 600 : 400,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                }}
              >
                {label}
              </span>
            </div>,
            i < stages.length - 1 && <div key={`label-space-${st}`} />,
          ];
        })}
      </div>
    </div>
  );
}
