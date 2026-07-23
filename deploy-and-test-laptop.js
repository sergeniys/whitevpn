const { Client } = require('ssh2');

function runSsh(command) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      console.log(`\n[SSH ➔ LAPTOP (192.168.0.199)]: ${command}`);
      conn.exec(command, (err, stream) => {
        if (err) { conn.end(); return reject(err); }
        let stdout = '';
        let stderr = '';
        stream.on('close', (code) => {
          conn.end();
          resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() });
        });
        stream.on('data', d => {
          stdout += d.toString();
          process.stdout.write(d.toString());
        });
        stream.stderr.on('data', d => {
          stderr += d.toString();
          process.stderr.write(d.toString());
        });
      });
    }).on('error', (err) => {
      reject(err);
    }).connect({
      host: '192.168.0.199',
      port: 22,
      username: 'sergey',
      password: '5678',
      readyTimeout: 15000
    });
  });
}

async function startLaptopDeployment() {
  console.log('====================================================');
  console.log('🚀 УДАЛЕННОЕ ПОДКЛЮЧЕНИЕ И ТЕСТИРОВАНИЕ НА НОУТБУКЕ');
  console.log('====================================================');

  try {
    console.log('\n1. Поиск пути Node.exe на ноутбуке...');
    const findNodeCmd = 'powershell -Command "$n = (Get-Command node -ErrorAction SilentlyContinue).Source; if (-not $n -and (Test-Path \'C:\\Program Files\\nodejs\\node.exe\')) { $n = \'C:\\Program Files\\nodejs\\node.exe\' }; Write-Output $n"';
    const nodeRes = await runSsh(findNodeCmd);
    const nodeBin = nodeRes.stdout ? nodeRes.stdout.split('\n')[0].trim() : 'node';

    console.log(`\n✅ Найден Node.exe на ноутбуке: "${nodeBin}"`);

    console.log('\n2. Клонирование / обновление кода из GitHub (sergeniys/whitevpn)...');
    const gitCmd = 'powershell -Command "if (Test-Path C:\\Users\\sergey\\whitevpn) { cd C:\\Users\\sergey\\whitevpn; git pull } else { cd C:\\Users\\sergey; git clone https://github.com/sergeniys/whitevpn.git }"';
    await runSsh(gitCmd);

    console.log('\n3. Остановка прошлых процессов node на ноутбуке...');
    await runSsh('powershell -Command "Stop-Process -Name node -Force -ErrorAction SilentlyContinue"');

    console.log('\n4. Запуск сервера node server.js на ноутбуке...');
    await runSsh(`powershell -Command "cd C:\\Users\\sergey\\whitevpn; Start-Process '${nodeBin}' -ArgumentList 'server.js' -WindowStyle Hidden"`);
    await new Promise(r => setTimeout(r, 2500));

    console.log('\n5. Выполнение автономного тестирования авто-тестером VPN на ноутбуке...');
    const testResult = await runSsh(`powershell -Command "cd C:\\Users\\sergey\\whitevpn; & '${nodeBin}' auto-vpn-tester.js"`);

    console.log('\n====================================================');
    console.log('🏆 ФИНАЛЬНЫЙ РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ НА НОУТБУКЕ:');
    console.log(testResult.stdout);
    console.log('====================================================');
  } catch (e) {
    console.error('❌ Ошибка при удаленной работе с ноутбуком:', e.message);
  }
}

startLaptopDeployment();
