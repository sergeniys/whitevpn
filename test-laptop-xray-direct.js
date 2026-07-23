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

function runSshCommand(conn, cmd) {
  return new Promise((resolve) => {
    conn.exec(cmd, (err, stream) => {
      let stdout = '';
      if (err) return resolve({ stdout: '', stderr: err.message });
      stream.on('data', d => stdout += d.toString());
      stream.on('close', () => resolve({ stdout: stdout.trim() }));
    });
  });
}

function httpPost(urlPath, payloadObject) {
  return new Promise((resolve, reject) => {
    const dataStr = JSON.stringify(payloadObject);
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

async function runTest() {
  console.log('====================================================');
  console.log('🚀 ОЧИСТКА И ТЕСТИРОВАНИЕ XRAY VPN НА НОУТБУКЕ');
  console.log('====================================================');

  try {
    const controlConn = await createSshClient();

    console.log('\n1. Остановка прошлых процессов Node на ноутбуке...');
    await runSshCommand(controlConn, 'powershell -Command "Stop-Process -Name node -Force -ErrorAction SilentlyContinue"');
    await new Promise(r => setTimeout(r, 1500));

    console.log('\n2. Запуск чистого экземпляра server.js на ноутбуке...');
    const serverConn = await createSshClient();
    serverConn.exec('powershell -Command "cd C:\\Users\\sergey\\whitevpn; .\\node.exe server.js"', (err, stream) => {
      stream.on('data', d => process.stdout.write('[LAPTOP SERVER] ' + d.toString()));
      stream.stderr.on('data', d => process.stderr.write('[LAPTOP ERR] ' + d.toString()));
    });

    console.log('\n3. Ожидание 4 сек инициализации сервера...');
    await new Promise(r => setTimeout(r, 4000));

    console.log('\n4. Подготовка узла VLESS Reality...');
    const targetNode = {
      id: 'working_netherlands_node',
      name: '🇳🇱 Нидерланды (Xray Core)',
      protocol: 'vless',
      host: '31.76.52.24',
      port: 8443,
      uuid: '8312c8be-9ac8-4db0-bd7e-dd38ae2b73e9',
      flow: 'xtls-rprx-vision',
      security: 'reality',
      sni: 'ign.com',
      pbk: 'SbVKOEMjK0sIlbwg4akyBg5mL5KZwwB-ed4eEE7YnRc',
      fingerprint: 'chrome',
      sid: ''
    };
    console.log('✅ Узел подготовлен:', targetNode.name, `(${targetNode.host}:${targetNode.port})`);

    console.log('\n5. Отправка команды подключения POST /api/vpn/connect-single (Core: Xray)...');
    const connectRes = await httpPost('/api/vpn/connect-single', {
      node: targetNode,
      engine: 'xray',
      tunStack: 'gvisor'
    });
    console.log('✅ Ответ сервера подключения:', connectRes);

    console.log('\n6. Ожидание 4.5 сек для инициализации сокетов Xray...');
    await new Promise(r => setTimeout(r, 4500));

    console.log('\n7. Проверка внешнего IP и страны на ноутбуке (/api/vpn/ip-check)...');
    const ipRes = await httpGet('/api/vpn/ip-check');
    console.log('\n====================================================');
    console.log('🏆 ФИНАЛЬНЫЙ РЕЗУЛЬТАТ ПРОВЕРКИ СТАТУСА И IP НА НОУТБУКЕ:');
    console.dir(ipRes, { depth: null });
    console.log('====================================================');

    controlConn.end();
  } catch (e) {
    console.error('❌ Ошибка тестирования:', e.message);
  }
}

runTest();
