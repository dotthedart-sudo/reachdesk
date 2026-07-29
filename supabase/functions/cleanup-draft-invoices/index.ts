import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createServiceClient,
  jsonResponse,
  requirePrivileged,
} from '../_shared/auth.ts';

serve(async (req) => {
  const authError = requirePrivileged(req);
  if (authError) return authError;

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.rpc('delete_old_draft_invoices');
    if (error) throw error;

    console.log('[cleanup-draft-invoices] Successfully deleted untouched drafts older than 30 days');

    return jsonResponse({ success: true, message: 'Draft invoices cleaned up.' });
  } catch (err) {
    console.error('[cleanup-draft-invoices] Error:', err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
