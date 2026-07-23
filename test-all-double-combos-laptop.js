const fs = require('fs');
const http = require('http');
const { Client } = require('ssh2');

const LAPTOP_HOST = '192.168.0.199';
const LAPTOP_PORT = 3000;

function createSshClient() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => resolve(conn))
        .on('error', reject)
        .connect({
          host: LAPTOP_HOST,
          port: 22,
          username: 'sergey',
          password: '5678',
          readyTimeout: 15000
        });
  });
}

function runSshCmd(conn, cmdString) {
  return new Promise((resolve) => {
    conn.exec(cmdString, (err, stream) => {
      let stdout = '';
      let stderr = '';
      if (err) return resolve({ code: -1, stdout: '', stderr: err.message });
      stream.on('data', d => stdout += d.toString());
      stream.stderr.on('data', d => stderr += d.toString());
      stream.on('close', (code) => resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() }));
    });
  });
}

function uploadFile(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const content = fs.readFileSync(localPath);
    sftp.writeFile(remotePath, content, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function httpPost(urlPath, payloadObject) {
  return new Promise((resolve, reject) => {
    const dataStr = JSON.stringify(payloadObject || {});
    const req = http.request({
      hostname: LAPTOP_HOST,
      port: LAPTOP_PORT,
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
      hostname: LAPTOP_HOST,
      port: LAPTOP_PORT,
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

const subRawBase64 = fs.readFileSync('C:/Users/serg/.gemini/antigravity-cli/brain/b8a87613-7b9e-49ed-9923-d76723b8cc3a/.system_generated/steps/1339/content.md', 'utf8').split('\n')[8].trim();
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

const allParsedNodes = rawLinks.map(parseLink).filter(n => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(n.host));

const relayNodes = allParsedNodes.filter(n => n.name.includes('🇷🇺') || n.name.includes('Белые списки') || n.name.includes('YouTube'));
const exitNodes = allParsedNodes.filter(n => !n.name.includes('🇷🇺') && !n.name.includes('Белые списки') && !n.name.includes('YouTube'));

async function testAllCombos() {
  console.log('====================================================');
  console.log('🔍 ТЕСТИРОВАНИЕ ВСЕХ КОМБИНАЦИЙ ДВОЙНОГО VPN В ПОДПИСКЕ');
  console.log('====================================================');
  console.log(`Отфильтровано IP реле-узлов (РФ): ${relayNodes.length}`);
  console.log(`Отфильтровано IP зарубежных узлов (Exit): ${exitNodes.length}`);

  const controlConn = await createSshClient();
  
  console.log('\n1. Передача обновленного server.js на ноутбук...');
  await new Promise((resolve, reject) => {
    controlConn.sftp(async (err, sftp) => {
      if (err) return reject(err);
      try {
        await uploadFile(sftp, 'server.js', 'C:/Users/sergey/whitevpn/server.js');
        resolve();
      } catch (e) { reject(e); }
    });
  });

  console.log('\n2. Перезапуск процесса Node на ноутбуке...');
  await runSshCmd(controlConn, 'powershell -Command "Stop-Process -Name node -Force -ErrorAction SilentlyContinue"');
  await new Promise(r => setTimeout(r, 1500));

  const serverConn = await createSshClient();
  serverConn.exec('powershell -Command "cd C:\\Users\\sergey\\whitevpn; .\\node.exe server.js"', (err, stream) => {
    if (err) return;
    stream.on('data', d => {});
  });
  await new Promise(r => setTimeout(r, 4500));

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

        await new Promise(r => setTimeout(r, 4000));

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
  controlConn.end();
  serverConn.end();

  console.log('\n====================================================');
  console.log('🏆 ИТОГОВАЯ МАТРИЦА РАБОЧИХ КОМБИНАЦИЙ ДВОЙНОГО VPN:');
  console.log('====================================================');
  const working = matrixResults.filter(r => r.success);
  console.log(`Всего проверено комбинаций: ${matrixResults.length}`);
  console.log(`Успешно работающих: ${working.length}\n`);

  working.forEach((w, i) => {
    console.log(`${i + 1}. ✅ [РЕЛЕ: ${w.relayName} (${w.relayHost}:${w.relayPort})] ➔ [EXIT: ${w.exitName} (${w.exitHost}:${w.exitPort})] => Выходной IP: ${w.resultIp} (${w.country})`);
  });
}

testAllCombos();
