const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const SINGBOX_BIN = path.join(__dirname, 'sing-box.exe');
const USER_CONFIG_TXT = path.join(__dirname, 'serverjson.txt');
const testConfigPath = path.join(__dirname, 'temp_sb_tun_vless.json');

const userJson = JSON.parse(fs.readFileSync(USER_CONFIG_TXT, 'utf8'));
const vless = userJson.outbounds.find(o => o.protocol === 'vless');
const vnext = vless.settings.vnext[0];
const user = vnext.users[0];
const reality = vless.streamSettings.realitySettings;

const fullSingbox113TunVlessConfig = {
  log: { level: 'info' },
  dns: {
    servers: [
      { tag: 'remote-dns', type: 'udp', server: '1.1.1.1' }
    ]
  },
  inbounds: [
    {
      type: 'tun',
      tag: 'tun-in',
      interface_name: 'singbox-tun0',
      address: ['172.19.0.1/30'],
      auto_route: true,
      strict_route: true,
      stack: 'gvisor'
    },
    {
      type: 'mixed',
      tag: 'mixed-in',
      listen: '127.0.0.1',
      listen_port: 27890
    }
  ],
  route: {
    rules: [
      { action: 'sniff' },
      { port: 443, network: 'udp', action: 'reject' } // Block QUIC
    ]
  },
  outbounds: [
    {
      type: 'vless',
      tag: 'proxy',
      server: vnext.address,
      server_port: vnext.port,
      uuid: user.id,
      flow: user.flow || 'xtls-rprx-vision',
      tls: {
        enabled: true,
        server_name: reality.serverName || 'ign.com',
        utls: { enabled: true, fingerprint: reality.fingerprint || 'chrome' },
        reality: {
          enabled: true,
          public_key: reality.publicKey,
          short_id: reality.shortId || ''
        }
      }
    }
  ]
};

fs.writeFileSync(testConfigPath, JSON.stringify(fullSingbox113TunVlessConfig, null, 2), 'utf8');

const proc = spawn(SINGBOX_BIN, ['check', '-c', testConfigPath]);

proc.stdout.on('data', d => console.log('CHECK STDOUT:', d.toString()));
proc.stderr.on('data', d => console.error('CHECK STDERR:', d.toString()));

proc.on('close', code => {
  console.log(`🎉 Full Sing-Box 1.13 TUN + VLESS Reality check finished with code ${code}`);
  if (fs.existsSync(testConfigPath)) fs.unlinkSync(testConfigPath);
});
