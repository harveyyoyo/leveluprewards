import fs from 'fs';

const p = 'src/app/[schoolId]/student/page.tsx';
let s = fs.readFileSync(p, 'utf8');

const hiddenStart = s.indexOf('<motionSafeStyle />');
if (hiddenStart >= 0) {
  s = s.replace('<motionSafeStyle />\n', '');
}

const dupStart = s.indexOf('<div className="hidden" aria-hidden>');
const schoolIdMarker = '          {schoolId ? (';
const dupEnd = s.indexOf(schoolIdMarker, dupStart);
if (dupStart >= 0 && dupEnd > dupStart) {
  s = s.slice(0, dupStart) + s.slice(dupEnd);
  fs.writeFileSync(p, s);
  console.log('Removed duplicate balance block');
} else {
  console.log('dup block not found', dupStart, dupEnd);
  process.exit(1);
}
