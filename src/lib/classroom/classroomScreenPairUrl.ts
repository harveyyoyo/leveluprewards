import { buildClassroomFullscreenUrl } from '@/lib/classroomPointsUrl';
import { buildClassroomScreenUrl } from '@/lib/classroomScreen';

export type ClassroomPairTarget = 'mirror' | 'live';

export type ClassroomPairUrlInput = {
  schoolId: string;
  classId: string;
  scope?: string;
  target: ClassroomPairTarget;
};

/** Student TV mirror vs teacher live board — leftover pairing, realm URLs. */
export function buildClassroomPairPath({
  schoolId,
  classId,
  scope,
  target,
}: ClassroomPairUrlInput): string {
  if (target === 'mirror') {
    return buildClassroomScreenUrl({ schoolId, classId, scope });
  }
  return buildClassroomFullscreenUrl({
    schoolId,
    classId,
    scope,
    audience: 'teacher',
  });
}

export function classroomPairAbsoluteUrl(path: string, origin = ''): string {
  if (!origin) return path;
  return `${origin}${path}`;
}
