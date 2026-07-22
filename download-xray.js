const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const url = 'https://github.com/XTLS/Xray-core/releases/download/v25.1.30/Xray-windows-64.zip';
const zipPath = path.join(__dirname, 'xray.zip');
const exePath = path.join(__dirname, 'xray.exe');

function download(fileUrl, targetPath) {
  return new Promise((resolve, reject) => {
    const req = https.get(fileUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, targetPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const fileStream = fs.createWriteStream(targetPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close(() => resolve());
      });
    });
    req.on('error', reject);
  });
}

async function main() {
  console.log('Downloading Xray-core from GitHub...');
  await download(url, zipPath);
  console.log('Download complete. Extracting xray.exe...');
  
  execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${__dirname}\\xray-dist' -Force"`);
  
  const extractedExe = path.join(__dirname, 'xray-dist', 'xray.exe');
  
  if (fs.existsSync(extractedExe)) {
    fs.copyFileSync(extractedExe, exePath);
    console.log('✅ xray.exe successfully installed at:', exePath);
  } else {
    console.error('Extraction failed: xray.exe not found.');
  }

  // Cleanup
  try {
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    if (fs.existsSync(path.join(__dirname, 'xray-dist'))) fs.rmSync(path.join(__dirname, 'xray-dist'), { recursive: true, force: true });
  } catch (e) {}
}

main().catch(err => {
  console.error('Error installing xray:', err.message);
});
