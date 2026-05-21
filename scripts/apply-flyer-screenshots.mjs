/**
 * Updates flyer HTML img src to marketing/screenshots/*.png
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, '..', 'public', 'marketing');

/** Per-flyer image assignments (first img in file unless multiple listed). */
const FLYER_IMAGES = {
  'flyer-arcade.html': ['kiosk-welcome.png'],
  'flyer-scholastic.html': ['kiosk-welcome.png'],
  'flyer-professional.html': ['admin-stats.png'],
  'flyer-bold.html': ['kiosk-rewards-shop.png'],
  'flyer-sunset.html': ['hall-of-fame.png'],
  'flyer-retro.html': ['kiosk-welcome.png'],
  'flyer-minimal.html': ['kiosk-system-ready.png'],
  'flyer-teachers-quickstart.html': ['teacher-raffle.png'],
  'flyer-staff-pbis-playbook.html': ['admin-stats.png'],
  'flyer-students-elementary.html': ['kiosk-welcome.png'],
  'flyer-students-elementary-2.html': ['kiosk-welcome.png'],
  'flyer-students-middle.html': ['hall-of-fame.png'],
  'flyer-students-middle-2.html': ['hall-of-fame.png', 'student-home-portal.png'],
  'flyer-students-high.html': ['kiosk-rewards-shop.png'],
  'flyer-students-high-2.html': ['kiosk-rewards-shop.png'],
  'flyer-principal-data.html': ['admin-stats.png'],
  'flyer-principal-rollout.html': ['portal-hub.png'],
  'flyer-principal-roi.html': ['portal-hub.png'],
  'flyer-principal-culture.html': ['hall-of-fame.png'],
  'flyer-principal-tech.html': ['admin-stats.png'],
  'flyer-parents.html': ['kiosk-welcome.png'],
  'flyer-families-home-portal.html': ['student-home-portal.png'],
  'flyer-feature-houses.html': ['admin-houses.png'],
  'flyer-feature-raffle.html': ['teacher-raffle.png'],
  'flyer-feature-library.html': ['admin-library.png'],
  'flyer-feature-student-portal.html': ['student-home-portal.png'],
  'flyer-feature-bulletin.html': ['bulletin-board.png'],
  'flyer-feature-engagement.html': ['admin-badges.png'],
  'flyer-feature-hall-of-fame.html': ['hall-of-fame.png'],
  'flyer-feature-attendance.html': ['admin-attendance.png'],
  'flyer-feature-notifications.html': ['admin-notifications.png'],
  'flyer-feature-id-cards-themes.html': ['admin-id-card.png', 'admin-theme-designer.png'],
  'flyer-feature-rewards-shop.html': ['kiosk-rewards-shop.png'],
};

for (const [file, images] of Object.entries(FLYER_IMAGES)) {
  const filePath = path.join(DIR, file);
  if (!fs.existsSync(filePath)) {
    console.warn('Missing', file);
    continue;
  }
  let html = fs.readFileSync(filePath, 'utf8');
  let idx = 0;
  html = html.replace(/src="\/[^"]+\.(png|jpg|webp)"/gi, (match) => {
    const img = images[Math.min(idx, images.length - 1)];
    idx += 1;
    return `src="/marketing/screenshots/${img}"`;
  });
  fs.writeFileSync(filePath, html);
  console.log('Updated', file, '→', images.join(', '));
}
