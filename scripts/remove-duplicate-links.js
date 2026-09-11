const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'public', 'marketing');
const files = fs.readdirSync(DIR).filter(f => f.startsWith('levelup-') && f.endsWith('.html'));

for (const file of files) {
  const filePath = path.join(DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/<a class="interactive-list-link"[^>]*>[\s\S]*?<\/a>/g, '');
  fs.writeFileSync(filePath, content);
}
console.log("Removed duplicate interactive links");
