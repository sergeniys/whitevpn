const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Running node.exe server.js test on laptop...');
  conn.exec('powershell -Command "cd C:\\Users\\sergey\\whitevpn; .\\node.exe server.js"', (err, stream) => {
    if (err) throw err;
    let stdout = '';
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    setTimeout(() => {
      console.log('\nStopping test...');
      conn.end();
    }, 4000);
  });
}).connect({
  host: '192.168.0.199',
  port: 22,
  username: 'sergey',
  password: '5678'
});
