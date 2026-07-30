import { useCallback, useEffect, useState } from 'react';

const STORAGE_PREFIX = 'crm_column_widths_';

const DEFAULT_WIDTHS = {
  name: 200,
  status: 140,
  platform: 100,
  email: 220,
  phone: 150,
  company: 160,
  priority: 120,
  action_to_take: 160,
  last_contacted_at: 130,
  template_used: 160,
  niche: 140,
  created_at: 130,
  linkedin_url: 160,
  instagram_url: 160,
  twitter_url: 160,
  website: 160,
  project: 140,
  _added_by: 140,
  local_time: 120,
  call_action: 160,
  last_called: 120,
  outcome: 120,
  attempts: 80,
  _actions: 160,
};

export function useCrmColumnWidths(view) {
  const [widths, setWidths] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}${view}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${view}`, JSON.stringify(widths));
    } catch {
      /* ignore quota errors */
    }
  }, [widths, view]);

  const getWidth = useCallback(
    (key) => widths[key] || DEFAULT_WIDTHS[key] || 130,
    [widths],
  );

  const setWidth = useCallback((key, width) => {
    const next = Math.max(72, Math.min(480, Math.round(width)));
    setWidths((prev) => ({ ...prev, [key]: next }));
  }, []);

  return { getWidth, setWidth };
}
