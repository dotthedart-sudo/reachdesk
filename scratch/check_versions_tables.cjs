const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVersions() {
  const email = `temp_version_user_${Math.floor(Math.random() * 100000)}@example.com`;
  const password = 'TemporaryPassword123!';
  
  console.log('Signing up temporary user:', email);
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });
  
  if (authError) {
    console.error('Sign up error:', authError.message);
    return;
  }
  
  const userId = authData.user.id;
  console.log('Signed up! User ID:', userId);

  // 1. Create a dummy note
  console.log('\n--- Creating dummy global note ---');
  const { data: noteData, error: noteErr } = await supabase.from('notes').insert([{
    user_id: userId,
    title: 'Dummy Note',
    content: '{}',
    type: 'text',
    pinned: false,
    color: '#ffffff'
  }]).select();

  if (noteErr) {
    console.error('Failed to create dummy note:', noteErr.message);
    return;
  }
  const noteId = noteData[0].id;
  console.log('Created note! ID:', noteId);

  // 2. Create a dummy lead note
  console.log('\n--- Creating dummy lead and lead note ---');
  const { data: leadData, error: leadErr } = await supabase.from('leads').insert([{
    user_id: userId,
    first_name: 'Dummy',
    last_name: 'Lead',
    email: `dummy_lead_${Math.floor(Math.random() * 100000)}@example.com`,
    status: 'Lead',
    priority: 'medium'
  }]).select();

  if (leadErr) {
    console.error('Failed to create dummy lead:', leadErr.message);
    return;
  }
  const leadId = leadData[0].id;

  const { data: leadNoteData, error: leadNoteErr } = await supabase.from('lead_notes').insert([{
    user_id: userId,
    lead_id: leadId,
    title: 'Dummy Lead Note',
    content: '{}'
  }]).select();

  if (leadNoteErr) {
    console.error('Failed to create dummy lead note:', leadNoteErr.message);
    return;
  }
  const leadNoteId = leadNoteData[0].id;
  console.log('Created lead note! ID:', leadNoteId);

  // 3. Insert into note_versions
  console.log('\n--- Inserting into note_versions ---');
  const { data: nVerData, error: nVerErr } = await supabase.from('note_versions').insert([{
    note_id: noteId,
    user_id: userId,
    content: '{}',
    title: 'V1',
    version_number: 1
  }]).select();

  if (nVerErr) {
    console.error('Failed insert note_versions:', nVerErr.message);
  } else {
    console.log('Success note_versions Columns:', Object.keys(nVerData[0]));
    console.log('Row:', nVerData[0]);
    await supabase.from('note_versions').delete().eq('id', nVerData[0].id);
  }

  // 4. Insert into lead_note_versions
  console.log('\n--- Inserting into lead_note_versions ---');
  const { data: lVerData, error: lVerErr } = await supabase.from('lead_note_versions').insert([{
    lead_note_id: leadNoteId,
    user_id: userId,
    content: '{}',
    title: 'V1',
    version_number: 1
  }]).select();

  if (lVerErr) {
    console.error('Failed insert lead_note_versions:', lVerErr.message);
  } else {
    console.log('Success lead_note_versions Columns:', Object.keys(lVerData[0]));
    console.log('Row:', lVerData[0]);
    await supabase.from('lead_note_versions').delete().eq('id', lVerData[0].id);
  }

  // Cleanup
  await supabase.from('lead_notes').delete().eq('id', leadNoteId);
  await supabase.from('leads').delete().eq('id', leadId);
  await supabase.from('notes').delete().eq('id', noteId);
}

checkVersions();
