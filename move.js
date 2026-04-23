const fs = require('fs');
const path = require('path');

const dirs = ['admin', 'portal', 'halloffame', 'prize', 'student', 'student-home', 'teacher'];
const base = path.join(__dirname, 'src', 'app');
const target = path.join(base, '[schoolId]');

if (!fs.existsSync(target)) {
  fs.mkdirSync(target, { recursive: true });
}

for (const dir of dirs) {
  const srcDir = path.join(base, dir);
  const destDir = path.join(target, dir);
  if (fs.existsSync(srcDir)) {
    fs.renameSync(srcDir, destDir);
    console.log(`Moved ${dir} to [schoolId]/${dir}`);
  } else {
    console.log(`${dir} not found`);
  }
}
