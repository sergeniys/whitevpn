const fs = require('fs');

const path = 'C:/Users/serg/AppData/Local/Happ/subs.db';
const buf = fs.readFileSync(path);

// Print all text strings longer than 10 characters in UTF-8
const utf8Str = buf.toString('utf8');
const asciiStrings = utf8Str.match(/[\x20-\x7E\u0400-\u04FF]{15,}/g) || [];

console.log('Total ASCII/UTF8 Strings:', asciiStrings.length);

const httpUrls = asciiStrings.filter(s => s.startsWith('http://') || s.startsWith('https://'));
console.log('\nFound HTTP/HTTPS Sub URLs:', httpUrls.length);
httpUrls.forEach(u => console.log('Sub URL:', u));
