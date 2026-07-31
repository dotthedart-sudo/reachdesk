const STORAGE_KEY = 'crm_list_folder_settings';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota errors */
  }
}

/** Per-list settings: { showLocalTime?: boolean } */
export function getListFolderSettings(folderId) {
  if (!folderId) return {};
  return readAll()[folderId] || {};
}

export function setListFolderSettings(folderId, patch) {
  if (!folderId) return {};
  const all = readAll();
  const next = { ...(all[folderId] || {}), ...patch };
  all[folderId] = next;
  writeAll(all);
  return next;
}

export function listFolderShowsLocalTime(folderId) {
  return !!getListFolderSettings(folderId).showLocalTime;
}
