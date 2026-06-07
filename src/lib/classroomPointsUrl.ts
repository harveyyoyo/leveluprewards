export type ClassroomFullscreenAudience = 'teacher' | 'student';

export type ClassroomFullscreenUrlParams = {
  schoolId: string;
  classId?: string;
  /** Matches localStorage seating scope (teacher id or `admin`). */
  scope?: string;
  /** Teacher monitor (default) or read-only class screen without behavior notes. */
  audience?: ClassroomFullscreenAudience;
};

/** Opens the classroom seating chart in a dedicated full-viewport tab. */
export function buildClassroomFullscreenUrl({
  schoolId,
  classId,
  scope,
  audience = 'teacher',
}: ClassroomFullscreenUrlParams): string {
  const params = new URLSearchParams();
  params.set('fullscreen', '1');
  if (classId) params.set('classId', classId);
  if (scope) params.set('scope', scope);
  if (audience === 'student') params.set('audience', 'student');
  const q = params.toString();
  return `/${schoolId}/classroom${q ? `?${q}` : ''}`;
}

export function openClassroomFullscreenTab(params: ClassroomFullscreenUrlParams) {
  if (typeof window === 'undefined') return;
  const url = buildClassroomFullscreenUrl(params);
  const absolute = url.startsWith('http') ? url : `${window.location.origin}${url}`;
  window.open(absolute, '_blank', 'noopener,noreferrer');
}
