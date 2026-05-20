import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const inputHtmlPath = path.resolve(repoRoot, 'flyers', 'levelup-rewards-flyer.html');
const outputDir = path.resolve(repoRoot, 'flyers', 'dist');
const outputPngPath1 = path.resolve(outputDir, 'page1.png');
const outputPngPath2 = path.resolve(outputDir, 'page2.png');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set viewport to approximate letter aspect ratio
  await page.setViewportSize({ width: 850, height: 1100 });
  await page.goto(pathToFileURL(inputHtmlPath).toString(), { waitUntil: 'networkidle' });

  // Take screenshot of the first page (section 1)
  const sections = await page.$$('section.page');
  if (sections.length >= 1) {
    await sections[0].screenshot({ path: outputPngPath1 });
    console.log(`Saved page 1 screenshot to ${outputPngPath1}`);
  }
  
  if (sections.length >= 2) {
    await sections[1].screenshot({ path: outputPngPath2 });
    console.log(`Saved page 2 screenshot to ${outputPngPath2}`);
  }

  await browser.close();
}

await fs.mkdir(outputDir, { recursive: true });
await main();
