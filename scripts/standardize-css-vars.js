const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'public', 'marketing');

function standardizeVars(file) {
  const filePath = path.join(DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace variable names
  content = content.replace(/--paper-2/g, '--panel');
  content = content.replace(/--paper/g, '--bg');
  content = content.replace(/--line/g, '--hair');
  content = content.replace(/--accent-2/g, '--accent2');
  // text, muted, accent, panel are already the same or similar

  fs.writeFileSync(filePath, content);
  console.log('Standardized CSS vars in ' + file);
}

standardizeVars('levelup-pillars-flyer.html');
standardizeVars('levelup-extra-features-flyer.html');
