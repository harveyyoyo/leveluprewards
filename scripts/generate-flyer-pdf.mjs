import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const outputDir = path.resolve(repoRoot, 'flyers', 'dist');
const publicPdfDir = path.resolve(repoRoot, 'public', 'marketing', 'pdfs');

const flyers = [
  { html: 'levelup-rewards-flyer.html', pdf: 'LevelUp-Rewards-Flyer.pdf' },
  { html: 'levelup-teachers-flyer.html', pdf: 'LevelUp-Teachers-Flyer.pdf' },
  { html: 'levelup-principals-flyer.html', pdf: 'LevelUp-Principals-Flyer.pdf' },
  { html: 'levelup-funding-flyer.html', pdf: 'LevelUp-Funding-Flyer.pdf' },
];

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const flyer of flyers) {
    const inputHtmlPath = path.resolve(repoRoot, 'public', 'marketing', flyer.html);
    const outputPdfPath = path.resolve(outputDir, flyer.pdf);
    const publicPdfPath = path.resolve(publicPdfDir, flyer.pdf);

    await page.goto(pathToFileURL(inputHtmlPath).toString(), { waitUntil: 'networkidle' });
    await page.emulateMedia({ media: 'print' });

    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
    });

    await fs.writeFile(outputPdfPath, pdfBuffer);
    await fs.writeFile(publicPdfPath, pdfBuffer);

    // eslint-disable-next-line no-console
    console.log(`Generated PDF: ${outputPdfPath}`);
    console.log(`Generated PDF: ${publicPdfPath}`);
  }

  await browser.close();
}

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(publicPdfDir, { recursive: true });
await main();

