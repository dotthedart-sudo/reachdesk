// Node.js script to migrate corrupted leads
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

// Use service role key if available to bypass RLS, otherwise anon key is restricted
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

const CHECKPOINT_OFFSETS_HOURS = [12, 24, 72, 120, 168, 336, 504];

async function migrate() {
  console.log('--- STEP 4: MIGRATION START ---');

  // 1. Migrate direct match status values
  console.log('1. Migrating direct status matches...');
  const directMatches = [
    { from: 'lead', to: 'Lead' },
    { from: 'contacted', to: 'Contacted' },
    { from: 'booked', to: 'Booked' },
    { from: 'positive_reply', to: 'Positive Reply' }
  ];

  for (const match of directMatches) {
    const { count, error } = await supabase
      .from('leads')
      .update({ status: match.to })
      .eq('status', match.from);

    if (error) {
      console.error(`❌ Error migrating status ${match.from} to ${match.to}:`, error.message);
    } else {
      console.log(`✅ Status migration: '${match.from}' -> '${match.to}' updated.`);
    }
  }

  // 2. Fetch and migrate follow_up leads
  console.log('\n2. Fetching follow_up leads...');
  const { data: followUps, error: fetchError } = await supabase
    .from('leads')
    .select('id, first_name, last_name, last_contacted_at')
    .eq('status', 'follow_up');

  if (fetchError) {
    console.error('❌ Error fetching follow_up leads:', fetchError.message);
    return;
  }

  console.log(`Found ${followUps.length} follow_up leads to process.`);

  const nowMs = Date.now();
  let successCount = 0;

  for (const lead of followUps) {
    let nextCheckpoint = null;
    if (lead.last_contacted_at) {
      const baseTime = new Date(lead.last_contacted_at).getTime();
      let nextOffsetHours = null;
      for (const hours of CHECKPOINT_OFFSETS_HOURS) {
        const scheduledTime = baseTime + hours * 60 * 60 * 1000;
        if (scheduledTime > nowMs) {
          nextOffsetHours = hours;
          break;
        }
      }
      if (nextOffsetHours !== null) {
        nextCheckpoint = new Date(baseTime + nextOffsetHours * 60 * 60 * 1000).toISOString();
      }
    }

    const { error: updateError } = await supabase
      .from('leads')
      .update({
        status: 'No Show / Rescheduled',
        action_to_take: 'Send a follow up',
        next_checkpoint_at: nextCheckpoint
      })
      .eq('id', lead.id);

    if (updateError) {
      console.error(`❌ Error updating lead ID ${lead.id} (${lead.first_name}):`, updateError.message);
    } else {
      successCount++;
    }
  }

  console.log(`\n✅ Completed follow_up migration. Successfully updated ${successCount} / ${followUps.length} leads.`);
  console.log('--- STEP 4: MIGRATION END ---');
}

migrate().catch(console.error);
