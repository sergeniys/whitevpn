const fs = require('fs');
const path = require('path');

function checkDir(d) {
  if (!fs.existsSync(d)) return;
  const files = fs.readdirSync(d);
  console.log(`=== Directory: ${d} ===`);
  files.forEach(f => {
    const full = path.join(d, f);
    const st = fs.statSync(full);
    console.log(` - ${f} (${st.size} bytes)`);
    if (st.isFile() && st.size < 500000) {
      const text = fs.readFileSync(full, 'utf8');
      if (text.includes('vless') || text.includes('relay') || text.includes('address')) {
        console.log(`    FOUND INTERESTING CONTENT in ${f}:`, text.substring(0, 300));
      }
    }
  });
}

checkDir('C:/Users/serg/AppData/Local/Happ/cache');
checkDir('C:/Users/serg/AppData/Local/Happ/routing');
