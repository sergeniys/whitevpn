const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');

const XRAY_BIN = path.join(__dirname, 'xray.exe');
const USER_CONFIG_TXT = path.join(__dirname, 'serverjson.txt');

console.log('=== DYNAMIC PORT TEST OF USER serverjson.txt ===');

const raw = fs.readFileSync(USER_CONFIG_TXT, 'utf8');
const json = JSON.parse(raw);

// Override inbound ports to dynamic ports 20808, 20809, 21111
json.inbounds = [
  {
    listen: "127.0.0.1",
    port: 20808,
    protocol: "socks",
    settings: { auth: "noauth", udp: true, userLevel: 8 },
    sniffing: { destOverride: ["http", "tls", "quic"], enabled: true },
    tag: "socks"
  },
  {
    listen: "127.0.0.1",
    port: 20809,
    protocol: "http",
    settings: { userLevel: 8 },
    sniffing: { destOverride: ["http", "tls", "quic"], enabled: true },
    tag: "http"
  }
];

const tempJsonPath = path.join(__dirname, 'temp_xray_clean.json');
fs.writeFileSync(tempJsonPath, JSON.stringify(json, null, 2), 'utf8');

const xrayProcess = spawn(XRAY_BIN, ['run', '-c', tempJsonPath]);

xrayProcess.stdout.on('data', data => {
  console.log('[XRAY STDOUT]:', data.toString().trim());
});

xrayProcess.stderr.on('data', data => {
  console.error('[XRAY STDERR]:', data.toString().trim());
});

setTimeout(() => {
  console.log('\n--- Testing SOCKS5 Proxy to YouTube (www.youtube.com) ---');

  const start = Date.now();
  const req = http.get({
    host: '127.0.0.1',
    port: 20809,
    path: 'http://cp.cloudflare.com/generate_204',
    headers: { Host: 'cp.cloudflare.com' }
  }, (res) => {
    const duration = Date.now() - start;
    console.log(`🎉 SUCCESS! HTTP Proxy URL Ping: Status ${res.statusCode} in ${duration}ms!`);
    xrayProcess.kill();
    if (fs.existsSync(tempJsonPath)) fs.unlinkSync(tempJsonPath);
  });

  req.on('error', (e) => {
    console.error(`❌ HTTP Proxy Error: ${e.message}`);
    xrayProcess.kill();
    if (fs.existsSync(tempJsonPath)) fs.unlinkSync(tempJsonPath);
  });
}, 1500);
