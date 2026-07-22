const http = require('http');
const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

fetchJson('http://ip-api.com/json').then(data => {
  console.log('✅ IP GEO SUCCESS:', data);
}).catch(err => {
  console.error('❌ IP GEO ERROR:', err.message);
});
