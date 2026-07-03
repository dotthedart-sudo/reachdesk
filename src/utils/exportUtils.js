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
    .select('full_name,email,phone,company_name,niche,status,priority,custom_fields,notes')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!leads || leads.length === 0) {
    throw new Error('No leads found.');
  }

  const headers = ['Name', 'Email', 'Phone', 'Company', 'Niche', 'Status', 'Priority', 'Links', 'Notes'];
  const rows = leads.map(l => {
    // Collect links from custom_fields.links array
    const links = Array.isArray(l.custom_fields?.links)
      ? l.custom_fields.links.map(lk => lk.url || lk).join('; ')
      : [l.custom_fields?.linkedin_url, l.custom_fields?.instagram_url, l.custom_fields?.twitter_url, l.custom_fields?.website].filter(Boolean).join('; ');

    return toCSVRow([
      l.full_name,
      l.email,
      l.phone,
      l.company_name,
      l.niche,
      l.status,
      l.priority,
      links,
      l.notes
    ]);
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
