import fs from 'fs';

const content = fs.readFileSync('src/components/CRM.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('PRESET_COLORS')) {
    console.log(`Line ${index + 1}: ${line}`);
  }
});
