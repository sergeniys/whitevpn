const fs = require('fs');

const path = 'C:/Users/serg/AppData/Local/Happ/subs.db';
const buf = fs.readFileSync(path);

// Search for base64 blocks or vless:// inside the SQLite database
const text = buf.toString('latin1');

// Match base64 strings starting with vless:// or vmess:// or eJ (zlib) or ey (json)
const base64Regex = /(?:[A-Za-z0-9+/]{40,}=*)/g;
const b64Matches = text.match(base64Regex) || [];

console.log('Found Base64 chunks:', b64Matches.length);

let decodedCount = 0;
for (const chunk of b64Matches) {
  try {
    const decoded = Buffer.from(chunk, 'base64').toString('utf8');
    if (decoded.includes('vless://') || decoded.includes('vmess://') || decoded.includes('trojan://')) {
      console.log('\n=============================================');
      console.log('🎉 FOUND DECODED SUBSCRIPTION DATA:');
      console.log(decoded.substring(0, 1000));
      decodedCount++;
    }
  } catch (e) {}
}

console.log(`\nTotal Decoded Subscriptions Found: ${decodedCount}`);
