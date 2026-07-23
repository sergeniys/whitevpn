const fs = require('fs');

const content = fs.readFileSync('C:/Users/serg/.gemini/antigravity-cli/brain/b8a87613-7b9e-49ed-9923-d76723b8cc3a/.system_generated/steps/1339/content.md', 'utf8');

const line9 = content.split('\n')[8].trim();
const decoded = Buffer.from(line9, 'base64').toString('utf8');

console.log('Decoded Subscription Text:\n');
console.log(decoded);

const links = decoded.split('\n').map(l => l.trim()).filter(l => l.length > 0);
console.log('\n========================================');
console.log(`TOTAL SERVERS IN SUBSCRIPTION: ${links.length}`);
console.log('========================================');

links.forEach((link, idx) => {
  try {
    const url = new URL(link);
    const name = decodeURIComponent(url.hash.replace('#', ''));
    console.log(`[${idx + 1}] Server Name: ${name}`);
    console.log(`    Host/IP: ${url.hostname}:${url.port}`);
    console.log(`    Protocol: ${url.protocol}`);
    const search = new URLSearchParams(url.search);
    console.log(`    Security: ${search.get('security')}, Flow: ${search.get('flow')}, SNI: ${search.get('sni')}, Type: ${search.get('type')}`);
  } catch (e) {
    console.log(`[${idx + 1}] Link: ${link.substring(0, 80)}`);
  }
});
