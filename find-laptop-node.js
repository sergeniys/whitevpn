const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.exec('cmd /c "echo %PATH%"', (err, stream) => {
    if (err) throw err;
    let stdout = '';
    stream.on('data', d => stdout += d.toString());
    stream.on('close', () => {
      console.log('PATH ON LAPTOP:\n' + stdout);
      conn.end();
    });
  });
}).connect({
  host: '192.168.0.199',
  port: 22,
  username: 'sergey',
  password: '5678'
});
