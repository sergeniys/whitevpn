const http = require('http');

function getLaptopJson(pathname) {
  return new Promise((resolve) => {
    http.get(`http://192.168.0.199:3000${pathname}`, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ ok: true, status: res.statusCode, data: JSON.parse(body) }); }
        catch (e) { resolve({ ok: false, body }); }
      });
    }).on('error', err => resolve({ ok: false, error: err.message }));
  });
}

async function testLaptopApi() {
  console.log('Testing connection to Laptop server (http://192.168.0.199:3000)...');
  const res = await getLaptopJson('/api/vpn/ip-check');
  console.log('LAPTOP IP CHECK RESPONSE:', res);
}

testLaptopApi();
