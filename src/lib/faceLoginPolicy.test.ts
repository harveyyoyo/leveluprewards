import { describe, expect, it } from 'vitest';
import {
  applyFaceLoginPolicy,
  faceLoginBlockMessage,
  isFaceLoginBlockedForSchool,
  isFaceLoginRestrictedState,
  resolveSchoolState,
} from './faceLoginPolicy';
import { normalizeUsState } from './usStates';

describe('faceLoginPolicy', () => {
  it('normalizes state names and abbreviations', () => {
    expect(normalizeUsState('il')).toBe('IL');
    expect(normalizeUsState('New York')).toBe('NY');
    expect(normalizeUsState('  tx ')).toBe('TX');
    expect(normalizeUsState('n/a')).toBe('');
  });

  it('locks Face in problem states', () => {
    expect(isFaceLoginRestrictedState('IL')).toBe(true);
    expect(isFaceLoginRestrictedState('Texas')).toBe(true);
    expect(isFaceLoginRestrictedState('WA')).toBe(true);
    expect(isFaceLoginRestrictedState('ny')).toBe(true);
    expect(isFaceLoginRestrictedState('OH')).toBe(false);
    expect(isFaceLoginRestrictedState('')).toBe(false);
  });

  it('uses the school state first, then a ZIP only as backup', () => {
    expect(resolveSchoolState({ schoolState: 'OH', smartScreenLocationZip: '60601' })).toMatchObject({
      blocked: false,
      stateCode: 'OH',
      source: 'state',
    });
    expect(resolveSchoolState({ schoolState: '', smartScreenLocationZip: '60601' })).toMatchObject({
      blocked: true,
      stateCode: 'IL',
      source: 'zip',
    });
    expect(resolveSchoolState({ schoolState: '', smartScreenLocationZip: '10001' }).stateCode).toBe('NY');
    expect(resolveSchoolState({ schoolState: '', smartScreenLocationZip: '75201' }).stateCode).toBe('TX');
    expect(resolveSchoolState({ schoolState: '', smartScreenLocationZip: '98101' }).stateCode).toBe('WA');
    expect(resolveSchoolState({ schoolState: '', smartScreenLocationZip: '43085' }).blocked).toBe(false);
  });

  it('turns Face off but leaves other sign-in methods alone', () => {
    const next = applyFaceLoginPolicy({
      schoolState: 'IL',
      enableFaceLogin: true,
      kioskLoginTabFaceEnabled: true,
      kioskLoginTabScanEnabled: true,
      kioskProfiles: {
        lobby: {
          settings: { kioskLoginTabFaceEnabled: true, enableFaceLogin: true },
        },
      },
    });
    expect(next.enableFaceLogin).toBe(false);
    expect(next.kioskLoginTabFaceEnabled).toBe(false);
    expect(next.kioskLoginTabScanEnabled).toBe(true);
    expect(next.kioskProfiles?.lobby.settings?.kioskLoginTabFaceEnabled).toBe(false);
    expect(isFaceLoginBlockedForSchool(next)).toBe(true);
    expect(faceLoginBlockMessage(resolveSchoolState(next))).toContain('Illinois');
  });

  it('does not change Face when the school is not in a problem state', () => {
    const next = applyFaceLoginPolicy({
      schoolState: 'OH',
      enableFaceLogin: true,
      kioskLoginTabFaceEnabled: true,
    });
    expect(next.enableFaceLogin).toBe(true);
    expect(next.kioskLoginTabFaceEnabled).toBe(true);
  });
});
