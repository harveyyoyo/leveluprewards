const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let gitCommit = 'N/A';
try {
  gitCommit = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {}

const formatSafeTimestamp = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  let hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = pad(date.getMinutes());
  return `Updated-${year}-${month}-${day}-${pad(hours)}-${minutes}-${ampm}`;
};

const cinematicPath = path.join(__dirname, 'src', 'CinematicPromo.tsx');
const longPromoPath = path.join(__dirname, 'src', 'LongFeaturePromo.tsx');

const cinematicMtime = fs.existsSync(cinematicPath) ? fs.statSync(cinematicPath).mtime : new Date();
const longPromoMtime = fs.existsSync(longPromoPath) ? fs.statSync(longPromoPath).mtime : new Date();

const metadata = {
  cinematicUpdated: formatSafeTimestamp(cinematicMtime),
  longPromoUpdated: formatSafeTimestamp(longPromoMtime),
  newer: cinematicMtime.getTime() > longPromoMtime.getTime() ? 'cinematic' : 'longPromo',
  gitCommit,
  env: process.env.NODE_ENV || 'development'
};

fs.writeFileSync(
  path.join(__dirname, 'src', 'build-metadata.json'),
  JSON.stringify(metadata, null, 2)
);
console.log('Build metadata compiled successfully:');
console.log(' - CinematicPromo:', metadata.cinematicUpdated);
console.log(' - LongFeaturePromo:', metadata.longPromoUpdated);
console.log(' - Most Recent:', metadata.newer);
