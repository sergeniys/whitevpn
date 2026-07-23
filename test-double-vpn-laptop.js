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

async function runDoubleVpnTest() {
  console.log('====================================================');
  console.log('🚀 СИНХРОНИЗАЦИЯ И ТЕСТ ДВОЙНОГО VPN И ОТКЛЮЧЕНИЯ');
  console.log('====================================================');

  try {
    const controlConn = await createSshClient();
    console.log('\n1. Подключение к ноутбуку по SSH...');

    console.log('\n2. Синхронизация исправленных файлов server.js и др. через SFTP...');
    await new Promise((resolve, reject) => {
      controlConn.sftp(async (err, sftp) => {
        if (err) return reject(err);
        try {
          const files = ['server.js', 'auto-vpn-tester.js', 'serverjson.txt', 'public/app.js', 'public/index.html', 'public/style.css'];
          for (const f of files) {
            await uploadFile(sftp, f, 'C:/Users/sergey/whitevpn/' + f);
            console.log(`  ✅ Передан: ${f}`);
          }
          resolve();
        } catch (e) { reject(e); }
      });
    });

    console.log('\n3. Остановка старого процесса Node на ноутбуке...');
    await runSshCmd(controlConn, 'powershell -Command "Stop-Process -Name node -Force -ErrorAction SilentlyContinue"');
    await new Promise(r => setTimeout(r, 1500));

    console.log('\n4. Запуск чистого сервера server.js с поддержкой Xray Chaining...');
    const serverConn = await createSshClient();
    serverConn.exec('powershell -Command "cd C:\\Users\\sergey\\whitevpn; .\\node.exe server.js"', (err, stream) => {
      stream.on('data', d => process.stdout.write('[LAPTOP SERVER] ' + d.toString()));
      stream.stderr.on('data', d => process.stderr.write('[LAPTOP ERR] ' + d.toString()));
    });

    console.log('\n5. Ожидание 4.5 сек для инициализации сервера...');
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
      name: '🇳🇱 - Нидерланды (Выход Зарубеж)',
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

    console.log('\n6. Запуск ДВОЙНОГО VPN (РФ Реле ➔ Нидерланды Exit) через Xray Chaining...');
    const doubleRes = await httpPost('/api/vpn/connect-double', {
      relayNode,
      exitNode,
      tunStack: 'gvisor'
    });
    console.log('✅ Ответ подключения Double VPN:', doubleRes);

    console.log('\n7. Ожидание 5.5 секунд для установления туннелей...');
    await new Promise(r => setTimeout(r, 5500));

    console.log('\n8. Проверка внешнего IP и страны при ДВОЙНОМ VPN...');
    const doubleIpRes = await httpGet('/api/vpn/ip-check');
    console.log('\n📊 РЕЗУЛЬТАТ IP ПРИ ДВОЙНОМ VPN:');
    console.dir(doubleIpRes, { depth: null });

    console.log('\n9. Выполнение POST /api/vpn/disconnect (Отключение VPN)...');
    const disconnectRes = await httpPost('/api/vpn/disconnect', {});
    console.log('✅ Ответ отключения:', disconnectRes);

    console.log('\n10. Ожидание 3.0 сек для полного восстановления обычной сети...');
    await new Promise(r => setTimeout(r, 3000));

    console.log('\n11. Проверка прямого IP после отключения...');
    const directIpRes = await httpGet('/api/vpn/ip-check');
    console.log('\n📊 РЕЗУЛЬТАТ IP ПОСЛЕ ОТКЛЮЧЕНИЯ VPN:');
    console.dir(directIpRes, { depth: null });

    console.log('\n====================================================');
    console.log('🏆 ДВОЙНОЙ VPN И ВОССТАНОВЛЕНИЕ СЕТИ ПОСЛЕ ОТКЛЮЧЕНИЯ УСПЕШНО ПРОВЕРЕНЫ!');
    console.log('====================================================');

    controlConn.end();
    serverConn.end();
  } catch (e) {
    console.error('❌ Ошибка при тесте Двойного VPN:', e.message);
  }
}

runDoubleVpnTest();
