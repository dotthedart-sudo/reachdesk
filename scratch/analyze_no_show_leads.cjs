const { execSync } = require('child_process');

function run() {
  const stdout = execSync(
    `npx supabase db query --linked "SELECT id, first_name, last_name, email, notes, custom_fields, action_to_take, last_contacted_at FROM leads WHERE status = 'No Show';"`
  ).toString();

  const jsonStartIdx = stdout.indexOf('{');
  if (jsonStartIdx === -1) {
    console.error('Could not find query output JSON block.');
    return;
  }

  const resultObj = JSON.parse(stdout.slice(jsonStartIdx));
  const leads = resultObj.rows || [];

  console.log(`Analyzing ${leads.length} "No Show" leads:`);
  leads.forEach((l, idx) => {
    console.log(`[${idx+1}] ${l.first_name} ${l.last_name} (${l.email})`);
    console.log(`    Action: "${l.action_to_take}" | Notes: "${l.notes || ''}"`);
    console.log(`    Custom Fields: ${JSON.stringify(l.custom_fields || {})}`);
  });
}

run();
