const http = require('http');
const { spawn } = require('child_process');

process.env.PORT = '3099';

const serverProc = spawn('node', ['server.js'], {
  env: { ...process.env, PORT: '3099' }
});

serverProc.stdout.on('data', d => console.log('[SERVER STDOUT]', d.toString().trim()));
serverProc.stderr.on('data', d => console.log('[SERVER STDERR]', d.toString().trim()));

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3099${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
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
      port: 3099,
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
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

setTimeout(async () => {
  console.log('\n🧪 --- ТЕСТИРОВАНИЕ ИЗОЛИРОВАННОГО СЕРВЕРА НА ПОРТУ 3099 ---');

  try {
    // 1. Check DPI
    const dpi = await httpGet('/api/check-dpi');
    console.log('1. GET /api/check-dpi -> Status:', dpi.status, '| State:', dpi.data ? dpi.data.state : 'FAIL');

    // 2. Fetch Subscription URL
    const sub = await httpPost('/api/sub/fetch', { subUrl: 'https://ads.v2raytnn.ru/sub/MzUyMjE4MzQ2XzI0MTMsMTc3MDE4OTAyMAAZ6DsYMEaT' });
    console.log('2. POST /api/sub/fetch -> Status:', sub.status, '| Success:', sub.data ? sub.data.success : false, '| Nodes count:', sub.data && sub.data.nodes ? sub.data.nodes.length : 0);

    // 3. IP Check
    const ip = await httpGet('/api/vpn/ip-check');
    console.log('3. GET /api/vpn/ip-check -> Status:', ip.status, '| IP:', ip.data ? ip.data.ip : 'FAIL');

    // 4. Relay Suitability Test
    const relayTest = await httpPost('/api/test-relay-suitability', {
      relayNode: {
        name: 'Test Moscow Node',
        host: 'msk.selectel-vpn.ru',
        port: 443,
        protocol: 'vless',
        security: 'reality'
      }
    });
    console.log('4. POST /api/test-relay-suitability -> Status:', relayTest.status, '| Message:', relayTest.data ? relayTest.data.message : 'FAIL');

    // 5. Test Invalid API Endpoint for 404 JSON Guard
    const badApi = await httpGet('/api/unknown-endpoint');
    console.log('5. GET /api/unknown-endpoint -> Status:', badApi.status, '| Error:', badApi.data ? badApi.data.error : 'FAIL');

  } catch (e) {
    console.error('❌ Ошибка во время теста:', e.message);
  } finally {
    serverProc.kill();
    process.exit(0);
  }
}, 2000);
