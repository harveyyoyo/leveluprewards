import { existsSync, readFileSync } from 'fs';
import path from 'path';

/** Max source files attached to one staff-help chat turn (keep low for fast mini-model latency). */
export const STAFF_HELP_CODE_MAX_FILES = 3;
/** Per-file excerpt cap (characters). */
export const STAFF_HELP_CODE_MAX_CHARS_PER_FILE = 1400;
/** Total excerpt cap across all files. */
export const STAFF_HELP_CODE_MAX_TOTAL_CHARS = 4500;

const PROJECT_ROOT = process.cwd();

const DENY_PATH_RE =
  /(^|\/)(\.env|\.git|node_modules|\.next|\.firebase|promo-video|e2e|scripts\/backup)(\/|$)|\.(test|spec)\.(ts|tsx|js|jsx)$|serviceAccount|credentials|secret/i;

const ALLOWED_PREFIXES = [
  'src/app/[schoolId]/',
  'src/components/',
  'src/lib/',
  'docs/staff-ai-product-knowledge.md',
];

/** Staff-facing UI/features → source files (relative to repo root). */
const FEATURE_SOURCE_INDEX: { keys: string[]; paths: string[] }[] = [
  {
    keys: ['admin', 'dashboard', 'configuration', 'school settings'],
    paths: ['src/app/[schoolId]/admin/page.tsx'],
  },
  {
    keys: ['student', 'roster', 'enroll', 'nickname', 'id card', 'idcard', 'face'],
    paths: [
      'src/app/[schoolId]/admin/sections/AdminStudentsTab.tsx',
      'src/components/StudentModal.tsx',
    ],
  },
  {
    keys: ['class', 'classes', 'homeroom'],
    paths: ['src/app/[schoolId]/admin/sections/AdminClassesTab.tsx'],
  },
  {
    keys: ['teacher', 'staff account', 'staff accounts', 'librarian', 'secretary', 'prize clerk'],
    paths: [
      'src/app/[schoolId]/admin/sections/AdminTeachersTab.tsx',
      'src/app/[schoolId]/admin/sections/AdminStaffAccountsTab.tsx',
    ],
  },
  {
    keys: ['prize', 'shop', 'reward', 'redeem', 'kiosk'],
    paths: [
      'src/app/[schoolId]/admin/sections/AdminPrizesTab.tsx',
      'src/app/[schoolId]/prize/page.tsx',
      'src/app/[schoolId]/student/page.tsx',
    ],
  },
  {
    keys: ['point', 'points', 'category', 'categories', 'coupon', 'coupons', 'print'],
    paths: [
      'src/app/[schoolId]/admin/sections/AdminCategoriesTab.tsx',
      'src/app/[schoolId]/admin/sections/AdminCouponsTab.tsx',
      'src/app/[schoolId]/teacher/page.tsx',
    ],
  },
  {
    keys: ['report', 'reports', 'export', 'csv'],
    paths: [
      'src/app/[schoolId]/admin/sections/AdminReportsTab.tsx',
      'src/app/[schoolId]/reports/page.tsx',
    ],
  },
  {
    keys: ['attendance', 'sign-in', 'sign in', 'check in', 'timezone'],
    paths: ['src/app/[schoolId]/admin/sections/AdminAttendanceTab.tsx'],
  },
  {
    keys: ['library', 'book', 'checkout', 'barcode', 'upc'],
    paths: [
      'src/app/[schoolId]/admin/sections/AdminLibraryTab.tsx',
      'src/app/[schoolId]/librarian/page.tsx',
      'src/app/[schoolId]/library/self-checkout/page.tsx',
    ],
  },
  {
    keys: ['notification', 'notifications', 'email', 'sms', 'whatsapp', 'alert', 'parent'],
    paths: [
      'src/app/[schoolId]/admin/sections/AdminNotificationsTab.tsx',
      'src/app/[schoolId]/admin/sections/NotificationSetupWizard.tsx',
    ],
  },
  {
    keys: ['branding', 'logo', 'theme', 'banner', 'sponsor', 'photo'],
    paths: ['src/app/[schoolId]/admin/sections/AdminBrandingTab.tsx'],
  },
  {
    keys: ['hall of fame', 'halloffame', 'leaderboard', 'podium'],
    paths: [
      'src/app/[schoolId]/admin/sections/AdminHallOfFameTab.tsx',
      'src/app/[schoolId]/hall-of-fame/page.tsx',
    ],
  },
  {
    keys: ['house', 'houses', 'sorting', 'house parent'],
    paths: [
      'src/app/[schoolId]/admin/sections/AdminHousesTab.tsx',
      'src/app/[schoolId]/house-sorting/page.tsx',
    ],
  },
  {
    keys: ['bulletin', 'bulletin board', 'announcement'],
    paths: [
      'src/app/[schoolId]/admin/sections/AdminBulletinBoardTab.tsx',
      'src/app/[schoolId]/bulletin-board/page.tsx',
    ],
  },
  {
    keys: ['badge', 'badges', 'achievement', 'bonus', 'milestone', 'goal', 'goals'],
    paths: [
      'src/app/[schoolId]/admin/sections/AdminBadgesTab.tsx',
      'src/app/[schoolId]/admin/sections/AdminBonusPointsTab.tsx',
      'src/app/[schoolId]/admin/sections/AdminGoalsTab.tsx',
    ],
  },
  {
    keys: ['raffle', 'lottery', 'drawing'],
    paths: ['src/app/[schoolId]/admin/sections/AdminRaffleTab.tsx'],
  },
  {
    keys: ['integration', 'integrations', 'sis', 'import', 'export roster'],
    paths: ['src/app/[schoolId]/admin/sections/AdminIntegrationsTab.tsx'],
  },
  {
    keys: ['portal', 'hub', 'sign in', 'login', 'passcode', 'staff chooser'],
    paths: ['src/app/[schoolId]/portal/page.tsx'],
  },
  {
    keys: ['office', 'billing', 'grade', 'grades', 'report card', 'tuition', 'family'],
    paths: [
      'src/app/[schoolId]/office/page.tsx',
      'src/app/[schoolId]/office/students/page.tsx',
      'src/app/[schoolId]/office/classes/page.tsx',
      'src/app/[schoolId]/office/grades/page.tsx',
      'src/app/[schoolId]/office/billing/page.tsx',
      'src/app/[schoolId]/office/reports/page.tsx',
    ],
  },
  {
    keys: ['setting', 'settings', 'gear', 'theme', 'tooltip', 'walkthrough', 'tour'],
    paths: ['src/components/providers/SettingsProvider.tsx'],
  },
  {
    keys: ['help', 'ai help', 'support'],
    paths: ['src/components/StaffAiHelpButton.tsx'],
  },
  {
    keys: ['insights', 'analytics', 'stats'],
    paths: ['src/app/[schoolId]/admin/sections/AdminStatsTab.tsx'],
  },
  {
    keys: ['student portal', 'student-portal', 'home portal'],
    paths: ['src/app/[schoolId]/admin/sections/AdminStudentPortalTab.tsx', 'src/app/[schoolId]/student-home/page.tsx'],
  },
];

