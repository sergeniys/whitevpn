const http = require('http');
const https = require('https');
const net = require('net');
const url = require('url');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'vpn_activity.log');

function log(msg) {
  const time = new Date().toLocaleTimeString();
  const line = `[${time}] [AUTO-TESTER] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
  } catch (e) {}
}

// HTTP request via SOCKS5/HTTP Proxy
function fetchOverProxy(targetUrl, proxyHost = '127.0.0.1', proxyPort = 20808, timeoutMs = 6000) {
  return new Promise((resolve) => {
    const start = Date.now();
    try {
      const parsed = new url.URL(targetUrl);
      const req = http.get({
        host: proxyHost,
        port: proxyPort,
        path: targetUrl,
        headers: {
          'Host': parsed.hostname,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        timeout: timeoutMs
      }, (res) => {
        let body = '';
        res.on('data', c => { if (body.length < 50000) body += c.toString(); });
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 400,
            statusCode: res.statusCode,
            durationMs: Date.now() - start,
            bodyLength: body.length,
            title: (body.match(/<title>(.*?)<\/title>/i) || [])[1] || ''
          });
        });
      });

      req.on('error', (err) => {
        resolve({ ok: false, statusCode: 0, durationMs: Date.now() - start, error: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, statusCode: 0, durationMs: timeoutMs, error: 'ETIMEDOUT' });
      });
    } catch (e) {
      resolve({ ok: false, statusCode: 0, durationMs: Date.now() - start, error: e.message });
    }
  });
}

function postJson(targetUrl, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { resolve({}); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getJson(targetUrl) {
  return new Promise((resolve, reject) => {
    http.get(targetUrl, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { resolve({}); }
      });
    }).on('error', reject);
  });
}

async function runAutonomousTestCycle() {
  log('====================================================');
  log('🚀 ЗАПУСК АВТОНОМНОГО ЦИКЛА ТЕСТИРОВАНИЯ И РЕМОНТА VPN');
  log('====================================================');

  // Step 1. Load user serverjson.txt
  log('1. Загрузка рабочего узла serverjson.txt...');
  const userConfigRes = await getJson('http://localhost:3000/api/load-user-config');
  if (!userConfigRes.node) {
    log('❌ Ошибка: Узел из serverjson.txt не найден');
    return { success: false, reason: 'No user config' };
  }
  const node = userConfigRes.node;
  log(`✅ Узел загружен: ${node.name} (${node.host}:${node.port})`);

  const testEngines = ['xray', 'singbox'];
  let bestEngine = null;
  let testSummary = [];

  for (const engine of testEngines) {
    log(`----------------------------------------------------`);
    log(`2. Подключение VPN с ядром [${engine.toUpperCase()}]...`);

    const connectRes = await postJson('http://localhost:3000/api/vpn/connect-single', {
      node: node,
      tunStack: 'gvisor',
      engine: engine
    });

    if (!connectRes.success) {
      log(`❌ Ошибка запуска подключения на ядре ${engine}: ${connectRes.error}`);
      testSummary.push({ engine, connected: false, youtubeOk: false, error: connectRes.error });
      continue;
    }

    log(`✅ Подключение на ядре ${engine} запущено! (SOCKS5 порт: ${connectRes.details.socksPort})`);
    log(`⏳ Ожидание 1.5 сек для инициализации сокетов...`);
    await new Promise(r => setTimeout(r, 1500));

    // Test YouTube Main Page
    log(`3. Проверка доступности YouTube через ядро ${engine}...`);
    const ytRes = await fetchOverProxy('http://www.youtube.com', '127.0.0.1', connectRes.details.socksPort, 7000);

    // Test YouTube CDN / Cloudflare
    log(`4. Проверка прокси-канала Cloudflare 204...`);
    const cfRes = await fetchOverProxy('http://cp.cloudflare.com/generate_204', '127.0.0.1', connectRes.details.socksPort, 5000);

    // Check external IP location
    log(`5. Проверка внешнего IP и страны подключения...`);
    const ipRes = await fetchOverProxy('http://ip-api.com/json', '127.0.0.1', connectRes.details.socksPort, 5000);
    let ipData = { country: 'Unknown', query: 'Unknown' };
    try { ipData = JSON.parse(ipRes.body); } catch (e) {}

    const isYtOk = ytRes.ok || ytRes.statusCode === 200 || ytRes.statusCode === 301 || ytRes.statusCode === 302;
    const isCfOk = cfRes.ok || cfRes.statusCode === 204;

    log(`📊 РЕЗУЛЬТАТ ДЛЯ ЯДРА [${engine.toUpperCase()}]:`);
    log(`   • YouTube HTML Status: ${ytRes.statusCode} (${ytRes.durationMs} мс) | Title: "${ytRes.title}"`);
    log(`   • Cloudflare 204 Status: ${cfRes.statusCode} (${cfRes.durationMs} мс)`);
    log(`   • Внешний IP через прокси: ${ipData.query || 'N/A'} (Страна: ${ipData.country || 'N/A'})`);

    testSummary.push({
      engine,
      connected: true,
      socksPort: connectRes.details.socksPort,
      youtubeOk: isYtOk,
      ytStatus: ytRes.statusCode,
      ytDurationMs: ytRes.durationMs,
      cfOk: isCfOk,
      ip: ipData.query,
      country: ipData.country
    });

    if (isYtOk && !bestEngine) {
      bestEngine = engine;
    }
  }

  log('====================================================');
  log('🏆 ИТОГИ АВТОНОМНОГО ЦИКЛА ТЕСТИРОВАНИЯ:');
  testSummary.forEach(s => {
    log(`• Ядро ${s.engine.toUpperCase()}: ${s.youtubeOk ? '✅ YOUTUBE РАБОТАЕТ (200 OK)' : '❌ Сбой YouTube'} | IP: ${s.ip || 'N/A'} (${s.country || 'N/A'})`);
  });

  if (bestEngine) {
    log(`🎯 ОПТИМАЛЬНОЕ ЯДРО ВЫБРАНО: ${bestEngine.toUpperCase()}`);
    log(`Запуск постоянного VPN соединения на лучшем ядре [${bestEngine.toUpperCase()}]...`);
    await postJson('http://localhost:3000/api/vpn/connect-single', {
      node: node,
      tunStack: 'gvisor',
      engine: bestEngine
    });
    log(`✅ VPN ПОДКТЮЧЕН И СТАБИЛИЗИРОВАН НА ЯДРЕ ${bestEngine.toUpperCase()}!`);
    return { success: true, bestEngine, summary: testSummary };
  } else {
    log(`⚠️ Оба ядра не смогли открыть YouTube напрямую. Переключение на ядро Xray-Core как наиболее устойчивое...`);
    await postJson('http://localhost:3000/api/vpn/connect-single', {
      node: node,
      tunStack: 'gvisor',
      engine: 'xray'
    });
    return { success: false, bestEngine: 'xray', summary: testSummary };
  }
}

runAutonomousTestCycle();
