import { useCallback, useEffect, useRef, useState } from 'react';

const WIDTH_PREFIX = 'crm_column_widths_';
const ROW_PREFIX = 'crm_row_heights_';

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
  script_used: 160,
  niche: 140,
  created_at: 130,
  linkedin_url: 160,
  instagram_url: 160,
  twitter_url: 160,
  website: 160,
  project: 140,
  _added_by: 140,
  local_time: 140,
  call_action: 160,
  last_called: 120,
  outcome: 120,
  attempts: 80,
  _actions: 180,
  lead: 200,
  when: 160,
  member: 140,
  note: 200,
  followup: 130,
  type: 100,
  leads_count: 80,
  list_name: 280,
  created_by: 140,
};

const DEFAULT_ROW_HEIGHT = 44;
const MIN_COL = 64;
const MAX_COL = 560;
const MIN_ROW = 32;
const MAX_ROW = 200;

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function defaultRowState() {
  return { defaultHeight: DEFAULT_ROW_HEIGHT, byId: {} };
}

function loadLayout(view) {
  return {
    widths: readJson(`${WIDTH_PREFIX}${view}`, {}),
    rowState: readJson(`${ROW_PREFIX}${view}`, defaultRowState()),
  };
}

/**
 * Persisted column widths + row heights for a CRM table view.
 * Row heights: shared default + optional per-row overrides (by id).
 */
export function useCrmTableLayout(view) {
  const [layout, setLayout] = useState(() => loadLayout(view));
  const viewRef = useRef(view);
  const hydrated = useRef(true);

  useEffect(() => {
    if (viewRef.current === view) return;
    viewRef.current = view;
    hydrated.current = false;
    setLayout(loadLayout(view));
  }, [view]);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    try {
      localStorage.setItem(`${WIDTH_PREFIX}${view}`, JSON.stringify(layout.widths));
      localStorage.setItem(`${ROW_PREFIX}${view}`, JSON.stringify(layout.rowState));
    } catch { /* ignore */ }
  }, [layout, view]);

  const getWidth = useCallback(
    (key) => layout.widths[key] || DEFAULT_WIDTHS[key] || 130,
    [layout.widths],
  );

  const setWidth = useCallback((key, width) => {
    const next = Math.max(MIN_COL, Math.min(MAX_COL, Math.round(width)));
    setLayout((prev) => ({
      ...prev,
      widths: { ...prev.widths, [key]: next },
    }));
  }, []);

  const resetWidth = useCallback((key) => {
    setLayout((prev) => {
      const widths = { ...prev.widths };
      delete widths[key];
      return { ...prev, widths };
    });
  }, []);

  const getRowHeight = useCallback(
    (rowId) => {
      if (rowId != null && layout.rowState.byId?.[rowId] != null) {
        return layout.rowState.byId[rowId];
      }
      return layout.rowState.defaultHeight || DEFAULT_ROW_HEIGHT;
    },
    [layout.rowState],
  );

  const setRowHeight = useCallback((rowId, height) => {
    const next = Math.max(MIN_ROW, Math.min(MAX_ROW, Math.round(height)));
    setLayout((prev) => {
      if (rowId == null) {
        return {
          ...prev,
          rowState: { ...prev.rowState, defaultHeight: next },
        };
      }
      return {
        ...prev,
        rowState: {
          ...prev.rowState,
          byId: { ...(prev.rowState.byId || {}), [rowId]: next },
        },
      };
    });
  }, []);

  const resetRowHeight = useCallback((rowId) => {
    setLayout((prev) => {
      if (rowId == null) {
        return {
          ...prev,
          rowState: { ...prev.rowState, defaultHeight: DEFAULT_ROW_HEIGHT },
        };
      }
      const byId = { ...(prev.rowState.byId || {}) };
      delete byId[rowId];
      return { ...prev, rowState: { ...prev.rowState, byId } };
    });
  }, []);

  return {
    getWidth,
    setWidth,
    resetWidth,
    getRowHeight,
    setRowHeight,
    resetRowHeight,
    defaultRowHeight: layout.rowState.defaultHeight || DEFAULT_ROW_HEIGHT,
  };
}

/** @deprecated Prefer useCrmTableLayout — kept for width-only call sites */
export function useCrmColumnWidths(view) {
  const { getWidth, setWidth, resetWidth } = useCrmTableLayout(view);
  return { getWidth, setWidth, resetWidth };
}
