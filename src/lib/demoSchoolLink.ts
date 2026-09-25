import { PUBLIC_SAMPLE_SCHOOL_IDS, type PublicSampleSchoolId } from '@/lib/sampleSchools';

/**
 * Owner-made demo links: `/demo/library?key=…` signs the visitor into a demo school with its
 * public passcode and opens that page, so whoever the owner sends it to never sees the passcode
 * screen. Only the server can make a valid key (see `src/lib/server/demoShareKey.ts`), and only
 * the public sample schools can be opened this way.
 */
export const DEMO_LINK_ROOT = '/demo';

/** Query parameter carrying the owner-made key. Never forwarded to the page itself. */
export const DEMO_LINK_KEY_PARAM = 'key';

/** Demo school a link opens when it does not name one (`/demo/library`). */
export const DEFAULT_DEMO_SCHOOL_ID: PublicSampleSchoolId = 'schoolabc';

/** Pillars that live on an admin tab — same places as the pillar boxes on the staff Welcome tab. */
const PILLAR_ADMIN_TABS = new Map<string, string>([
  ['rewards', 'prizes'],
  ['attendance', 'attendance'],
]);

/**
 * Pages that stop at a staff sign-in for a plain school session. Demo links also sign in as the
 * demo admin for these; the admin passcode on demo schools is the same public one.
 */
const STAFF_PAGES = new Set([
  'admin',
  'office',
  'classroom',
  'classroom-realm',
  'classroom-screen',
  'hall-of-fame',
  'reports',
]);

/** Ready-made links offered in Developer → Schools (pillar order matches the Welcome tab). */
export const DEMO_LINK_PAGES = [
  { page: '', label: 'Portal' },
  { page: 'rewards', label: 'Rewards' },
  { page: 'office', label: 'Office' },
  { page: 'classroom', label: 'Classroom' },
  { page: 'attendance', label: 'Attendance' },
  { page: 'library', label: 'Library' },
] as const;

const PAGE_SEGMENT_RE = /^[a-z0-9_-]{1,64}$/;

export type DemoLinkTarget = {
  schoolId: PublicSampleSchoolId;
  /** Page inside the demo school, e.g. `/schoolabc/library?tab=catalog`. */
  href: string;
  /** The page needs a staff role, so sign in as the demo admin as well. */
  needsAdmin: boolean;
};

function demoSchoolFromSegment(segment: string | undefined): PublicSampleSchoolId | null {
  return (PUBLIC_SAMPLE_SCHOOL_IDS as readonly string[]).includes(segment ?? '')
    ? (segment as PublicSampleSchoolId)
    : null;
}

/**
 * Where a `/demo/…` link lands: `/demo` → School ABC's portal, `/demo/library` → its library,
 * `/demo/yeshiva/library` → the Yeshiva demo's library. The link's query string is kept
 * (`/demo/library?tab=catalog`) except the key. Returns null for anything but plain page names,
 * so a demo link can never open a real school or another site.
 */
export function resolveDemoLinkTarget(pathname: string, search = ''): DemoLinkTarget | null {
  const path = pathname.toLowerCase().replace(/\/+$/, '');
  if (path !== DEMO_LINK_ROOT && !path.startsWith(`${DEMO_LINK_ROOT}/`)) return null;

  const segments = path.slice(DEMO_LINK_ROOT.length).split('/').filter(Boolean);
  const namedSchool = demoSchoolFromSegment(segments[0]);
  if (namedSchool) segments.shift();
  if (!segments.every((segment) => PAGE_SEGMENT_RE.test(segment))) return null;

  const pillarTab = segments.length === 1 ? PILLAR_ADMIN_TABS.get(segments[0]) : undefined;
  const pagePath = pillarTab ? 'admin' : segments.join('/') || 'portal';
  const params = new URLSearchParams(pillarTab ? { tab: pillarTab } : undefined);
  new URLSearchParams(search).forEach((value, key) => {
    if (key !== DEMO_LINK_KEY_PARAM) params.set(key, value);
  });
  const query = params.toString();
  const schoolId = namedSchool ?? DEFAULT_DEMO_SCHOOL_ID;

  return {
    schoolId,
    href: `/${schoolId}/${pagePath}${query ? `?${query}` : ''}`,
    needsAdmin: STAFF_PAGES.has(pagePath.split('/')[0]),
  };
}

/** Owner's shareable link, e.g. `https://leveluprewards.app/demo/library?key=…`. */
export function demoLinkUrl(
  origin: string,
  schoolId: string,
  page: string,
  key: string,
  search = '',
): string {
  const sid = schoolId.trim().toLowerCase();
  const rest = [sid === DEFAULT_DEMO_SCHOOL_ID ? '' : sid, page].filter(Boolean).join('/');
  const params = new URLSearchParams(search);
  params.set(DEMO_LINK_KEY_PARAM, key);
  return `${origin}${DEMO_LINK_ROOT}${rest ? `/${rest}` : ''}?${params}`;
}

/**
 * Link for the demo-school page the owner is looking at (`/schoolabc/library?tab=catalog`).
 * Null off the demo schools, so real schools never get a passcode-free link.
 */
export function demoLinkForSchoolPage(
  origin: string,
  pathname: string,
  search: string,
  keys: Partial<Record<string, string>>,
): string | null {
  const [first, ...page] = pathname.split('/').filter(Boolean);
  const schoolId = demoSchoolFromSegment(first?.toLowerCase());
  const key = schoolId ? keys[schoolId] : undefined;
  if (!schoolId || !key) return null;
  return demoLinkUrl(origin, schoolId, page.join('/'), key, search);
}
