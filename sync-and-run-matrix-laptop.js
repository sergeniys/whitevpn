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

function runSshCmd(conn, cmdString, onData) {
  return new Promise((resolve) => {
    conn.exec(cmdString, (err, stream) => {
      let stdout = '';
      let stderr = '';
      if (err) return resolve({ code: -1, stdout: '', stderr: err.message });
      stream.on('data', d => {
        const s = d.toString();
        stdout += s;
        if (onData) onData(s);
      });
      stream.stderr.on('data', d => {
        const s = d.toString();
        stderr += s;
        if (onData) onData(s);
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

const subRawBase64 = fs.readFileSync('C:/Users/serg/.gemini/antigravity-cli/brain/b8a87613-7b9e-49ed-9923-d76723b8cc3a/.system_generated/steps/1339/content.md', 'utf8').split('\n')[8].trim();

async function startRemoteMatrix() {
  console.log('====================================================');
  console.log('🚀 ЗАПУСК ПРЯМОГО МАТРИЧНОГО ТЕСТА XRAY НА НОУТБУКЕ');
  console.log('====================================================');

  const controlConn = await createSshClient();

  console.log('\n1. Передача файлов direct-matrix-test.js и user_sub_b64.txt...');
  await new Promise((resolve, reject) => {
    controlConn.sftp(async (err, sftp) => {
      if (err) return reject(err);
      try {
        await uploadFile(sftp, 'direct-matrix-test.js', 'C:/Users/sergey/whitevpn/direct-matrix-test.js');
        sftp.writeFile('C:/Users/sergey/whitevpn/user_sub_b64.txt', subRawBase64, (err2) => {
          if (err2) return reject(err2);
          resolve();
        });
      } catch (e) { reject(e); }
    });
  });

  console.log('\n2. Очистка старых процессов Node на ноутбуке...');
  await runSshCmd(controlConn, 'powershell -Command "Stop-Process -Name node -Force -ErrorAction SilentlyContinue"');
  await new Promise(r => setTimeout(r, 1000));

  console.log('\n3. Выполнение прямого матричного теста на ноутбуке...\n');
  const runnerConn = await createSshClient();
  await runSshCmd(runnerConn, 'powershell -Command "cd C:\\Users\\sergey\\whitevpn; .\\node.exe direct-matrix-test.js"', (data) => {
    process.stdout.write(data);
  });

  controlConn.end();
  runnerConn.end();
  console.log('\n✅ Тестирование успешно завершено.');
}

startRemoteMatrix();
