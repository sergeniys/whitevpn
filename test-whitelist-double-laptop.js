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
      stream.on('data', d => {
        stdout += d.toString();
        process.stdout.write(d.toString());
      });
      stream.stderr.on('data', d => {
        stderr += d.toString();
        process.stderr.write(d.toString());
      });
      stream.on('close', (code) => resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() }));
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

async function runWhitelistDoubleTest() {
  console.log('====================================================');
  console.log('🧪 ТЕСТ ДВОЙНОГО VPN: 84.201.164.62 (РФ БЕЛЫЙ СПИСОК РЕЛЕ) ➔ 31.76.52.24 (НИДЕРЛАНДЫ EXIT)');
  console.log('====================================================');

  try {
    const controlConn = await createSshClient();

    console.log('\n1. Перезапуск процесса Node на ноутбуке...');
    await runSshCmd(controlConn, 'powershell -Command "Stop-Process -Name node -Force -ErrorAction SilentlyContinue"');
    await new Promise(r => setTimeout(r, 1500));

    const serverConn = await createSshClient();
    serverConn.exec('powershell -Command "cd C:\\Users\\sergey\\whitevpn; .\\node.exe server.js"', (err, stream) => {
      stream.on('data', d => process.stdout.write('[LAPTOP SERVER] ' + d.toString()));
      stream.stderr.on('data', d => process.stderr.write('[LAPTOP ERR] ' + d.toString()));
    });

    console.log('\n2. Ожидание 4.5 сек для инициализации сервера...');
    await new Promise(r => setTimeout(r, 4500));

    const relayNode = {
      name: '🇷🇺 - Белые списки (Реле РФ)',
      protocol: 'vless',
      host: '84.201.164.62',
      port: 8443,
      uuid: '8312c8be-9ac8-4db0-bd7e-dd38ae2b73e9',
      flow: 'xtls-rprx-vision',
      security: 'reality',
      sni: 'ign.com',
      pbk: 'SbVKOEMjK0sIlbwg4akyBg5mL5KZwwB-ed4eEE7YnRc',
      fingerprint: 'chrome'
    };

    const exitNode = {
      name: '🇳🇱 - Нидерланды #3 (Выход)',
      protocol: 'vless',
      host: '31.76.52.24',
      port: 8443,
      uuid: '8312c8be-9ac8-4db0-bd7e-dd38ae2b73e9',
      flow: 'xtls-rprx-vision',
      security: 'reality',
      sni: 'ign.com',
      pbk: 'SbVKOEMjK0sIlbwg4akyBg5mL5KZwwB-ed4eEE7YnRc',
      fingerprint: 'chrome'
    };

    console.log('\n3. Запуск ДВОЙНОГО VPN...');
    const connectRes = await httpPost('/api/vpn/connect-double', {
      relayNode,
      exitNode,
      tunStack: 'gvisor'
    });
    console.log('✅ Ответ подключения:', connectRes);

    console.log('\n4. Ожидание 5.5 секунд...');
    await new Promise(r => setTimeout(r, 5500));

    console.log('\n5. Проверка IP через /api/vpn/ip-check на ноутбуке...');
    const ipRes = await httpGet('/api/vpn/ip-check');
    console.log('\n📊 РЕЗУЛЬТАТ IP ДВОЙНОГО VPN:');
    console.dir(ipRes, { depth: null });

    console.log('\n6. Отключение POST /api/vpn/disconnect...');
    await httpPost('/api/vpn/disconnect', {});
    console.log('✅ VPN отключен на ноутбуке.');

    controlConn.end();
    serverConn.end();
  } catch (e) {
    console.error('❌ Ошибка при тесте на ноутбуке:', e.message);
  }
}

runWhitelistDoubleTest();
