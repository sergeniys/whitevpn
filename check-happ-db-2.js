const fs = require('fs');

const path = 'C:/Users/serg/AppData/Local/Happ/subs.db';
const buf = fs.readFileSync(path);
const str = buf.toString('latin1');

// Look for IP addresses or domain names or JSON configs
const ipMatches = str.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || [];
const uniqueIps = [...new Set(ipMatches)].filter(ip => !ip.startsWith('127.') && !ip.startsWith('172.') && !ip.startsWith('0.'));

console.log('Found Public IPs in Happ DB:', uniqueIps.length);
uniqueIps.forEach(ip => console.log('IP:', ip));

// Look for readable remarks/node names in UTF-8
const strUtf8 = buf.toString('utf8');
const remarks = strUtf8.match(/[\u4e00-\u9fa5\u0400-\u04FF\u2600-\u27BF\u1F600-\u1F64F\u1F300-\u1F5FF\u1F680-\u1F6FF][^\x00-\x1F\x7F-\x9F]{3,40}/g) || [];
console.log('\nFound Readable Server Remarks:', remarks.length);
[...new Set(remarks)].slice(0, 30).forEach(r => console.log('Remark:', r));
