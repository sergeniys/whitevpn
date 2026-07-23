const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Opening Firewall Port 3000 and starting server on Laptop...');
  conn.exec('powershell -Command "New-NetFirewallRule -Name VPNSuite3000 -DisplayName \'VPN Suite Port 3000\' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 3000 -ErrorAction SilentlyContinue; cd C:\\Users\\sergey\\whitevpn; .\\node.exe server.js"', (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
  });
}).connect({
  host: '192.168.0.199',
  port: 22,
  username: 'sergey',
  password: '5678'
});
