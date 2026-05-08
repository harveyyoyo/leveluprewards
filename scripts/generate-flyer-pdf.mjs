import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const inputHtmlPath = path.resolve(repoRoot, 'flyers', 'levelup-rewards-flyer.html');
const outputDir = path.resolve(repoRoot, 'flyers', 'dist');
const outputPdfPath = path.resolve(outputDir, 'LevelUp-Rewards-Flyer.pdf');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(pathToFileURL(inputHtmlPath).toString(), { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });

  await page.pdf({
    path: outputPdfPath,
    format: 'Letter',
    printBackground: true,
    margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
  });

  await browser.close();
  // eslint-disable-next-line no-console
  console.log(`Generated PDF: ${outputPdfPath}`);
}

await import('node:fs/promises').then((fs) => fs.mkdir(outputDir, { recursive: true }));
await main();
