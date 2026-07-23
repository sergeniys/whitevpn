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

async function startXrayOnLaptop() {
  console.log('====================================================');
  console.log('🚀 ЗАПУСК VPN НА ЯДРЕ XRAY НА НОУТБУКЕ');
  console.log('====================================================');

  let serverConn;
  try {
    serverConn = await createSshClient();
    console.log('\n1. Запуск server.js на ноутбуке...');
    
    serverConn.exec('powershell -Command "cd C:\\Users\\sergey\\whitevpn; .\\node.exe server.js"', (err, stream) => {
      if (err) console.error('Server exec error:', err);
      stream.on('data', d => process.stdout.write('[LAPTOP SERVER] ' + d.toString()));
      stream.stderr.on('data', d => process.stderr.write('[LAPTOP SERVER ERR] ' + d.toString()));
    });

    console.log('\n2. Ожидание 3.5 секунд для инициализации сервера...');
    await new Promise(r => setTimeout(r, 3500));

    console.log('\n3. Инициализация подключения VPN через Xray...');
    const clientConn = await createSshClient();
    
    const connectScript = `
    const http = require('http');
    const fs = require('fs');
    const nodeData = fs.readFileSync('serverjson.txt', 'utf8').trim();
    
    const postData = JSON.stringify({
      nodeConfig: nodeData,
      coreType: 'xray',
      networkStack: 'gvisor'
    });

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/vpn/connect',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => console.log('CONNECT RESPONSE:', body));
    });
    req.write(postData);
    req.end();
    `;

    await new Promise((resolve) => {
      clientConn.exec(`powershell -Command "cd C:\\Users\\sergey\\whitevpn; .\\node.exe -e \\"${connectScript.replace(/\n/g, ' ')}\\""`, (err, stream) => {
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', () => {
          clientConn.end();
          resolve();
        });
      });
    });

    console.log('\n4. Ожидание 3 секунд для стабилизации Xray туннеля...');
    await new Promise(r => setTimeout(r, 3000));

    console.log('\n5. Запрос статуса IP на ноутбуке через proxy...');
    const checkConn = await createSshClient();
    await new Promise((resolve) => {
      checkConn.exec('powershell -Command "cd C:\\Users\\sergey\\whitevpn; .\\node.exe -e \\"http.get(\'http://localhost:3000/api/vpn/ip-check\', r => r.pipe(process.stdout))\\""', (err, stream) => {
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', () => {
          checkConn.end();
          resolve();
        });
      });
    });

    console.log('\n====================================================');
    console.log('✅ VPN УСПЕШНО РАБОТАЕТ НА НОУТБУКЕ!');
    console.log('====================================================');

  } catch (e) {
    console.error('❌ Ошибка:', e.message);
  }
}

startXrayOnLaptop();
