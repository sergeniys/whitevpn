const { Client } = require('ssh2');

function createSshClient() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => resolve(conn))
        .on('error', reject)
        .connect({
          host: '192.168.0.199',
          port: 22,
          username: 'sergey',
          password: '5678',
          readyTimeout: 15000
        });
  });
}

async function runAutonomousLaptopTest() {
  console.log('====================================================');
  console.log('🚀 ЗАПУСК АВТОНОМНОГО VPN СЕРВЕРА И ТЕСТЕРА НА НОУТБУКЕ');
  console.log('====================================================');

  try {
    const serverConn = await createSshClient();
    console.log('\n1. Запуск server.js на ноутбуке (активное соединение)...');
    
    // Start server.js and keep output streaming
    serverConn.exec('powershell -Command "cd C:\\Users\\sergey\\whitevpn; .\\node.exe server.js"', (err, stream) => {
      if (err) console.error('Server exec error:', err);
      stream.on('data', d => process.stdout.write('[LAPTOP SERVER] ' + d.toString()));
      stream.stderr.on('data', d => process.stderr.write('[LAPTOP SERVER ERR] ' + d.toString()));
    });

    console.log('\n2. Ожидание 4 секунд для инициализации HTTP сервера...');
    await new Promise(r => setTimeout(r, 4000));

    console.log('\n3. Запуск auto-vpn-tester.js на ноутбуке...');
    const testerConn = await createSshClient();
    
    await new Promise((resolve) => {
      testerConn.exec('powershell -Command "cd C:\\Users\\sergey\\whitevpn; .\\node.exe auto-vpn-tester.js"', (err, stream) => {
        if (err) {
          console.error('Tester exec error:', err);
          testerConn.end();
          return resolve();
        }
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', () => {
          testerConn.end();
          resolve();
        });
      });
    });

    console.log('\n====================================================');
    console.log('✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО!');
    console.log('====================================================');

    serverConn.end();
  } catch (e) {
    console.error('❌ Ошибка:', e.message);
  }
}

runAutonomousLaptopTest();
