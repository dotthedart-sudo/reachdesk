const fs = require('fs');
const path = require('path');

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{1F1E6}-\u{1F1FF}✓✦]/u;

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      if (f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.ts')) {
        callback(dirPath);
      }
    }
  });
}

walkDir(path.join(__dirname, '../src'), (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (emojiRegex.test(line)) {
      // Exclude comments or lines inside template bodies if applicable, but print them first to see
      console.log(`${filePath}:${index + 1}: ${line.trim()}`);
    }
  });
});
