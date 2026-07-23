const fs = require('fs');
const http = require('http');

function httpPost(urlPath, payloadObject) {
  return new Promise((resolve, reject) => {
    const dataStr = JSON.stringify(payloadObject || {});
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataStr)
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { resolve(body); }
      });
    });
    req.on('error', reject);
    req.write(dataStr);
    req.end();
  });
}

function httpGet(urlPath) {
  return new Promise((resolve, reject) => {
    http.get({
      hostname: 'localhost',
      port: 3000,
      path: urlPath
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { resolve(body); }
      });
    }).on('error', reject);
  });
}

async function testEstoniaNetherlandsDouble() {
  console.log('====================================================');
  console.log('🧪 ТЕСТ ДВОЙНОГО VPN: ЭСТОНИЯ (РЕЛЕ) ➔ НИДЕРЛАНДЫ (ВЫХОД)');
  console.log('====================================================');

  const estoniaRaw = fs.readFileSync('estoniajson.txt', 'utf8');
  const netherlandsRaw = fs.readFileSync('serverjson.txt', 'utf8');

  const estoniaJson = JSON.parse(estoniaRaw);
  const netherlandsJson = JSON.parse(netherlandsRaw);

  const estoniaVless = estoniaJson.outbounds.find(o => o.protocol === 'vless');
  const netherlandsVless = netherlandsJson.outbounds.find(o => o.protocol === 'vless');

  const relayNode = {
    name: '🇪🇪 - Эстония #2',
    protocol: 'vless',
    host: estoniaVless.settings.vnext[0].address,
    port: estoniaVless.settings.vnext[0].port,
    uuid: estoniaVless.settings.vnext[0].users[0].id,
    flow: estoniaVless.settings.vnext[0].users[0].flow,
    security: estoniaVless.streamSettings.security,
    sni: estoniaVless.streamSettings.realitySettings.serverName,
    pbk: estoniaVless.streamSettings.realitySettings.publicKey,
    sid: estoniaVless.streamSettings.realitySettings.shortId,
    fingerprint: estoniaVless.streamSettings.realitySettings.fingerprint
  };

  const exitNode = {
    name: '🇳🇱 - Нидерланды #3',
    protocol: 'vless',
    host: netherlandsVless.settings.vnext[0].address,
    port: netherlandsVless.settings.vnext[0].port,
    uuid: netherlandsVless.settings.vnext[0].users[0].id,
    flow: netherlandsVless.settings.vnext[0].users[0].flow,
    security: netherlandsVless.streamSettings.security,
    sni: netherlandsVless.streamSettings.realitySettings.serverName,
    pbk: netherlandsVless.streamSettings.realitySettings.publicKey,
    sid: netherlandsVless.streamSettings.realitySettings.shortId,
    fingerprint: netherlandsVless.streamSettings.realitySettings.fingerprint
  };

  console.log('\n1. Реле узел:', relayNode.name, `(${relayNode.host}:${relayNode.port})`);
  console.log('2. Выходящий узел:', exitNode.name, `(${exitNode.host}:${exitNode.port})`);

  console.log('\n3. Отправка POST /api/vpn/connect-double...');
  const res = await httpPost('/api/vpn/connect-double', {
    relayNode,
    exitNode,
    tunStack: 'gvisor'
  });
  console.log('✅ Ответ сервера:', res);

  console.log('\n4. Ожидание 5 секунд установления цепочки...');
  await new Promise(r => setTimeout(r, 5000));

  console.log('\n5. Проверка IP /api/vpn/ip-check...');
  const ipRes = await httpGet('/api/vpn/ip-check');
  console.log('\n📊 РЕЗУЛЬТАТ IP:');
  console.dir(ipRes, { depth: null });

  console.log('\n6. Отключение POST /api/vpn/disconnect...');
  await httpPost('/api/vpn/disconnect', {});
  console.log('✅ VPN Отключен.');
}

testEstoniaNetherlandsDouble();
