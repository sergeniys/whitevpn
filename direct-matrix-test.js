const fs = require('fs');
const path = require('path');
const net = require('net');
const { spawn, execSync } = require('child_process');

const XRAY_BIN = 'C:/Users/sergey/whitevpn/xray.exe';

const subRawBase64 = fs.readFileSync('user_sub_b64.txt', 'utf8').trim();
const decodedSub = Buffer.from(subRawBase64, 'base64').toString('utf8');
const rawLinks = decodedSub.split('\n').map(l => l.trim()).filter(l => l.length > 0);

function parseLink(link) {
  const url = new URL(link);
  const search = new URLSearchParams(url.search);
  return {
    name: decodeURIComponent(url.hash.replace('#', '')),
    protocol: 'vless',
    host: url.hostname,
    port: parseInt(url.port || '8443'),
    uuid: url.username,
    flow: search.get('flow') || '',
    security: search.get('security') || 'reality',
    sni: search.get('sni') || 'ign.com',
    pbk: search.get('pbk') || '',
    sid: search.get('sid') || '',
    fingerprint: search.get('fp') || 'chrome',
    type: search.get('type') || 'tcp'
  };
}

const allParsedNodes = rawLinks.map(parseLink);

// Relay candidates (Russia)
const relayNodes = allParsedNodes.filter(n => n.name.includes('🇷🇺') || n.name.includes('Белые списки') || n.name.includes('YouTube'));
// Exit candidates (Foreign)
const exitNodes = allParsedNodes.filter(n => !n.name.includes('🇷🇺') && !n.name.includes('Белые списки') && !n.name.includes('YouTube'));

function testXrayProxy(proxyPort) {
  return new Promise((resolve) => {
    const socket = net.connect(proxyPort, '127.0.0.1', () => {
      socket.write('GET http://ip-api.com/json HTTP/1.1\r\nHost: ip-api.com\r\nUser-Agent: curl/7.68.0\r\nConnection: close\r\n\r\n');
    });
    let body = '';
    socket.on('data', chunk => body += chunk.toString('utf8'));
    socket.on('end', () => {
      try {
        const jsonIdx = body.indexOf('{');
        if (jsonIdx !== -1) {
          const parsed = JSON.parse(body.substring(jsonIdx));
          resolve(parsed);
        } else resolve(null);
      } catch (e) { resolve(null); }
    });
    socket.on('error', () => resolve(null));
    socket.setTimeout(4000, () => { socket.destroy(); resolve(null); });
  });
}

async function runDirectMatrix() {
  console.log('====================================================');
  console.log('⚡ ПРЯМОЙ ЭМПИРИЧЕСКИЙ МАТРИЧНЫЙ ТЕСТ XRAY CHAINING');
  console.log('====================================================');
  console.log(`Найдено реле-узлов (РФ): ${relayNodes.length}`);
  console.log(`Найдено зарубежных узлов (Exit): ${exitNodes.length}`);

  const results = [];
  const testPort = 20888;

  for (const relay of relayNodes) {
    for (const exit of exitNodes) {
      process.stdout.write(`\n🧪 ТЕСТ: [${relay.name} (${relay.host}:${relay.port})] ➔ [${exit.name} (${exit.host}:${exit.port})] ... `);

      const xrayConfig = {
        log: { loglevel: 'warning' },
        inbounds: [
          {
            port: testPort,
            listen: '127.0.0.1',
            protocol: 'http',
            tag: 'http-in'
          }
        ],
        outbounds: [
          {
            protocol: (exit.protocol || 'vless').toLowerCase(),
            tag: 'proxy',
            proxySettings: { tag: 'relay' },
            settings: {
              vnext: [
                {
                  address: exit.host,
                  port: exit.port,
                  users: [
                    {
                      id: exit.uuid,
                      encryption: 'none',
                      flow: '',
                      security: 'auto'
                    }
                  ]
                }
              ]
            },
            streamSettings: {
              network: 'tcp',
              security: exit.security || 'reality',
              realitySettings: {
                fingerprint: exit.fingerprint || 'chrome',
                publicKey: exit.pbk || '',
                serverName: exit.sni || exit.host,
                shortId: exit.sid || ''
              }
            }
          },
          {
            protocol: (relay.protocol || 'vless').toLowerCase(),
            tag: 'relay',
            settings: {
              vnext: [
                {
                  address: relay.host,
                  port: relay.port,
                  users: [
                    {
                      id: relay.uuid,
                      encryption: 'none',
                      flow: '',
                      security: 'auto'
                    }
                  ]
                }
              ]
            },
            streamSettings: {
              network: 'tcp',
              security: relay.security || 'reality',
              realitySettings: {
                fingerprint: relay.fingerprint || 'chrome',
                publicKey: relay.pbk || '',
                serverName: relay.sni || relay.host,
                shortId: relay.sid || ''
              }
            }
          }
        ]
      };

      const cfgPath = path.join(__dirname, 'temp_matrix_xray.json');
      fs.writeFileSync(cfgPath, JSON.stringify(xrayConfig, null, 2), 'utf8');

      let xrayProc;
      try {
        xrayProc = spawn(XRAY_BIN, ['run', '-c', cfgPath]);
        await new Promise(r => setTimeout(r, 1200));

        const ipRes = await testXrayProxy(testPort);
        const isSuccess = ipRes && ipRes.query && ipRes.countryCode !== 'RU';

        if (isSuccess) {
          console.log(`✅ РАБОТАЕТ! IP: ${ipRes.query} (${ipRes.country})`);
          results.push({ relay: relay.name, relayHost: relay.host, exit: exit.name, exitHost: exit.host, ip: ipRes.query, country: ipRes.country, success: true });
        } else {
          console.log(`❌ СБОЙ`);
          results.push({ relay: relay.name, relayHost: relay.host, exit: exit.name, exitHost: exit.host, success: false });
        }
      } catch (e) {
        console.log(`❌ ОШИБКА: ${e.message}`);
      } finally {
        if (xrayProc) {
          try { xrayProc.kill(); } catch (e) {}
        }
        try { fs.unlinkSync(cfgPath); } catch (e) {}
      }
    }
  }

  console.log('\n====================================================');
  console.log('🏆 ИТОГОВЫЙ СПИСОК ВСЕХ РАБОЧИХ ДВОЙНЫХ СВЯЗОК:');
  console.log('====================================================');
  const working = results.filter(r => r.success);
  console.log(`Всего комбинаций: ${results.length}`);
  console.log(`Успешно работающих: ${working.length}\n`);

  working.forEach((w, i) => {
    console.log(`${i + 1}. ✅ [РЕЛЕ: ${w.relay} (${w.relayHost})] ➔ [EXIT: ${w.exit} (${w.exitHost})] => Выходной IP: ${w.ip} (${w.country})`);
  });
}

runDirectMatrix();
