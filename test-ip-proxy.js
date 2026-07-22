const http = require('http');
const https = require('https');
const url = require('url');

function fetchUrl(targetUrl, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const isHttps = targetUrl.startsWith('https');
    const client = isHttps ? https : http;
    const req = client.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: timeoutMs }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, body }));
    });
    req.on('error', () => resolve({ ok: false, body: '' }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, body: '' }); });
  });
}

async function runTest() {
  console.log('Testing direct ipify...');
  const ipifyRes = await fetchUrl('https://api.ipify.org?format=json', 3000);
  if (ipifyRes.ok) {
    const data = JSON.parse(ipifyRes.body);
    console.log('✅ DIRECT IP FOUND:', data.ip);
  } else {
    console.log('❌ Direct IP failed');
  }
}

runTest();
