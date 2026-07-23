const fs = require('fs');
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

function uploadFile(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const content = fs.readFileSync(localPath);
      sftp.writeFile(remotePath, content, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

async function runLaptopDeployment() {
  console.log('====================================================');
  console.log('🚀 ОБНОВЛЕНИЕ И АВТОНОМНОЕ ТЕСТИРОВАНИЕ НА НОУТБУКЕ');
  console.log('====================================================');

  try {
    const controlConn = await createSshClient();
    console.log('\n1. Подключение по SSH к ноутбуку (192.168.0.199)...');

    console.log('\n2. Подтягивание свежего кода из GitHub (sergeniys/whitevpn)...');
    await runSshCmd(controlConn, 'powershell -Command "cd C:\\Users\\sergey\\whitevpn; git pull"');

    console.log('\n3. Синхронизация serverjson.txt с ноутбуком...');
    await uploadFile(controlConn, 'serverjson.txt', 'C:/Users/sergey/whitevpn/serverjson.txt');
    console.log('✅ serverjson.txt успешно перенесен на ноутбук!');

    console.log('\n4. Остановка старых процессов Node на ноутбуке...');
    await runSshCmd(controlConn, 'powershell -Command "Stop-Process -Name node -Force -ErrorAction SilentlyContinue"');
    await new Promise(r => setTimeout(r, 1500));

    console.log('\n5. Запуск серверного модуля server.js на ноутбуке...');
    const serverConn = await createSshClient();
    serverConn.exec('powershell -Command "cd C:\\Users\\sergey\\whitevpn; .\\node.exe server.js"', (err, stream) => {
      stream.on('data', d => process.stdout.write('[LAPTOP SERVER] ' + d.toString()));
      stream.stderr.on('data', d => process.stderr.write('[LAPTOP ERR] ' + d.toString()));
    });

    console.log('\n6. Ожидание 4.5 секунд для инициализации сервера...');
    await new Promise(r => setTimeout(r, 4500));

    console.log('\n7. Запуск полного автономного авто-тестера VPN на ноутбуке...');
    const testerConn = await createSshClient();
    await runSshCmd(testerConn, 'powershell -Command "cd C:\\Users\\sergey\\whitevpn; .\\node.exe auto-vpn-tester.js"');

    console.log('\n====================================================');
    console.log('🏆 ФИНАЛЬНОЕ ТЕСТИРОВАНИЕ НА НОУТБУКЕ УСПЕШНО ЗАВЕРШЕНО!');
    console.log('====================================================');

    controlConn.end();
    testerConn.end();
    serverConn.end();
  } catch (e) {
    console.error('❌ Ошибка при работе с ноутбуком:', e.message);
  }
}

runLaptopDeployment();
