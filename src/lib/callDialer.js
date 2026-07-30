/** Default dialer preferences (localStorage; optional profile sync later). */

export const DIALER_OPTIONS = [
  { id: 'native', label: 'Phone app (native)' },
  { id: 'copy', label: 'Copy number' },
  { id: 'ghl', label: 'Go High Level' },
  { id: 'custom', label: 'Custom URL' },
];

export function getDialerPrefs(userId) {
  if (!userId) return { dialer: 'native', ghlUrl: '', customUrl: '' };
  return {
    dialer: localStorage.getItem(`reach_dialer_${userId}`) || 'native',
    ghlUrl: localStorage.getItem(`reach_ghl_url_${userId}`) || '',
    customUrl: localStorage.getItem(`reach_custom_dialer_url_${userId}`) || '',
  };
}

export function setDialerPrefs(userId, { dialer, ghlUrl, customUrl }) {
  if (!userId) return;
  if (dialer != null) localStorage.setItem(`reach_dialer_${userId}`, dialer);
  if (ghlUrl != null) localStorage.setItem(`reach_ghl_url_${userId}`, ghlUrl);
  if (customUrl != null) localStorage.setItem(`reach_custom_dialer_url_${userId}`, customUrl);
}

function digitsOnly(phone) {
  return (phone || '').replace(/\D/g, '');
}

export function buildDialerUrl(dialer, phone, { ghlUrl = '', customUrl = '' } = {}) {
  const digits = digitsOnly(phone);
  if (!digits) return null;

  switch (dialer) {
    case 'native':
      return `tel:${phone}`;
    case 'ghl': {
      const base = (ghlUrl || '').trim();
      if (!base) return `tel:${phone}`;
      if (base.includes('{phone}')) return base.replace(/\{phone\}/g, digits);
      const sep = base.includes('?') ? '&' : '?';
      return `${base}${sep}phone=${encodeURIComponent(digits)}`;
    }
    case 'custom': {
      const tpl = (customUrl || '').trim();
      if (!tpl) return `tel:${phone}`;
      return tpl.replace(/\{phone\}/g, digits);
    }
    case 'copy':
    default:
      return null;
  }
}

export async function executeDial(dialer, phone, prefs, { onCopied } = {}) {
  if (dialer === 'copy') {
    await navigator.clipboard.writeText(phone || '');
    onCopied?.();
    return 'copy';
  }
  const url = buildDialerUrl(dialer, phone, prefs);
  if (url) {
    window.open(url, dialer === 'native' ? '_self' : '_blank');
    return dialer;
  }
  return null;
}
