const fs = require('fs');
const path = require('path');

const logsDir = 'C:/Users/serg/AppData/Local/Happ/logs';
if (!fs.existsSync(logsDir)) {
  console.log('Logs dir not found');
  process.exit(0);
}

const files = fs.readdirSync(logsDir);
console.log('Log Files:', files);

files.forEach(f => {
  const p = path.join(logsDir, f);
  const stat = fs.statSync(p);
  if (stat.isFile()) {
    const text = fs.readFileSync(p, 'utf8');
    console.log(`\n=== Log File: ${f} (${stat.size} bytes) ===`);
    const lines = text.split('\n');
    console.log('Total Lines:', lines.length);
    // Find outbound/vless lines or server IPs
    const serverLines = lines.filter(l => l.includes('outbound') || l.includes('vless') || l.includes('server') || l.includes('connecting'));
    console.log('Server related lines:', serverLines.length);
    serverLines.slice(0, 30).forEach(l => console.log(l));
  }
});
