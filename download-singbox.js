const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const url = 'https://github.com/SagerNet/sing-box/releases/download/v1.13.14/sing-box-1.13.14-windows-amd64.zip';
const zipPath = path.join(__dirname, 'singbox.zip');
const exePath = path.join(__dirname, 'sing-box.exe');

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
  console.log('Downloading sing-box from GitHub...');
  await download(url, zipPath);
  console.log('Download complete. Extracting sing-box.exe...');
  
  execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${__dirname}' -Force"`);
  
  const extractedDir = path.join(__dirname, 'sing-box-1.13.14-windows-amd64');
  const extractedExe = path.join(extractedDir, 'sing-box.exe');
  
  if (fs.existsSync(extractedExe)) {
    fs.copyFileSync(extractedExe, exePath);
    console.log('✅ sing-box.exe successfully installed at:', exePath);
  } else {
    console.error('Extraction failed: sing-box.exe not found in extracted archive.');
  }

  // Cleanup
  try {
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    if (fs.existsSync(extractedDir)) fs.rmSync(extractedDir, { recursive: true, force: true });
  } catch (e) {}
}

main().catch(err => {
  console.error('Error installing sing-box:', err.message);
});
