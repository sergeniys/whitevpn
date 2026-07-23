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

async function runEstoniaDoubleVpnLaptopTest() {
  console.log('====================================================');
  console.log('🇪🇪 ➔ 🇳🇱 ТЕСТ ДВОЙНОГО VPN (ЭСТОНИЯ ➔ НИДЕРЛАНДЫ) НА НОУТБУКЕ');
  console.log('====================================================');

  try {
    const controlConn = await createSshClient();

    console.log('\n1. Передача обновленных файлов и estoniajson.txt через SFTP...');
    await new Promise((resolve, reject) => {
      controlConn.sftp(async (err, sftp) => {
        if (err) return reject(err);
        try {
          const files = ['server.js', 'auto-vpn-tester.js', 'serverjson.txt', 'estoniajson.txt', 'public/app.js', 'public/index.html', 'public/style.css'];
          for (const f of files) {
            await uploadFile(sftp, f, 'C:/Users/sergey/whitevpn/' + f);
            console.log(`  ✅ Передан: ${f}`);
          }
          resolve();
        } catch (e) { reject(e); }
      });
    });

    console.log('\n2. Перезапуск процесса Node на ноутбуке...');
    await runSshCmd(controlConn, 'powershell -Command "Stop-Process -Name node -Force -ErrorAction SilentlyContinue"');
    await new Promise(r => setTimeout(r, 1500));

    const serverConn = await createSshClient();
    serverConn.exec('powershell -Command "cd C:\\Users\\sergey\\whitevpn; .\\node.exe server.js"', (err, stream) => {
      stream.on('data', d => process.stdout.write('[LAPTOP SERVER] ' + d.toString()));
      stream.stderr.on('data', d => process.stderr.write('[LAPTOP ERR] ' + d.toString()));
    });

    console.log('\n3. Ожидание 4.5 сек для инициализации сервера...');
    await new Promise(r => setTimeout(r, 4500));

    const estoniaRaw = fs.readFileSync('estoniajson.txt', 'utf8');
    const netherlandsRaw = fs.readFileSync('serverjson.txt', 'utf8');

    const estoniaJson = JSON.parse(estoniaRaw);
    const netherlandsJson = JSON.parse(netherlandsRaw);

    const estoniaVless = estoniaJson.outbounds.find(o => o.protocol === 'vless');
    const netherlandsVless = netherlandsJson.outbounds.find(o => o.protocol === 'vless');

    const relayNode = {
      name: '🇪🇪 - Эстония #2 (Реле)',
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
      name: '🇳🇱 - Нидерланды #3 (Выход)',
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

    console.log('\n4. Запуск ДВОЙНОГО VPN (Эстония ➔ Нидерланды)...');
    const connectRes = await httpPost('/api/vpn/connect-double', {
      relayNode,
      exitNode,
      tunStack: 'gvisor'
    });
    console.log('✅ Ответ подключения:', connectRes);

    console.log('\n5. Ожидание 5.5 секунд...');
    await new Promise(r => setTimeout(r, 5500));

    console.log('\n6. Проверка IP через /api/vpn/ip-check на ноутбуке...');
    const ipRes = await httpGet('/api/vpn/ip-check');
    console.log('\n📊 РЕЗУЛЬТАТ IP ДВОЙНОГО VPN (Эстония ➔ Нидерланды):');
    console.dir(ipRes, { depth: null });

    console.log('\n7. Отключение POST /api/vpn/disconnect...');
    await httpPost('/api/vpn/disconnect', {});
    console.log('✅ VPN отключен на ноутбуке.');

    controlConn.end();
    serverConn.end();
  } catch (e) {
    console.error('❌ Ошибка при тесте на ноутбуке:', e.message);
  }
}

runEstoniaDoubleVpnLaptopTest();
