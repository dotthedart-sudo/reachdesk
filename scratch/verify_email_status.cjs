const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const resendApiKey = env.RESEND_API_KEY;

async function checkEmail(emailId) {
  const res = await fetch(`https://api.resend.com/emails/${emailId}`, {
    headers: {
      'Authorization': `Bearer ${resendApiKey}`
    }
  });

  const data = await res.json();
  console.log('Resend Email Object:');
  console.log(JSON.stringify(data, null, 2));
}

checkEmail('5d07243d-b6bf-417d-884d-7c2953089ab3');
