const fs = require('fs');

const path = 'C:/Users/serg/AppData/Local/Happ/subs.db';
if (!fs.existsSync(path)) {
  console.log('File not found:', path);
  process.exit(0);
}

const buf = fs.readFileSync(path);
console.log('Database File Size:', buf.length, 'bytes');

const str = buf.toString('latin1'); // use latin1 to preserve raw text
const matches = str.match(/vless:\/\/[^\s"'\`\<\>\{\}\\]+/gi) || [];

console.log('Total VLESS Links found in Happ DB:', matches.length);

const unique = [...new Set(matches)];
console.log('Unique Links:', unique.length);

unique.forEach((u, i) => {
  const nameDec = decodeURIComponent(u.split('#')[1] || '');
  console.log(`\n--- Server #${i + 1}: ${nameDec} ---`);
  console.log(u);
});
