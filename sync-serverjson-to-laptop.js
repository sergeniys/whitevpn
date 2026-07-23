const fs = require('fs');
const { Client } = require('ssh2');

const realContent = fs.readFileSync('serverjson.txt', 'utf8');

const conn = new Client();
conn.on('ready', () => {
  console.log('Uploading serverjson.txt to Laptop...');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    sftp.writeFile('C:/Users/sergey/whitevpn/serverjson.txt', realContent, (err) => {
      if (err) console.error('SFTP Write Error:', err);
      else console.log('✅ serverjson.txt successfully synced to Laptop!');
      conn.end();
    });
  });
}).connect({
  host: '192.168.0.199',
  port: 22,
  username: 'sergey',
  password: '5678'
});
