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
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
      });
    }).on('error', reject).connect({
      host: '192.168.0.199',
      port: 22,
      username: 'sergey',
      password: '5678',
      readyTimeout: 15000
    });
  });
}

async function runLaptopSuite() {
  try {
    console.log('====================================================');
    console.log('🚀 АВТОМАТИЧЕСКИЙ ТЕСТ И НАСТРОЙКА VPN НА НОУТБУКЕ');
    console.log('====================================================');

    console.log('\n1. Обновление кода из GitHub...');
    await runSsh('powershell -Command "cd C:\\Users\\sergey\\whitevpn; git pull"');

    console.log('\n2. Остановка старых процессов Node на ноутбуке...');
    await runSsh('powershell -Command "Stop-Process -Name node -Force -ErrorAction SilentlyContinue"');

    console.log('\n3. Открытие порта 3000 в брандмауэре Windows...');
    await runSsh('powershell -Command "New-NetFirewallRule -Name VPNSuite3000 -DisplayName \'VPN Suite 3000\' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 3000 -ErrorAction SilentlyContinue"');

    console.log('\n4. Запуск сервера server.js на ноутбуке через Start-Job...');
    await runSsh('powershell -Command "Start-Job -ScriptBlock { Set-Location C:\\Users\\sergey\\whitevpn; .\\node.exe server.js }"');

    console.log('\n5. Ожидание 4 секунд для полной инициализации...');
    await new Promise(r => setTimeout(r, 4000));

    console.log('\n6. Запуск авто-тестирования VPN туннеля (auto-vpn-tester.js)...');
    const testRes = await runSsh('powershell -Command "cd C:\\Users\\sergey\\whitevpn; .\\node.exe auto-vpn-tester.js"');

    console.log('\n====================================================');
    console.log('🏆 РЕЗУЛЬТАТ АВТО-ТЕСТА НА НОУТБУКЕ:');
    console.log(testRes.stdout);
    console.log('====================================================');

  } catch (e) {
    console.error('❌ Ошибка:', e.message);
  }
}

runLaptopSuite();
