'use client';

import { useCallback, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { captureKioskSnapshotBlob } from '@/lib/kiosk/captureKioskSnapshot';
import { getOrCreateKioskDeviceId } from '@/lib/kiosk/kioskDeviceId';
import {
  SCHOOL_SCREENS_REQUEST_FIELD,
  STUDENT_PORTAL_PREVIEW_DEVICE_ID,
  type SchoolScreenSurface,
} from '@/lib/kiosk/kioskScreenTypes';

const STARTUP_DELAY_MS = 12_000;
const MIN_UPLOAD_GAP_MS = 45_000;

type ReporterOptions = {
  schoolId: string | null | undefined;
  surface: SchoolScreenSurface;
  enabled?: boolean;
  deviceId?: string;
  kioskProfileId?: string | null;
  profileName?: string | null;
  studentId?: string | null;
  studentName?: string | null;
  /** When true, only the first successful upload runs until a developer request (student portal preview slot). */
  firstCaptureOnly?: boolean;
};

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function useSchoolSurfaceSnapshotReporter({
  schoolId,
  surface,
  enabled = true,
  deviceId: deviceIdProp,
  kioskProfileId,
  profileName,
  studentId,
  studentName,
  firstCaptureOnly = false,
}: ReporterOptions) {
  const { firestore, auth } = useFirebase();
  const lastUploadedAtRef = useRef(0);
  const lastRequestSeenRef = useRef(0);
  const initialUploadDoneRef = useRef(false);
  const uploadingRef = useRef(false);

  const deviceId =
    deviceIdProp
    ?? (surface === 'studentPortal' ? STUDENT_PORTAL_PREVIEW_DEVICE_ID : getOrCreateKioskDeviceId());

  const uploadSnapshot = useCallback(
    async (options?: { force?: boolean }) => {
      const sid = schoolId?.trim().toLowerCase();
      if (!sid || !enabled || uploadingRef.current) return;
      const user = auth.currentUser;
      if (!user) return;

      const now = Date.now();
      if (!options?.force) {
        if (firstCaptureOnly && initialUploadDoneRef.current) return;
        if (now - lastUploadedAtRef.current < MIN_UPLOAD_GAP_MS) return;
      }

      uploadingRef.current = true;
      try {
        const blob = await captureKioskSnapshotBlob();
        if (!blob || blob.size < 1024) return;

        const token = await user.getIdToken();
        const imageBase64 = await blobToBase64(blob);
        const res = await fetch('/api/kiosk/snapshot', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            schoolId: sid,
            deviceId,
            surface,
            imageBase64,
            forceRefresh: options?.force === true,
            kioskProfileId: kioskProfileId ?? null,
            profileName: profileName ?? null,
            studentId: studentId ?? null,
            studentName: studentName ?? null,
            pathname: typeof window !== 'undefined' ? window.location.pathname : '',
          }),
        });
        if (!res.ok) return;
        lastUploadedAtRef.current = Date.now();
        initialUploadDoneRef.current = true;
      } catch {
        // Best effort — page keeps running if snapshot upload fails.
      } finally {
        uploadingRef.current = false;
      }
    },
    [
      auth,
      deviceId,
      enabled,
      firstCaptureOnly,
      kioskProfileId,
      profileName,
      schoolId,
      studentId,
      studentName,
      surface,
    ],
  );

  useEffect(() => {
    const sid = schoolId?.trim().toLowerCase();
    if (!sid || !enabled || !firestore) return;

    const schoolRef = doc(firestore, 'schools', sid);
    const unsub = onSnapshot(
      schoolRef,
      (snap) => {
        const requestedAt = snap.data()?.[SCHOOL_SCREENS_REQUEST_FIELD];
        if (typeof requestedAt !== 'number' || requestedAt <= lastRequestSeenRef.current) return;
        lastRequestSeenRef.current = requestedAt;
        void uploadSnapshot({ force: true });
      },
      () => {},
    );

    return () => unsub();
  }, [enabled, firestore, schoolId, uploadSnapshot]);

  useEffect(() => {
    const sid = schoolId?.trim().toLowerCase();
    if (!sid || !enabled) return;

    const timer = window.setTimeout(() => {
      void uploadSnapshot();
    }, STARTUP_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [enabled, schoolId, uploadSnapshot]);
}

/** @deprecated Use {@link useSchoolSurfaceSnapshotReporter}. */
export function useKioskSnapshotReporter(
  options: Omit<ReporterOptions, 'surface'> & { surface?: never },
) {
  useSchoolSurfaceSnapshotReporter({ ...options, surface: 'kiosk' });
}
