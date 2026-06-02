import { getAuth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import {
  applyClassroomPointsToStudents,
  applyRewardsPointsToStudents,
  type ClassroomPointsMeta,
} from '@/lib/db/classroomPoints';
import { ensureDeveloperSchoolAccess } from '@/lib/classroom/ensureDeveloperSchoolAccess';

export type ClassroomPointsAwardRequest = ClassroomPointsMeta & {
  schoolId: string;
  studentIds: string[];
  signedDelta: number;
  description: string;
  /** When true, update Rewards balances instead of classroom-only points. */
  rewardsMode?: boolean;
  rollupHousePoints?: boolean;
};

export type ClassroomAwardResult = {
  success: boolean;
  message: string;
  count: number;
  /** `api` = server route; `client` = direct Firestore (local dev fallback). */
  via?: 'api' | 'client';
  status?: number;
};

async function awardClassroomPointsViaApi(
  body: ClassroomPointsAwardRequest,
): Promise<ClassroomAwardResult> {
  let idToken: string | undefined;
  try {
    const user = getAuth().currentUser;
    if (user) {
      idToken = await user.getIdToken();
    }
  } catch {
    idToken = undefined;
  }

  const res = await fetch('/api/classroom/award', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      ...body,
      ...(idToken ? { idToken } : {}),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    count?: number;
    error?: string;
  };
  if (!res.ok) {
    return {
      success: false,
      message: typeof data.error === 'string' ? data.error : `Request failed (${res.status})`,
      count: 0,
      status: res.status,
    };
  }
  return {
    success: data.success === true,
    message: typeof data.message === 'string' ? data.message : 'Saved.',
    count: typeof data.count === 'number' ? data.count : 0,
    status: res.status,
    via: 'api',
  };
}

function isWrongAdminKeyMessage(message?: string): boolean {
  const m = (message || '').toLowerCase();
  return (
    m.includes('stance-spectrum') ||
    m.includes('firebase_service_account_key is for project') ||
    m.includes('service account key is for')
  );
}

function shouldTryClientFallback(status?: number, message?: string): boolean {
  if (isWrongAdminKeyMessage(message)) return true;
  if (status === 401 || status === 403 || status === 503) return true;
  const m = (message || '').toLowerCase();
  return (
    m.includes('sign in as school staff') ||
    m.includes('firebase_service_account') ||
    m.includes('could not save classroom') ||
    m.includes('request failed (503)')
  );
}

/**
 * Saves classroom points: server API first, then direct Firestore if the API cannot auth/write (typical local dev).
 */
export async function awardClassroomPoints(
  firestore: Firestore | null,
  body: ClassroomPointsAwardRequest,
): Promise<ClassroomAwardResult> {
  const api = await awardClassroomPointsViaApi(body);
  if (api.success) return api;

  if (firestore && shouldTryClientFallback(api.status, api.message)) {
    try {
      await ensureDeveloperSchoolAccess(body.schoolId);
    } catch (e) {
      const provisionMsg = (e as Error).message || 'Could not provision school admin role.';
      return {
        success: false,
        message: isWrongAdminKeyMessage(api.message)
          ? `${api.message} Fix FIREBASE_SERVICE_ACCOUNT_KEY in .env.local (studio project), or sign in with Google and retry. Provisioning failed: ${provisionMsg}`
          : `${api.message} Also could not provision roles: ${provisionMsg}`,
        count: 0,
        status: api.status,
      };
    }

    const { schoolId, studentIds, signedDelta, description, rewardsMode, rollupHousePoints, ...meta } =
      body;
    const client = rewardsMode
      ? await applyRewardsPointsToStudents(
          firestore,
          schoolId,
          studentIds,
          signedDelta,
          description,
          meta,
          { rollupHousePoints },
        )
      : await applyClassroomPointsToStudents(
          firestore,
          schoolId,
          studentIds,
          signedDelta,
          description,
          meta,
        );
    if (client.success) {
      return { ...client, via: 'client' };
    }
    return {
      success: false,
      message: `${api.message} Also tried browser save: ${client.message}`,
      count: 0,
      status: api.status,
    };
  }

  if (api.status === 403 && !getAuth().currentUser) {
    return {
      ...api,
      message: 'You are not signed in. Open Admin again from the school login page.',
    };
  }

  if (api.status === 503 || api.message.toLowerCase().includes('503')) {
    return {
      ...api,
      message: isWrongAdminKeyMessage(api.message)
        ? api.message
        : 'Server could not write to Firebase. Add FIREBASE_SERVICE_ACCOUNT_KEY for this Firebase project to .env.local (see AGENTS.md), restart npm run dev, and try again.',
    };
  }

  return api;
}
