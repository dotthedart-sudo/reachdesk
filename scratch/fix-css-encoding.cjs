const fs = require('fs');
const buf = fs.readFileSync('src/index.css');
const map = {
  0x85: '...',
  0x91: "'",
  0x92: "'",
  0x93: '"',
  0x94: '"',
  0x96: '-',
  0x97: '-',
  0xa0: ' ',
};
let out = '';
for (let i = 0; i < buf.length; ) {
  const b = buf[i];
  if (b <= 0x7f) {
    out += String.fromCharCode(b);
    i++;
    continue;
  }
  if ((b & 0xe0) === 0xc0 && i + 1 < buf.length && (buf[i + 1] & 0xc0) === 0x80) {
    out += buf.slice(i, i + 2).toString('utf8');
    i += 2;
    continue;
  }
  if (
    (b & 0xf0) === 0xe0 &&
    i + 2 < buf.length &&
    (buf[i + 1] & 0xc0) === 0x80 &&
    (buf[i + 2] & 0xc0) === 0x80
  ) {
    out += buf.slice(i, i + 3).toString('utf8');
    i += 3;
    continue;
  }
  if (
    (b & 0xf8) === 0xf0 &&
    i + 3 < buf.length &&
    (buf[i + 1] & 0xc0) === 0x80 &&
    (buf[i + 2] & 0xc0) === 0x80 &&
    (buf[i + 3] & 0xc0) === 0x80
  ) {
    out += buf.slice(i, i + 4).toString('utf8');
    i += 4;
    continue;
  }
  out += map[b] || '?';
  i++;
}
fs.writeFileSync('src/index.css', out, 'utf8');
const check = fs.readFileSync('src/index.css');
new TextDecoder('utf-8', { fatal: true }).decode(check);
console.log('OK utf8', check.length);
