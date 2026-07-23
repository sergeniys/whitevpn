const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');

const LAPTOP_HOST = '192.168.0.199';

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

async function runDirectSyncAndTest() {
  console.log('====================================================');
  console.log('📦 ПРЯМАЯ СИНХРОНИЗАЦИЯ ФАЙЛОВ И ТЕСТ НА НОУТБУКЕ');
  console.log('====================================================');

  try {
    const controlConn = await createSshClient();
    console.log('\n1. Подключение по SSH к ноутбуку...');

    console.log('\n2. Синхронизация файлов через SFTP напрямую...');
    await new Promise((resolve, reject) => {
      controlConn.sftp(async (err, sftp) => {
        if (err) return reject(err);
        try {
          const filesToUpload = [
            'server.js',
            'auto-vpn-tester.js',
            'serverjson.txt',
            'public/app.js',
            'public/index.html',
            'public/style.css'
          ];
          for (const f of filesToUpload) {
            const remote = 'C:/Users/sergey/whitevpn/' + f;
            await uploadFile(sftp, f, remote);
            console.log(`  ✅ Передан файл: ${f}`);
          }
          resolve();
        } catch (e) { reject(e); }
      });
    });

    console.log('\n3. Остановка старых процессов Node на ноутбуке...');
    await runSshCmd(controlConn, 'powershell -Command "Stop-Process -Name node -Force -ErrorAction SilentlyContinue"');
    await new Promise(r => setTimeout(r, 1500));

    console.log('\n4. Запуск чистого сервера server.js на ноутбуке...');
    const serverConn = await createSshClient();
    serverConn.exec('powershell -Command "cd C:\\Users\\sergey\\whitevpn; .\\node.exe server.js"', (err, stream) => {
      stream.on('data', d => process.stdout.write('[LAPTOP SERVER] ' + d.toString()));
      stream.stderr.on('data', d => process.stderr.write('[LAPTOP ERR] ' + d.toString()));
    });

    console.log('\n5. Ожидание 4.5 секунд для инициализации HTTP сервера...');
    await new Promise(r => setTimeout(r, 4500));

    console.log('\n6. Выполнение полного автономного авто-тестирования на ноутбуке...');
    const testerConn = await createSshClient();
    await runSshCmd(testerConn, 'powershell -Command "cd C:\\Users\\sergey\\whitevpn; .\\node.exe auto-vpn-tester.js"');

    console.log('\n====================================================');
    console.log('🏆 ТЕСТИРОВАНИЕ НА НОУТБУКЕ УСПЕШНО ЗАВЕРШЕНО!');
    console.log('====================================================');

    controlConn.end();
    testerConn.end();
    serverConn.end();
  } catch (e) {
    console.error('❌ Ошибка при прямой синхронизации:', e.message);
  }
}

runDirectSyncAndTest();
