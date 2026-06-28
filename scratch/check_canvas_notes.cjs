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

async function checkCanvasNotes() {
  const { data, error } = await supabase
    .from('notes')
    .select('id, title, type, content, updated_at')
    .eq('type', 'canvas')
    .order('updated_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching canvas notes:', error);
    return;
  }

  console.log('--- Canvas Notes ---');
  data.forEach(note => {
    console.log(`ID: ${note.id}`);
    console.log(`Title: ${note.title}`);
    console.log(`Updated At: ${note.updated_at}`);
    console.log(`Content length: ${note.content ? note.content.length : 'null'}`);
    if (note.content) {
      try {
        const parsed = JSON.parse(note.content);
        console.log(`Parsed keys: ${Object.keys(parsed).join(', ')}`);
        console.log(`Elements count: ${parsed.elements?.length}`);
      } catch (e) {
        console.log(`Parsing error: ${e.message}`);
        console.log(`Snippet: ${note.content.substring(0, 100)}`);
      }
    }
    console.log('--------------------');
  });
}

checkCanvasNotes();