const PATHNAME_ROUTE_FILES: { pattern: RegExp; paths: string[] }[] = [
  { pattern: /\/admin(?:\/|$)/i, paths: ['src/app/[schoolId]/admin/page.tsx'] },
  { pattern: /\/teacher(?:\/|$)/i, paths: ['src/app/[schoolId]/teacher/page.tsx'] },
  { pattern: /\/portal(?:\/|$)/i, paths: ['src/app/[schoolId]/portal/page.tsx'] },
  { pattern: /\/student(?:\/|$)/i, paths: ['src/app/[schoolId]/student/page.tsx'] },
  { pattern: /\/prize(?:\/|$)/i, paths: ['src/app/[schoolId]/prize/page.tsx'] },
  { pattern: /\/hall-of-fame/i, paths: ['src/app/[schoolId]/hall-of-fame/page.tsx'] },
  { pattern: /\/bulletin-board/i, paths: ['src/app/[schoolId]/bulletin-board/page.tsx'] },
  { pattern: /\/house-sorting/i, paths: ['src/app/[schoolId]/house-sorting/page.tsx'] },
  { pattern: /\/office\/students/i, paths: ['src/app/[schoolId]/office/students/page.tsx'] },
  { pattern: /\/office\/classes/i, paths: ['src/app/[schoolId]/office/classes/page.tsx'] },
  { pattern: /\/office\/grades/i, paths: ['src/app/[schoolId]/office/grades/page.tsx'] },
  { pattern: /\/office\/billing/i, paths: ['src/app/[schoolId]/office/billing/page.tsx'] },
  { pattern: /\/office\/reports/i, paths: ['src/app/[schoolId]/office/reports/page.tsx'] },
  { pattern: /\/office(?:\/|$)/i, paths: ['src/app/[schoolId]/office/page.tsx'] },
  { pattern: /\/librarian/i, paths: ['src/app/[schoolId]/librarian/page.tsx'] },
  { pattern: /\/secretary/i, paths: ['src/app/[schoolId]/secretary/page.tsx'] },
  { pattern: /\/prize-clerk/i, paths: ['src/app/[schoolId]/prize-clerk/page.tsx'] },
  { pattern: /\/reports(?:\/|$)/i, paths: ['src/app/[schoolId]/reports/page.tsx'] },
];

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'are',
  'but',
  'not',
  'you',
  'all',
  'can',
  'had',
  'her',
  'was',
  'one',
  'our',
  'out',
  'day',
  'get',
  'has',
  'him',
  'his',
  'how',
  'its',
  'may',
  'new',
  'now',
  'old',
  'see',
  'two',
  'way',
  'who',
  'boy',
  'did',
  'she',
  'use',
  'her',
  'why',
  'let',
  'put',
  'say',
  'too',
  'any',
  'app',
  'tab',
  'page',
  'help',
  'what',
  'when',
  'where',
  'which',
  'with',
  'this',
  'that',
  'from',
  'have',
  'does',
  'into',
  'about',
  'just',
  'like',
  'know',
  'want',
  'need',
  'tell',
  'show',
]);

