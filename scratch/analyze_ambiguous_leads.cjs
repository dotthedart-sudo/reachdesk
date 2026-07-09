const { execSync } = require('child_process');

function run() {
  console.log('Querying ambiguous leads from database...');
  
  const stdout = execSync(
    `npx supabase db query --linked "SELECT l.id, l.first_name, l.last_name, l.email, l.status, l.action_to_take, l.last_contacted_at, up.email as user_email FROM leads l JOIN user_profiles up ON up.id = l.user_id WHERE l.status IN ('Waiting', 'Follow Up', 'Call Booked', 'No Show') ORDER BY l.status, l.last_name, l.first_name;"`
  ).toString();

  // Find JSON start
  const jsonStartIdx = stdout.indexOf('{');
  if (jsonStartIdx === -1) {
    console.error('Could not find query output JSON block.');
    console.log(stdout);
    return;
  }

  const resultObj = JSON.parse(stdout.slice(jsonStartIdx));
  const leads = resultObj.rows || [];

  console.log(`Loaded ${leads.length} ambiguous leads.\n`);

  const groups = {};
  leads.forEach(l => {
    if (!groups[l.status]) groups[l.status] = [];
    groups[l.status].push(l);
  });

  Object.entries(groups).forEach(([status, list]) => {
    console.log(`=== STATUS: ${status} (${list.length} leads) ===`);
    list.forEach((l, idx) => {
      console.log(`${idx + 1}. [${l.user_email}] ${l.first_name} ${l.last_name} (${l.email})`);
      console.log(`   Action: "${l.action_to_take}" | Last Contacted: ${l.last_contacted_at}`);
    });
    console.log();
  });
}

run();
