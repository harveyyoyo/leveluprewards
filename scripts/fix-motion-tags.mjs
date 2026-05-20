import fs from 'fs';

const OPEN_BARE = '\x3c' + 'div' + '\x3e';
const CLOSE = '\x3c/' + 'motion' + '\x3e';
const CLOSE_DIV = '\x3c/' + 'div' + '\x3e';

for (const p of process.argv.slice(2)) {
  let s = fs.readFileSync(p, 'utf8');
  s = s.replaceAll('<motion ', '<div ');
  s = s.replaceAll('<motion>', OPEN_BARE);
  s = s.replaceAll('</motion>', CLOSE_DIV);
  fs.writeFileSync(p, s);
  console.log('fixed', p);
}
