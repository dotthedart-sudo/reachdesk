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

async function listNotes() {
  const { data, error } = await supabase
    .from('notes')
    .select('id, title, type, content, updated_at')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching notes:', error);
    return;
  }

  console.log(`Total notes found: ${data.length}`);
  data.forEach(note => {
    console.log(`ID: ${note.id} | Title: ${note.title} | Type: ${note.type} | Updated: ${note.updated_at}`);
  });
}

listNotes();