export function staffHelpCodeContextEnabled(): boolean {
  const raw = process.env.STAFF_HELP_CODE_CONTEXT;
  if (raw === '0' || raw === 'false') return false;
  return true;
}

export function isAllowedStaffHelpSourcePath(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, '/');
  if (DENY_PATH_RE.test(normalized)) return false;
  return ALLOWED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function extractStaffHelpKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  const phrases: string[] = [];
  for (const entry of FEATURE_SOURCE_INDEX) {
    for (const key of entry.keys) {
      if (key.includes(' ') && lower.includes(key)) {
        phrases.push(key);
      }
    }
  }

  const tokens = [
    ...phrases,
    ...(lower.match(/\b[a-z][a-z0-9-]{2,}\b/g) ?? []),
  ].filter((w) => !STOP_WORDS.has(w));

  return [...new Set(tokens)].slice(0, 16);
}

type ScoredPath = { path: string; score: number };

function scoreIndexedPaths(keywords: string[], pathname?: string): ScoredPath[] {
  const scores = new Map<string, number>();

  const bump = (rel: string, amount: number) => {
    if (!isAllowedStaffHelpSourcePath(rel)) return;
    scores.set(rel, (scores.get(rel) ?? 0) + amount);
  };

  if (pathname) {
    for (const route of PATHNAME_ROUTE_FILES) {
      if (route.pattern.test(pathname)) {
        for (const p of route.paths) bump(p, 40);
      }
    }
  }

  const haystack = keywords.join(' ');
  for (const entry of FEATURE_SOURCE_INDEX) {
    let entryScore = 0;
    for (const key of entry.keys) {
      if (haystack.includes(key)) {
        entryScore += key.includes(' ') ? 14 : 8;
      } else {
        for (const kw of keywords) {
          if (key.includes(kw) || kw.includes(key.replace(/\s+/g, ''))) {
            entryScore += 5;
          }
        }
      }
    }
    if (entryScore > 0) {
      for (const p of entry.paths) bump(p, entryScore);
    }
  }

  for (const kw of keywords) {
    for (const entry of FEATURE_SOURCE_INDEX) {
      for (const p of entry.paths) {
        const base = path.basename(p).toLowerCase();
        if (base.includes(kw)) bump(p, 6);
      }
    }
  }

  return [...scores.entries()]
    .map(([p, score]) => ({ path: p, score }))
    .sort((a, b) => b.score - a.score);
}

function readSourceExcerpt(relPath: string, maxChars: number): string | null {
  if (!isAllowedStaffHelpSourcePath(relPath)) return null;
  const abs = path.join(PROJECT_ROOT, relPath);
  if (!existsSync(abs)) return null;
  try {
    const raw = readFileSync(abs, 'utf8');
    const stripped = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .trim();
    if (stripped.length <= maxChars) return stripped;
    return `${stripped.slice(0, maxChars)}\n… [truncated]`;
  } catch {
    return null;
  }
}

export function selectStaffHelpSourcePaths(input: {
  pathname?: string;
  userMessage: string;
}): string[] {
  const keywords = extractStaffHelpKeywords(input.userMessage);
  const ranked = scoreIndexedPaths(keywords, input.pathname);
  const selected: string[] = [];
  for (const { path: rel } of ranked) {
    if (selected.length >= STAFF_HELP_CODE_MAX_FILES) break;
    if (!selected.includes(rel) && existsSync(path.join(PROJECT_ROOT, rel))) {
      selected.push(rel);
    }
  }
  return selected;
}

export function buildStaffHelpCodeContextBlock(input: {
  pathname?: string;
  userMessage: string;
}): { block: string; files: string[] } {
  if (!staffHelpCodeContextEnabled()) {
    return { block: '', files: [] };
  }

  const files = selectStaffHelpSourcePaths(input);
  if (files.length === 0) {
    return { block: '', files: [] };
  }

  const parts: string[] = [];
  let total = 0;

  parts.push(
    '## Repository excerpts (staff-facing UI only)',
    'Use these excerpts to describe where controls live and how workflows work. Do not quote secrets, API keys, or student/staff identifiers from code. If excerpts conflict with the product knowledge doc, prefer the excerpts for UI location and the doc for policy.',
    '',
  );

  for (const rel of files) {
    const remaining = STAFF_HELP_CODE_MAX_TOTAL_CHARS - total;
    if (remaining < 400) break;
    const perFile = Math.min(STAFF_HELP_CODE_MAX_CHARS_PER_FILE, remaining);
    const excerpt = readSourceExcerpt(rel, perFile);
    if (!excerpt) continue;
    const section = `### \`${rel}\`\n\`\`\`tsx\n${excerpt}\n\`\`\``;
    parts.push(section, '');
    total += section.length;
  }

  if (parts.length <= 3) {
    return { block: '', files: [] };
  }

  return { block: parts.join('\n').trim(), files };
}
