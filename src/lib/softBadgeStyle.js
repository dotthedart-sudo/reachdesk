/**
 * Shared soft badge styling — tinted background, colored text, subtle border.
 */

function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function softBadgeStyle(color, opts = {}) {
  const c = color || '#64748b';
  const rgb = hexToRgb(c);
  const bgAlpha = opts.bgAlpha ?? 0.12;
  const borderAlpha = opts.borderAlpha ?? 0.28;
  if (!rgb) {
    return {
      backgroundColor: 'rgba(100,116,139,0.12)',
      color: c,
      border: '1px solid rgba(100,116,139,0.28)',
    };
  }
  return {
    backgroundColor: `rgba(${rgb.r},${rgb.g},${rgb.b},${bgAlpha})`,
    color: c,
    border: `1px solid rgba(${rgb.r},${rgb.g},${rgb.b},${borderAlpha})`,
  };
}

export function softDotStyle(color) {
  return { backgroundColor: color || '#64748b' };
}
