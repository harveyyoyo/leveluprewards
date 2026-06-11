import { describe, expect, it } from 'vitest';
import {
  getOfficeMarksLabels,
  isOfficeFeatureEnabled,
  officeUsesMarksTerminology,
  resolveOfficeFeatureFlags,
} from './officeTerminology';

describe('officeTerminology', () => {
  it('defaults to grades labels', () => {
    expect(getOfficeMarksLabels(null).section).toBe('Grades');
    expect(officeUsesMarksTerminology(null)).toBe(false);
  });

  it('uses marks labels when enabled', () => {
    expect(getOfficeMarksLabels({ useMarksTerminology: true }).section).toBe('Marks');
    expect(getOfficeMarksLabels({ useMarksTerminology: true }).missing).toBe('missing marks');
  });

  it('resolves feature flags with defaults on', () => {
    expect(resolveOfficeFeatureFlags(null).auditLog).toBe(true);
    expect(isOfficeFeatureEnabled({ features: { aiHelp: false } }, 'aiHelp')).toBe(false);
    expect(isOfficeFeatureEnabled({ features: { aiHelp: false } }, 'auditLog')).toBe(true);
  });
});
