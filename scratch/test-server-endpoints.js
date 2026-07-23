const http = require('http');

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data.substring(0, 100) });
        }
      });
    }).on('error', reject);
  });
}

function httpPost(path, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body || {});
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data.substring(0, 100) });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testEndpoints() {
  console.log('🧪 ТЕСТИРОВАНИЕ ВСЕХ API ЭНДПОИНТОВ СЕРВЕРА...');

  try {
    const dpi = await httpGet('/api/check-dpi');
    console.log('1. GET /api/check-dpi:', dpi.status, dpi.data ? `✅ State: ${dpi.data.state}` : `❌ RAW: ${dpi.raw}`);

    const sub = await httpPost('/api/sub/fetch', { subUrl: 'https://ads.v2raytnn.ru/sub/MzUyMjE4MzQ2XzI0MTMsMTc3MDE4OTAyMAAZ6DsYMEaT' });
    console.log('2. POST /api/sub/fetch:', sub.status, sub.data ? `✅ Nodes parsed: ${sub.data.nodes ? sub.data.nodes.length : 0}` : `❌ RAW: ${sub.raw}`);

    const ip = await httpGet('/api/vpn/ip-check');
    console.log('3. GET /api/vpn/ip-check:', ip.status, ip.data ? `✅ IP: ${ip.data.ip}` : `❌ RAW: ${ip.raw}`);

    const status = await httpGet('/api/vpn/status');
    console.log('4. GET /api/vpn/status:', status.status, status.data ? `✅ Connected: ${status.data.connected}` : `❌ RAW: ${status.raw}`);
  } catch (e) {
    console.log('❌ Сбой выполнения теста:', e.message);
  }
}

testEndpoints();
