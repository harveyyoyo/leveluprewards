export type SchoolScreenSurface = 'kiosk' | 'studentPortal';

export type SchoolScreenRecord = {
  deviceId: string;
  schoolId: string;
  surface?: SchoolScreenSurface;
  snapshotUrl?: string;
  storagePath?: string;
  capturedAt?: number;
  kioskProfileId?: string | null;
  profileName?: string | null;
  studentId?: string | null;
  studentName?: string | null;
  pathname?: string;
  userAgent?: string;
  updatedAt?: number;
};

/** @deprecated Use {@link SchoolScreenRecord}. */
export type KioskScreenRecord = SchoolScreenRecord;

export type KioskProfileSummary = {
  id: string;
  name: string;
};

export const SCHOOL_SCREENS_REQUEST_FIELD = 'schoolScreensRequestAt';

export const STUDENT_PORTAL_PREVIEW_DEVICE_ID = 'student-portal-preview';
