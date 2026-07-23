const fs = require('fs');
const http = require('http');
const { spawn, execSync } = require('child_process');

console.log('1. Запуск server.js локально в текущем процессе...');
const serverProc = spawn('C:/Users/sergey/whitevpn/node.exe', ['server.js'], { cwd: 'C:/Users/sergey/whitevpn' });

serverProc.stdout.on('data', d => {
  // console.log('[SERVER]', d.toString().trim());
});
serverProc.stderr.on('data', d => {
  // console.log('[SERVER-ERR]', d.toString().trim());
});

function httpPost(urlPath, payloadObject) {
  return new Promise((resolve, reject) => {
    const dataStr = JSON.stringify(payloadObject || {});
    const req = http.request({
      hostname: '127.0.0.1',
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
      hostname: '127.0.0.1',
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

const subRawBase64 = fs.readFileSync('user_sub_b64.txt', 'utf8').trim();
const decodedSub = Buffer.from(subRawBase64, 'base64').toString('utf8');
const rawLinks = decodedSub.split('\n').map(l => l.trim()).filter(l => l.length > 0);

function parseLink(link) {
  const url = new URL(link);
  const search = new URLSearchParams(url.search);
  return {
    name: decodeURIComponent(url.hash.replace('#', '')),
    protocol: 'vless',
    host: url.hostname,
    port: parseInt(url.port || '8443'),
    uuid: url.username,
    flow: search.get('flow') || '',
    security: search.get('security') || 'reality',
    sni: search.get('sni') || 'ign.com',
    pbk: search.get('pbk') || '',
    sid: search.get('sid') || '',
    fingerprint: search.get('fp') || 'chrome',
    type: search.get('type') || 'tcp'
  };
}

const allParsedNodes = rawLinks.map(parseLink);

// Filter Russian Relay nodes vs Foreign Exit nodes
const relayNodes = allParsedNodes.filter(n => n.name.includes('🇷🇺') || n.name.includes('Белые списки') || n.name.includes('YouTube'));
const exitNodes = allParsedNodes.filter(n => !n.name.includes('🇷🇺') && !n.name.includes('Белые списки') && !n.name.includes('YouTube'));

async function runMatrix() {
  // Wait for server to listen
  await new Promise(r => setTimeout(r, 4500));

  console.log('====================================================');
  console.log('🔍 ТЕСТИРОВАНИЕ ВСЕХ КОМБИНАЦИЙ ДВОЙНОГО VPN В ПОДПИСКЕ');
  console.log('====================================================');
  console.log(`Найдено реле-узлов (РФ): ${relayNodes.length}`);
  console.log(`Найдено зарубежных узлов (Exit): ${exitNodes.length}`);

  const matrixResults = [];

  for (const relay of relayNodes) {
    for (const exit of exitNodes) {
      console.log(`\n----------------------------------------------------`);
      console.log(`🧪 ТЕСТ: [РЕЛЕ: ${relay.name} (${relay.host}:${relay.port})] ➔ [EXIT: ${exit.name} (${exit.host}:${exit.port})]`);

      try {
        await httpPost('/api/vpn/disconnect', {});
        await new Promise(r => setTimeout(r, 1000));

        const connRes = await httpPost('/api/vpn/connect-double', {
          relayNode: relay,
          exitNode: exit,
          tunStack: 'gvisor'
        });

        await new Promise(r => setTimeout(r, 4500));

        const ipRes = await httpGet('/api/vpn/ip-check');
        const isSuccess = ipRes && ipRes.ip && ipRes.ip !== '127.0.0.1' && ipRes.countryCode !== 'RU';

        const statusSymbol = isSuccess ? '✅ РАБОТАЕТ!' : '❌ СБОЙ (127.0.0.1)';
        console.log(`   Результат: ${statusSymbol} -> IP: ${ipRes.ip || 'none'}, Страна: ${ipRes.country || 'N/A'}`);

        matrixResults.push({
          relayName: relay.name,
          relayHost: relay.host,
          relayPort: relay.port,
          exitName: exit.name,
          exitHost: exit.host,
          exitPort: exit.port,
          success: isSuccess,
          resultIp: ipRes.ip,
          country: ipRes.country
        });
      } catch (e) {
        console.log(`   Ошибка теста: ${e.message}`);
        matrixResults.push({
          relayName: relay.name,
          relayHost: relay.host,
          relayPort: relay.port,
          exitName: exit.name,
          exitHost: exit.host,
          exitPort: exit.port,
          success: false,
          error: e.message
        });
      }
    }
  }

  await httpPost('/api/vpn/disconnect', {});
  serverProc.kill();

  console.log('\n====================================================');
  console.log('🏆 ИТОГОВАЯ МАТРИЦА РАБОЧИХ КОМБИНАЦИЙ ДВОЙНОГО VPN:');
  console.log('====================================================');
  const working = matrixResults.filter(r => r.success);
  console.log(`Всего проверено комбинаций: ${matrixResults.length}`);
  console.log(`Успешно работающих: ${working.length}\n`);

  working.forEach((w, i) => {
    console.log(`${i + 1}. ✅ [РЕЛЕ: ${w.relayName} (${w.relayHost}:${w.relayPort})] ➔ [EXIT: ${w.exitName} (${w.exitHost}:${w.exitPort})] => Выходной IP: ${w.resultIp} (${w.country})`);
  });

  process.exit(0);
}

runMatrix();
