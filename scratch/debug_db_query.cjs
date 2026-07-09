const { execSync } = require('child_process');
try {
  const stdout = execSync(
    `npx supabase db query --linked "SELECT json_agg(leads) as leads_list FROM leads WHERE user_id = 'f647945e-f1d3-42fd-b85b-2b2a92134fba';"`
  ).toString();
  console.log('STDOUT LENGTH:', stdout.length);
  console.log('STDOUT SAMPLE:', stdout.slice(0, 500));
  console.log('STDOUT END:', stdout.slice(-500));
} catch (e) {
  console.error(e);
}
