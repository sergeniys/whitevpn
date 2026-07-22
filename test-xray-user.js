const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const XRAY_BIN = path.join(__dirname, 'xray.exe');
const USER_CONFIG = path.join(__dirname, 'serverjson.txt');

console.log('--- Testing User Xray Config with xray.exe ---');

if (!fs.existsSync(XRAY_BIN)) {
  console.error('xray.exe not found!');
  process.exit(1);
}

if (!fs.existsSync(USER_CONFIG)) {
  console.error('serverjson.txt not found!');
  process.exit(1);
}

const xrayProcess = spawn(XRAY_BIN, ['run', '-c', USER_CONFIG]);

xrayProcess.stdout.on('data', data => console.log('[Xray STDOUT]:', data.toString().trim()));
xrayProcess.stderr.on('data', data => console.error('[Xray STDERR]:', data.toString().trim()));

setTimeout(() => {
  console.log('Test execution completed. Stopping xray.exe...');
  xrayProcess.kill();
}, 5000);
