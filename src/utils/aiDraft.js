import { supabase } from '../lib/supabase';

/**
 * Shared helper to call the groq-chat Edge Function for AI message drafting.
 * Used by both the Reach Message Draft Modal (CRM) and Template Creation (Templates).
 *
 * @param {Object} params
 * @param {Object} [params.leadContext] - Information about the lead (first_name, last_name, company, status, notes, etc.)
 * @param {string} [params.platform] - Target platform/channel (e.g., 'email', 'whatsapp', 'linkedin', etc.)
 * @param {string} [params.extraInstructions] - Free text instruction from user
 * @param {string} [params.mode='draft-reply'] - Mode for Edge Function ('draft-reply' | 'support')
 * @returns {Promise<string>} Generated draft text
 */
export async function generateAIDraft({
  leadContext = {},
  platform = '',
  extraInstructions = '',
  mode = 'draft-reply',
}) {
  const name =
    [leadContext.first_name, leadContext.last_name].filter(Boolean).join(' ') ||
    leadContext.name ||
    'Unknown';

  const userContent = [
    `Lead name: ${name}`,
    `Company: ${leadContext.company || 'N/A'}`,
    `Status: ${leadContext.status || 'N/A'}`,
    `Platform/Channel: ${platform || leadContext.platform || 'General'}`,
    `Notes: ${leadContext.notes || 'None'}`,
    `Extra instructions from user: ${extraInstructions.trim() || 'None'}`,
    '',
    'Draft a message for this outreach.',
  ].join('\n');

  const { data, error } = await supabase.functions.invoke('groq-chat', {
    body: {
      mode,
      messages: [{ role: 'user', content: userContent }],
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.reply) throw new Error('No reply received from AI');

  return data.reply;
}
