const { execSync } = require('child_process');

function isRunningAsAdmin() {
  try {
    execSync('net session', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

console.log('Am I running as Administrator?', isRunningAsAdmin());
