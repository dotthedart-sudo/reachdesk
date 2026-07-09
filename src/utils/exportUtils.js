import { supabase } from '../lib/supabase';

export function triggerDownload(content, filename, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

export function toCSVRow(cells) {
  return cells.map(c => {
    const s = String(c ?? '').replace(/"/g, '""');
    return `"${s}"`;
  }).join(',');
}

export function stripHTML(html = '') {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
}

export async function exportLeads(userId) {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!leads || leads.length === 0) {
    throw new Error('No leads found.');
  }

  const EXPORT_FIELDS = [
    { key: 'name', label: 'Name', getValue: l => l.full_name || [l.first_name, l.last_name].filter(Boolean).join(' ') },
    { key: 'email', label: 'Email', getValue: l => l.email },
    { key: 'phone', label: 'Phone', getValue: l => l.phone },
    { key: 'company', label: 'Company', getValue: l => l.company },
    { key: 'niche', label: 'Niche', getValue: l => l.niche },
    { key: 'status', label: 'Status', getValue: l => l.status },
    { key: 'priority', label: 'Priority', getValue: l => l.priority },
    { key: 'project', label: 'Project', getValue: l => l.project },
    { key: 'notes', label: 'Notes', getValue: l => l.notes },
    { key: 'links', label: 'Links', getValue: l => {
        const parts = [];
        if (l.linkedin_url) parts.push(`LinkedIn: ${l.linkedin_url}`);
        if (l.instagram_url) parts.push(`Instagram: ${l.instagram_url}`);
        if (l.twitter_url) parts.push(`Twitter: ${l.twitter_url}`);
        if (l.website) parts.push(`Website: ${l.website}`);
        if (Array.isArray(l.custom_fields?.links)) {
          l.custom_fields.links.forEach(lk => {
            if (typeof lk === 'string') parts.push(lk);
            else if (lk && lk.url) parts.push(`${lk.label || 'Link'}: ${lk.url}`);
          });
        }
        return parts.join('; ');
      }
    }
  ];

  // Filter valid leads (at least one field has data)
  const validLeads = leads.filter(l => {
    return EXPORT_FIELDS.some(field => {
      const val = field.getValue(l);
      return val !== null && val !== undefined && String(val).trim() !== '';
    });
  });

  if (validLeads.length === 0) {
    throw new Error('No leads found with exportable data.');
  }

  // Determine active columns (at least one lead has non-empty data)
  const activeFields = EXPORT_FIELDS.filter(field => {
    return validLeads.some(l => {
      const val = field.getValue(l);
      return val !== null && val !== undefined && String(val).trim() !== '';
    });
  });

  const headers = activeFields.map(f => f.label);
  const rows = validLeads.map(l => {
    const rowValues = activeFields.map(field => field.getValue(l));
    return toCSVRow(rowValues);
  });

  const csv = [toCSVRow(headers), ...rows].join('\r\n');
  triggerDownload(csv, 'reachdesk-leads.csv', 'text/csv;charset=utf-8;');
}

export async function exportNotes(userId) {
  const { data: notes, error } = await supabase
    .from('notes')
    .select('title,content,updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  if (!notes || notes.length === 0) {
    throw new Error('No notes found.');
  }

  const lines = notes.map(n => {
    const title = n.title || 'Untitled';
    const date = n.updated_at ? new Date(n.updated_at).toLocaleDateString() : '';
    const body = stripHTML(n.content || '');
    return `== ${title} ==${ date ? `  [${date}]` : '' }\n${body}\n`;
  });

  const txt = lines.join('\n' + '─'.repeat(60) + '\n\n');
  triggerDownload(txt, 'reachdesk-notes.txt', 'text/plain;charset=utf-8;');
}
