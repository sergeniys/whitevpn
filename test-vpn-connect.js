const http = require('http');

function postJson(url, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('Testing connect user node with Sing-Box Core...');
  const userConfigRes = await new Promise(r => {
    http.get('http://localhost:3000/api/load-user-config', res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => r(JSON.parse(b)));
    });
  });

  if (!userConfigRes.node) {
    console.error('Failed to load user node');
    return;
  }

  console.log('Node loaded:', userConfigRes.node.name);

  const connectRes = await postJson('http://localhost:3000/api/vpn/connect-single', {
    node: userConfigRes.node,
    tunStack: 'gvisor',
    engine: 'singbox'
  });

  console.log('Connect result:', connectRes);
}

run();
