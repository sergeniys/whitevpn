const { Client } = require('ssh2');

function runLaptopCommand(cmdString) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      console.log(`[SSH -> LAPTOP 192.168.0.199] Executing: ${cmdString}`);
      conn.exec(cmdString, (err, stream) => {
        if (err) { conn.end(); return reject(err); }
        let stdout = '';
        let stderr = '';
        stream.on('close', (code) => {
          conn.end();
          resolve({ code, stdout, stderr });
        });
        stream.on('data', data => stdout += data.toString());
        stream.stderr.on('data', data => stderr += data.toString());
      });
    }).on('error', (err) => {
      console.error('SSH Connection Error:', err.message);
      reject(err);
    }).connect({
      host: '192.168.0.199',
      port: 22,
      username: 'sergey',
      password: '5678',
      readyTimeout: 10000
    });
  });
}

async function testRemoteLaptop() {
  try {
    const info = await runLaptopCommand('powershell -Command "whoami; Get-Date"');
    console.log('RESULT FROM LAPTOP:\n', info.stdout);
  } catch (e) {
    console.error('FAILED TO CONNECT:', e.message);
  }
}

testRemoteLaptop();
