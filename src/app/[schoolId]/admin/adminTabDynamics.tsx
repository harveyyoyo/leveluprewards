'use client';

import dynamic from 'next/dynamic';

const tabLoader = () => (
  <div className="animate-pulse h-64 w-full rounded-xl bg-muted/40" aria-hidden="true" />
);

/** After dev HMR or cache mismatch, lazy tab chunks often 404; reload once so import succeeds. */
function importAdminTabSection<M extends Record<string, unknown>, K extends keyof M>(
  importFn: () => Promise<M>,
  exportKey: K,
): () => Promise<M[K]> {
  return () =>
    importFn()
      .then((m) => m[exportKey])
      .catch((err: unknown) => {
        const e = err as { name?: string; message?: string };
        if (
          typeof window !== 'undefined' &&
          (e?.name === 'ChunkLoadError' ||
            /loading chunk|chunk load|failed to fetch dynamically imported module/i.test(String(e?.message || '')))
        ) {
          window.location.reload();
        }
        throw err;
      });
}

export const AdminStatsTab = dynamic(
  importAdminTabSection(() => import('./sections/AdminStatsTab'), 'AdminStatsTab'),
  { loading: tabLoader, ssr: false },
);
export const AdminNotificationsTab = dynamic(
  importAdminTabSection(() => import('./sections/AdminNotificationsTab'), 'AdminNotificationsTab'),
  { loading: tabLoader, ssr: false },
);
export const AdminBrandingTab = dynamic(
  importAdminTabSection(() => import('./sections/AdminBrandingTab'), 'AdminBrandingTab'),
  { loading: tabLoader, ssr: false },
);
export const AdminClassesTab = dynamic(
  importAdminTabSection(() => import('./sections/AdminClassesTab'), 'AdminClassesTab'),
  { loading: tabLoader, ssr: false },
);
export const AdminTeachersTab = dynamic(
  importAdminTabSection(() => import('./sections/AdminTeachersTab'), 'AdminTeachersTab'),
  { loading: tabLoader, ssr: false },
);
export const AdminCategoriesTab = dynamic(
  importAdminTabSection(() => import('./sections/AdminCategoriesTab'), 'AdminCategoriesTab'),
  { loading: tabLoader, ssr: false },
);
export const AdminClassroomTab = dynamic(
  importAdminTabSection(() => import('./sections/AdminClassroomTab'), 'AdminClassroomTab'),
  { loading: tabLoader, ssr: false },
);
export const AdminPrizesTab = dynamic(
  importAdminTabSection(() => import('./sections/AdminPrizesTab'), 'AdminPrizesTab'),
  { loading: tabLoader, ssr: false },
);
export const AdminAttendanceTab = dynamic(
  importAdminTabSection(() => import('./sections/AdminAttendanceTab'), 'AdminAttendanceTab'),
  { loading: tabLoader, ssr: false },
);
export const AdminReportsTab = dynamic(
  importAdminTabSection(() => import('./sections/AdminReportsTab'), 'AdminReportsTab'),
  { loading: tabLoader, ssr: false },
);
export const AdminBonusPointsTab = dynamic(
  importAdminTabSection(() => import('./sections/AdminBonusPointsTab'), 'AdminBonusPointsTab'),
  { loading: tabLoader, ssr: false },
);
export const AdminGoalsTab = dynamic(
  importAdminTabSection(() => import('./sections/AdminGoalsTab'), 'AdminGoalsTab'),
  { loading: tabLoader, ssr: false },
);
export const AdminRaffleTab = dynamic(
  importAdminTabSection(() => import('./sections/AdminRaffleTab'), 'AdminRaffleTab'),
  { loading: tabLoader, ssr: false },
);
export const AdminBadgesTab = dynamic(
  importAdminTabSection(() => import('./sections/AdminBadgesTab'), 'AdminBadgesTab'),
  { loading: tabLoader, ssr: false },
);
export const AdminDisplaysTab = dynamic(
  importAdminTabSection(() => import('./sections/AdminDisplaysTab'), 'AdminDisplaysTab'),
  { loading: tabLoader, ssr: false },
);
export const AdminIntegrationsTab = dynamic(
  importAdminTabSection(() => import('./sections/AdminIntegrationsTab'), 'AdminIntegrationsTab'),
  { loading: tabLoader, ssr: false },
);
export const AdminStudentPortalTab = dynamic(
  importAdminTabSection(() => import('./sections/AdminStudentPortalTab'), 'AdminStudentPortalTab'),
  { loading: tabLoader, ssr: false },
);
export const AdminHousesTab = dynamic(
  importAdminTabSection(() => import('./sections/AdminHousesTab'), 'AdminHousesTab'),
  { loading: tabLoader, ssr: false },
);
export const AdminRecessTab = dynamic(
  importAdminTabSection(() => import('./sections/AdminRecessTab'), 'AdminRecessTab'),
  { loading: tabLoader, ssr: false },
);