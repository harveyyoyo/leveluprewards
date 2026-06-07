#!/usr/bin/env node
/**
 * Static flyers hub for local viewing without Next.js dev.
 * Generated: public/marketing/index.html — open via `npx serve public` → /marketing/
 *
 * Usage: node scripts/generate-flyers-gallery.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outPath = path.join(repoRoot, 'public', 'marketing', 'index.html');

const BEST_FLYER_PICKS = [
  {
    key: 'general',
    label: 'General',
    flyerId: 'levelup-rewards-premium',
    note: 'Most complete all-purpose overview for first-touch conversations.',
  },
  {
    key: 'principal',
    label: 'Principal',
    flyerId: 'levelup-principals',
    note: 'Best leadership brief for decision-makers, compliance, and rollout readiness.',
  },
  {
    key: 'pillar-rewards',
    label: 'Pillar: Rewards Core',
    flyerId: 'feature-rewards-shop',
    note: 'Strongest one-pager for point economy and redemption workflows.',
  },
  {
    key: 'pillar-classroom',
    label: 'Pillar: Classroom Management',
    flyerId: 'levelup-teachers',
    note: 'Most actionable classroom implementation guide for teacher adoption.',
  },
  {
    key: 'pillar-attendance',
    label: 'Pillar: Attendance',
    flyerId: 'feature-attendance',
    note: 'Best focused summary of periods, sign-in, and reward rules.',
  },
  {
    key: 'pillar-library',
    label: 'Pillar: Library',
    flyerId: 'feature-library',
    note: 'Best dedicated flyer for checkout, due dates, and library incentives.',
  },
  {
    key: 'pillar-homework',
    label: 'Pillar: Homework',
    flyerId: 'feature-student-portal',
    note: 'Closest current fit for homework-at-home routines (until a dedicated homework flyer is added).',
  },
  {
    key: 'pillar-office',
    label: 'Pillar: School Office',
    flyerId: 'principal-data',
    note: 'Closest current fit for office-facing operations and admin reporting.',
  },
];

const BORDER_COLORS = {
  'border-fuchsia-500/30': 'rgba(217, 70, 239, 0.3)',
  'border-fuchsia-500/40': 'rgba(217, 70, 239, 0.4)',
  'border-fuchsia-500/50': 'rgba(217, 70, 239, 0.5)',
  'border-indigo-300/50': 'rgba(165, 180, 252, 0.5)',
  'border-indigo-400/40': 'rgba(129, 140, 248, 0.4)',
  'border-slate-400/40': 'rgba(148, 163, 184, 0.4)',
  'border-sky-500/30': 'rgba(14, 165, 233, 0.3)',
  'border-sky-500/40': 'rgba(14, 165, 233, 0.4)',
  'border-sky-600/50': 'rgba(2, 132, 199, 0.5)',
  'border-sky-300/40': 'rgba(125, 211, 252, 0.4)',
  'border-orange-400/40': 'rgba(251, 146, 60, 0.4)',
  'border-lime-400/40': 'rgba(163, 230, 53, 0.4)',
  'border-white/25': 'rgba(255, 255, 255, 0.25)',
  'border-teal-400/40': 'rgba(45, 212, 191, 0.4)',
  'border-teal-600/50': 'rgba(13, 148, 136, 0.5)',
  'border-violet-500/40': 'rgba(139, 92, 246, 0.4)',
  'border-blue-500/40': 'rgba(59, 130, 246, 0.4)',
  'border-blue-400/40': 'rgba(96, 165, 250, 0.4)',
  'border-blue-800/50': 'rgba(30, 64, 175, 0.5)',
  'border-amber-400/40': 'rgba(251, 191, 36, 0.4)',
  'border-amber-300/40': 'rgba(252, 211, 77, 0.4)',
  'border-amber-500/35': 'rgba(245, 158, 11, 0.35)',
  'border-amber-500/40': 'rgba(245, 158, 11, 0.4)',
  'border-amber-600/40': 'rgba(217, 119, 6, 0.4)',
  'border-amber-700/50': 'rgba(180, 83, 9, 0.5)',
  'border-yellow-500/35': 'rgba(234, 179, 8, 0.35)',
  'border-yellow-500/40': 'rgba(234, 179, 8, 0.4)',
  'border-cyan-500/40': 'rgba(6, 182, 212, 0.4)',
  'border-cyan-400/40': 'rgba(34, 211, 238, 0.4)',
  'border-emerald-500/40': 'rgba(16, 185, 129, 0.4)',
  'border-emerald-500/45': 'rgba(16, 185, 129, 0.45)',
  'border-emerald-600/40': 'rgba(5, 150, 105, 0.4)',
  'border-emerald-600/45': 'rgba(5, 150, 105, 0.45)',
  'border-rose-600/40': 'rgba(225, 29, 72, 0.4)',
  'border-slate-500/50': 'rgba(100, 116, 139, 0.5)',
  'border-slate-600/50': 'rgba(71, 85, 105, 0.5)',
  'border-zinc-500/50': 'rgba(113, 113, 122, 0.5)',
  'border-green-500/35': 'rgba(34, 197, 94, 0.35)',
  'border-pink-500/40': 'rgba(236, 72, 153, 0.4)',
};

function loadCatalog() {
  const runner = `
    import { PROMOTION_FLYERS, FLYER_AUDIENCE_LABELS, FLYER_AUDIENCE_ORDER } from '../src/lib/marketingPromotions.ts';
    import { CLASSIC_FLYER_FILES } from '../src/lib/classicFlyerManifest.ts';
    console.log(JSON.stringify({
      flyers: PROMOTION_FLYERS,
      audienceLabels: FLYER_AUDIENCE_LABELS,
      audienceOrder: FLYER_AUDIENCE_ORDER,
      classicFiles: CLASSIC_FLYER_FILES,
      bestPicks: ${JSON.stringify(BEST_FLYER_PICKS)},
    }));
  `;
  const tmp = path.join(repoRoot, 'scripts', '.flyers-gallery-data.mjs');
  fs.writeFileSync(tmp, runner, 'utf8');
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', tmp],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  fs.unlinkSync(tmp);
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    throw new Error('Failed to load flyer catalog from TypeScript sources');
  }
  return JSON.parse(result.stdout.trim());
}

function borderColor(token) {
  return BORDER_COLORS[token] ?? 'rgba(255, 255, 255, 0.12)';
}

function renderHtml(catalog) {
  const dataJson = JSON.stringify(catalog).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Flyers — levelUp EDU (local)</title>
    <meta
      name="description"
      content="Printable flyers for LevelUp school rewards — preview, open, and print. Static local gallery."
    />
    <style>
      :root {
        color-scheme: dark;
        --bg: #070814;
        --text: #f1f5f9;
        --muted: #94a3b8;
        --card: rgba(255, 255, 255, 0.02);
        --card-hover: rgba(255, 255, 255, 0.04);
        --border: rgba(255, 255, 255, 0.08);
        --accent-a: #c026d3;
        --accent-b: #06b6d4;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        background: var(--bg);
        color: var(--text);
        line-height: 1.5;
      }
      .bg-glow {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        background:
          radial-gradient(circle at 50% -20%, rgba(120, 119, 198, 0.22), transparent 50%),
          radial-gradient(circle at 90% 20%, rgba(217, 70, 239, 0.1), transparent 45%),
          radial-gradient(circle at 10% 80%, rgba(6, 182, 212, 0.1), transparent 45%);
      }
      .wrap { position: relative; z-index: 1; max-width: 72rem; margin: 0 auto; padding: 2rem 1.5rem 5rem; }
      .hero { text-align: center; margin-bottom: 2rem; }
      .badge {
        display: inline-flex; align-items: center; gap: 0.5rem;
        border: 1px solid rgba(6, 182, 212, 0.3); background: rgba(6, 182, 212, 0.1);
        color: #67e8f9; border-radius: 999px; padding: 0.35rem 1rem;
        font-size: 0.68rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;
      }
      h1 { margin: 1.25rem 0 0; font-size: clamp(2rem, 5vw, 3rem); font-weight: 800; letter-spacing: -0.03em; }
      .lead { margin: 1rem auto 0; max-width: 42rem; color: var(--muted); font-size: 1.05rem; }
      .lead strong { color: #e2e8f0; font-weight: 600; }
      .theme-toggle { margin-top: 2rem; text-align: center; }
      .theme-toggle p { margin: 0 0 0.75rem; color: var(--muted); font-size: 0.875rem; font-weight: 600; }
      .theme-buttons {
        display: inline-flex; gap: 0.25rem; padding: 0.25rem;
        border-radius: 1rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(2,6,23,0.6);
      }
      .theme-buttons button {
        border: 0; border-radius: 0.75rem; padding: 0.5rem 1rem;
        font-size: 0.875rem; font-weight: 700; cursor: pointer; background: transparent; color: var(--muted);
      }
      .theme-buttons button[aria-pressed="true"] {
        color: white;
        background: linear-gradient(90deg, var(--accent-a), var(--accent-b));
        box-shadow: 0 10px 25px rgba(192, 38, 211, 0.25);
      }
      .theme-note { margin: 0.75rem auto 0; max-width: 32rem; font-size: 0.75rem; color: #64748b; }
      .sections { margin-top: 3.5rem; display: grid; gap: 4rem; }
      .section-head { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: 0.5rem; margin-bottom: 1.5rem; }
      .section-head h2 { margin: 0; font-size: clamp(1.5rem, 3vw, 1.875rem); font-weight: 800; }
      .section-head p { margin: 0; color: #64748b; font-size: 0.875rem; }
      .grid { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
      .best-of {
        border-radius: 1.5rem; border: 1px solid rgba(6, 182, 212, 0.2);
        background: rgba(6, 182, 212, 0.04); padding: 1.5rem;
      }
      .best-of > p { margin: 0.5rem 0 0; max-width: 48rem; color: rgba(203, 213, 225, 0.9); font-size: 0.875rem; }
      .best-grid { margin-top: 1.5rem; display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
      .best-wrap { border-radius: 1.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(2,6,23,0.4); overflow: hidden; }
      .best-wrap .pick-label {
        padding: 0.75rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.1);
        font-size: 0.68rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #67e8f9;
      }
      .best-wrap .pick-note { margin: 0.25rem 0 0; font-size: 0.75rem; color: var(--muted); text-transform: none; letter-spacing: normal; font-weight: 400; }
      .card {
        display: flex; flex-direction: column; overflow: hidden;
        border-radius: 1.5rem; border: 1px solid var(--card-border, var(--border));
        background: var(--card); transition: background 0.2s;
      }
      .card:hover { background: var(--card-hover); }
      .card.dim { opacity: 0.4; }
      .snap {
        display: block; position: relative; overflow: hidden;
        border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(15,23,42,0.8);
        text-decoration: none; color: inherit;
      }
      .snap-inner {
        position: relative; margin: 0 auto; overflow: hidden;
        display: flex; align-items: flex-start; justify-content: center; padding: 0.75rem 0;
      }
      .snap-frame {
        position: relative; overflow: hidden; border-radius: 2px;
        box-shadow: 0 25px 50px rgba(0,0,0,0.45); outline: 1px solid rgba(255,255,255,0.1);
      }
      .snap iframe {
        position: absolute; left: 0; top: 0; border: 0; background: white; pointer-events: none;
      }
      .snap-tag {
        position: absolute; right: 0.75rem; top: 0.75rem; z-index: 2;
        border-radius: 999px; border: 1px solid rgba(255,255,255,0.2);
        background: rgba(0,0,0,0.5); padding: 0.25rem 0.625rem;
        font-size: 0.625rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
      }
      .snap-hover {
        position: absolute; inset: 0; z-index: 1; display: flex; align-items: center; justify-content: center;
        background: rgba(0,0,0,0); opacity: 0; transition: opacity 0.2s, background 0.2s;
      }
      .snap:hover .snap-hover { opacity: 1; background: rgba(0,0,0,0.25); }
      .snap-hover span {
        border-radius: 999px; border: 1px solid rgba(255,255,255,0.2);
        background: rgba(0,0,0,0.6); padding: 0.5rem 1rem; font-size: 0.75rem; font-weight: 700;
      }
      .card-body { padding: 1.25rem; display: flex; flex-direction: column; flex: 1; }
      .card-title-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
      .card-title { margin: 0; font-size: 1.125rem; font-weight: 800; }
      .pill {
        border-radius: 999px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04);
        padding: 0.125rem 0.5rem; font-size: 0.625rem; font-weight: 700; letter-spacing: 0.05em;
        text-transform: uppercase; color: var(--muted);
      }
      .card-desc { margin: 0.375rem 0 0; flex: 1; font-size: 0.875rem; color: var(--muted); }
      .warn { margin-top: 0.5rem; font-size: 0.75rem; color: rgba(253, 230, 138, 0.8); }
      .tags { margin-top: 0.75rem; display: flex; flex-wrap: wrap; gap: 0.5rem; }
      .tag {
        border-radius: 999px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03);
        padding: 0.125rem 0.625rem; font-size: 0.625rem; font-weight: 700; letter-spacing: 0.05em;
        text-transform: uppercase; color: var(--muted);
      }
      .card-actions { margin-top: 1rem; }
      .btn {
        display: inline-flex; align-items: center; gap: 0.375rem;
        border-radius: 0.75rem; padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 700;
        text-decoration: none; border: 0; cursor: pointer;
      }
      .btn-primary { color: white; background: linear-gradient(90deg, var(--accent-a), var(--accent-b)); }
      .btn-disabled { color: white; background: #334155; opacity: 0.5; cursor: not-allowed; }
      .footer { margin-top: 4rem; text-align: center; color: #64748b; font-size: 0.75rem; }
      code { color: #94a3b8; }
    </style>
  </head>
  <body>
    <div class="bg-glow" aria-hidden="true"></div>
    <div class="wrap">
      <header class="hero">
        <div class="badge">Printable flyers · local</div>
        <h1>Choose your flyer style</h1>
        <p class="lead">
          School rewards that students love — pick <strong>Bold Navy</strong> or
          <strong>Original styles</strong>, then open a preview and use
          <strong>Ctrl+P</strong> (Letter, backgrounds on) to save as PDF or print.
        </p>
        <div class="theme-toggle" role="group" aria-label="Flyer visual style">
          <p>Visual style</p>
          <div class="theme-buttons">
            <button type="button" data-theme="bold" aria-pressed="true">Bold Navy</button>
            <button type="button" data-theme="classic" aria-pressed="false">Original styles</button>
          </div>
          <p class="theme-note" id="theme-note"></p>
        </div>
      </header>
      <div class="sections" id="gallery"></div>
      <p class="footer">
        Static gallery — regenerate with <code>npm run generate:flyers-gallery</code>.
        Serve locally: <code>npx serve public -p 3456</code> → <code>/marketing/</code>
      </p>
    </div>
    <script id="flyers-data" type="application/json">${dataJson}</script>
    <script>
      const FLYER_WIDTH = 816;
      const FLYER_HEIGHT = 1056;
      const SCALE = 0.26;
      const scaledW = Math.round(FLYER_WIDTH * SCALE);
      const scaledH = Math.round(FLYER_HEIGHT * SCALE);
      const BORDER_COLORS = ${JSON.stringify(BORDER_COLORS)};

      const catalog = JSON.parse(document.getElementById('flyers-data').textContent);
      const flyersById = Object.fromEntries(catalog.flyers.map((f) => [f.id, f]));
      let theme = 'bold';

      function hasClassic(href) {
        const name = href.replace(/^\\/marketing\\//, '').replace(/^\\/marketing\\/classic\\//, '');
        return catalog.classicFiles.includes(name);
      }

      function resolveHref(flyer) {
        if (theme === 'classic' && hasClassic(flyer.href)) {
          const name = flyer.href.replace(/^\\/marketing\\//, '');
          return '/marketing/classic/' + name;
        }
        return flyer.href;
      }

      function borderColor(token) {
        return BORDER_COLORS[token] || 'rgba(255, 255, 255, 0.12)';
      }

      function renderPreview(flyer, href) {
        const embedSrc = href + (href.includes('?') ? '&' : '?') + 'embed=1';
        const tag = theme === 'classic' && hasClassic(flyer.href) ? 'Classic' : flyer.preview.tag;
        return (
          '<a class="snap" href="' + href + '" target="_blank" rel="noopener noreferrer" aria-label="Open ' + flyer.name + ' flyer">' +
            '<div class="snap-inner" style="height:' + (scaledH + 24) + 'px">' +
              '<div class="snap-frame" style="width:' + scaledW + 'px;height:' + scaledH + 'px">' +
                '<iframe src="' + embedSrc + '" title="' + flyer.name + ' preview" loading="lazy" tabindex="-1" ' +
                  'style="width:' + FLYER_WIDTH + 'px;height:' + FLYER_HEIGHT + 'px;transform:scale(' + SCALE + ');transform-origin:top left"></iframe>' +
              '</div>' +
              '<span class="snap-tag">' + tag + '</span>' +
              '<span class="snap-hover"><span>Click to open full flyer</span></span>' +
            '</div>' +
          '</a>'
        );
      }

      function renderCard(flyer) {
        const href = resolveHref(flyer);
        const classicOnly = theme === 'classic';
        const hasClassicLayout = hasClassic(flyer.href);
        const dim = classicOnly && !hasClassicLayout;
        const themeLabel = classicOnly && hasClassicLayout ? 'Original styles' : 'Bold Navy';

        let actions;
        if (classicOnly && !hasClassicLayout) {
          actions = '<span class="btn btn-disabled">Not available in original style</span>';
        } else {
          actions = '<a class="btn btn-primary" href="' + href + '" target="_blank" rel="noopener noreferrer">Open &amp; print ↗</a>';
        }

        const warn = classicOnly && !hasClassicLayout
          ? '<p class="warn">Original layout not archived — Bold Navy only.</p>'
          : '';

        const tags = flyer.tags.map((t) => '<span class="tag">' + t + '</span>').join('');

        return (
          '<article class="card' + (dim ? ' dim' : '') + '" style="--card-border:' + borderColor(flyer.preview.border) + '">' +
            renderPreview(flyer, href) +
            '<div class="card-body">' +
              '<div class="card-title-row">' +
                '<h3 class="card-title">' + flyer.name + '</h3>' +
                '<span class="pill">' + themeLabel + '</span>' +
              '</div>' +
              '<p class="card-desc">' + flyer.description + '</p>' +
              warn +
              '<div class="tags">' + tags + '</div>' +
              '<div class="card-actions">' + actions + '</div>' +
            '</div>' +
          '</article>'
        );
      }

      function flyersForAudience(audience) {
        const all = catalog.flyers.filter((f) => f.audience === audience);
        if (theme === 'classic') return all.filter((f) => hasClassic(f.href));
        return all;
      }

      function classicCount() {
        return catalog.flyers.filter((f) => hasClassic(f.href)).length;
      }

      function updateThemeNote() {
        const note = document.getElementById('theme-note');
        if (theme === 'classic') {
          note.textContent = classicCount() + ' flyers use their earlier distinct layouts (neon, scholastic, quest board, etc.). Newer topics are Bold Navy until an original is added.';
        } else {
          note.textContent = 'Unified navy layout with sky accents — regenerated from npm run generate:bold-flyers.';
        }
      }

      function renderGallery() {
        const root = document.getElementById('gallery');
        const parts = [];

        const picks = catalog.bestPicks
          .map((pick) => ({ ...pick, flyer: flyersById[pick.flyerId] }))
          .filter((pick) => pick.flyer);

        if (picks.length) {
          parts.push(
            '<section class="best-of" aria-labelledby="flyers-best-of">' +
              '<h2 id="flyers-best-of">Best of flyers</h2>' +
              '<p>Curated picks for general outreach, principals, and each product pillar.</p>' +
              '<div class="best-grid">' +
                picks.map((pick) =>
                  '<div class="best-wrap">' +
                    '<div class="pick-label">' + pick.label +
                      '<p class="pick-note">' + pick.note + '</p>' +
                    '</div>' +
                    renderCard(pick.flyer) +
                  '</div>'
                ).join('') +
              '</div>' +
            '</section>'
          );
        }

        for (const audience of catalog.audienceOrder) {
          const flyers = flyersForAudience(audience);
          if (!flyers.length) continue;
          parts.push(
            '<section aria-labelledby="flyers-' + audience + '">' +
              '<div class="section-head">' +
                '<h2 id="flyers-' + audience + '">' + catalog.audienceLabels[audience] + '</h2>' +
                '<p>' + flyers.length + ' layout' + (flyers.length === 1 ? '' : 's') + '</p>' +
              '</div>' +
              '<div class="grid">' + flyers.map(renderCard).join('') + '</div>' +
            '</section>'
          );
        }

        root.innerHTML = parts.join('');
        updateThemeNote();
      }

      document.querySelectorAll('[data-theme]').forEach((btn) => {
        btn.addEventListener('click', () => {
          theme = btn.getAttribute('data-theme');
          document.querySelectorAll('[data-theme]').forEach((b) => {
            b.setAttribute('aria-pressed', b.getAttribute('data-theme') === theme ? 'true' : 'false');
          });
          renderGallery();
        });
      });

      renderGallery();
    </script>
  </body>
</html>
`;
}

function main() {
  const catalog = loadCatalog();
  const html = renderHtml(catalog);
  fs.writeFileSync(outPath, html, 'utf8');
  console.log('Wrote', outPath);
  console.log('Open: http://localhost:3456/marketing/ (with npx serve public -p 3456)');
}

main();
