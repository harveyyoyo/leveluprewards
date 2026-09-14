import { normalizeUsState, usStateName, type UsStateCode } from '@/lib/usStates';

/**
 * Product safety list: Face sign-in (saving a face map) is locked in these
 * states. This is not legal advice. A school lawyer should confirm the list.
 *
 * Why these four:
 * - Illinois: biometric identifier law (face geometry)
 * - Texas: biometric identifier capture law
 * - Washington: biometric identifier / face-scan limits
 * - New York: school biometric identifying technology limits
 */
export const FACE_LOGIN_RESTRICTED_STATES = ['IL', 'NY', 'TX', 'WA'] as const;

export type FaceLoginRestrictedState = (typeof FACE_LOGIN_RESTRICTED_STATES)[number];

export type FaceLoginLocationInput = {
  schoolState?: string | null;
  smartScreenLocationZip?: string | null;
};

export type FaceLoginBlockReason = {
  blocked: boolean;
  stateCode: UsStateCode | '';
  stateName: string;
  source: 'state' | 'zip' | null;
};

type FaceLoginSettings = FaceLoginLocationInput & {
  enableFaceLogin?: boolean;
  kioskLoginTabFaceEnabled?: boolean;
  kioskProfiles?: Record<
    string,
    {
      settings?: {
        enableFaceLogin?: boolean;
        kioskLoginTabFaceEnabled?: boolean;
      };
    }
  >;
};

const RESTRICTED = new Set<string>(FACE_LOGIN_RESTRICTED_STATES);

/** Conservative ZIP3 ranges used only when the school has not picked a state. */
function stateFromUsZip(zip: string | null | undefined): UsStateCode | '' {
  const digits = String(zip || '').replace(/\D/g, '');
  if (digits.length < 3) return '';
  const zip3 = Number.parseInt(digits.slice(0, 3), 10);
  if (!Number.isFinite(zip3)) return '';
  if (zip3 >= 600 && zip3 <= 629) return 'IL';
  if (zip3 >= 100 && zip3 <= 149) return 'NY';
  if ((zip3 >= 750 && zip3 <= 799) || zip3 === 885) return 'TX';
  if (zip3 >= 980 && zip3 <= 994) return 'WA';
  return '';
}

export function isFaceLoginRestrictedState(code: string | null | undefined): boolean {
  const normalized = normalizeUsState(code);
  return normalized !== '' && RESTRICTED.has(normalized);
}

export function resolveSchoolState(input: FaceLoginLocationInput): FaceLoginBlockReason {
  const fromState = normalizeUsState(input.schoolState);
  if (fromState) {
    return {
      blocked: RESTRICTED.has(fromState),
      stateCode: fromState,
      stateName: usStateName(fromState),
      source: 'state',
    };
  }
  const fromZip = stateFromUsZip(input.smartScreenLocationZip);
  if (fromZip) {
    return {
      blocked: RESTRICTED.has(fromZip),
      stateCode: fromZip,
      stateName: usStateName(fromZip),
      source: 'zip',
    };
  }
  return { blocked: false, stateCode: '', stateName: '', source: null };
}

export function isFaceLoginBlockedForSchool(input: FaceLoginLocationInput): boolean {
  return resolveSchoolState(input).blocked;
}

export function faceLoginBlockMessage(reason: FaceLoginBlockReason): string {
  if (!reason.blocked) return '';
  const place = reason.stateName || 'this state';
  return `Face sign-in is turned off in ${place}. Students can still sign in with a card, typing, or a card scan.`;
}

/** Force Face off in restricted states. Card / type / scan tabs stay as they were. */
export function applyFaceLoginPolicy<T extends FaceLoginSettings>(settings: T): T {
  if (!isFaceLoginBlockedForSchool(settings)) return settings;

  const next: T = {
    ...settings,
    enableFaceLogin: false,
    kioskLoginTabFaceEnabled: false,
  };

  const profiles = next.kioskProfiles;
  if (!profiles) return next;

  let changed = false;
  const cleaned: typeof profiles = {};
  for (const [id, profile] of Object.entries(profiles)) {
    const profileSettings = profile?.settings;
    if (
      profileSettings &&
      (profileSettings.enableFaceLogin === true || profileSettings.kioskLoginTabFaceEnabled === true)
    ) {
      changed = true;
      cleaned[id] = {
        ...profile,
        settings: {
          ...profileSettings,
          enableFaceLogin: false,
          kioskLoginTabFaceEnabled: false,
        },
      };
    } else {
      cleaned[id] = profile;
    }
  }
  if (!changed) return next;
  return { ...next, kioskProfiles: cleaned };
}
