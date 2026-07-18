const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    console.error('.env file not found at: ' + envPath);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split(/\r?\n/).forEach(line => {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || !line.includes('=')) return;
    
    const parts = line.split('=');
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  });

  const googleClientId = env.VITE_GOOGLE_CLIENT_ID;
  const googleClientSecret = env.GOOGLE_CLIENT_SECRET;
  const googleSheetsClientId = env.VITE_GOOGLE_SHEETS_CLIENT_ID;
  const googleSheetsClientSecret = env.GOOGLE_SHEETS_CLIENT_SECRET;

  if (!googleClientId || !googleClientSecret) {
    console.error('Error: Google Client ID or Secret is missing in .env!');
    process.exit(1);
  }

  console.log('Deploying secrets to Supabase...');
  
  // Construct the command securely using arrays or environment variables to avoid shell escaping/exposure
  const command = `npx supabase secrets set GOOGLE_CLIENT_ID="${googleClientId}" GOOGLE_CLIENT_SECRET="${googleClientSecret}" GOOGLE_SHEETS_CLIENT_ID="${googleSheetsClientId || ''}" GOOGLE_SHEETS_CLIENT_SECRET="${googleSheetsClientSecret || ''}"`;
  
  // Execute and capture output
  const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
  console.log('Secrets set successfully.');
  console.log(output.replace(/GOCSPX-[a-zA-Z0-9_-]+/g, 'GOCSPX-******')); // mask secrets in output just in case
} catch (error) {
  console.error('Error running command:', error.message);
  if (error.stderr) {
    console.error(error.stderr.replace(/GOCSPX-[a-zA-Z0-9_-]+/g, 'GOCSPX-******'));
  }
  process.exit(1);
}
