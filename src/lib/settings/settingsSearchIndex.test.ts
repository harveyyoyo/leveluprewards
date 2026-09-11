import { describe, expect, it } from 'vitest';
import {
  buildSettingsSearchItems,
  filterSettingsSearchItems,
  settingMatchesQuery,
} from './settingsSearchIndex';

const sample = {
  id: 'darkMode',
  label: 'Dark Mode',
  description: 'Use a dark color theme',
  keywords: ['night', 'theme'],
};

describe('settings search', () => {
  it('matches a setting by name, keyword, or id', () => {
    expect(settingMatchesQuery(sample, 'dark')).toBe(true);
    expect(settingMatchesQuery(sample, 'night')).toBe(true);
    expect(settingMatchesQuery(sample, 'darkMode')).toBe(true);
    expect(settingMatchesQuery(sample, 'printer')).toBe(false);
  });

  it('requires every typed word to match', () => {
    expect(settingMatchesQuery(sample, 'dark theme')).toBe(true);
    expect(settingMatchesQuery(sample, 'dark printer')).toBe(false);
  });

  it('filters the catalog and keeps admin-only items out for teachers', () => {
    const t = (key: string) => key;
    const teacherItems = buildSettingsSearchItems({
      t,
      canManageSchoolSettings: false,
      showDevice: false,
    });
    const adminItems = buildSettingsSearchItems({
      t,
      canManageSchoolSettings: true,
      showDevice: true,
    });

    expect(teacherItems.some((item) => item.id === 'hub-pillars')).toBe(false);
    expect(adminItems.some((item) => item.id === 'hub-pillars')).toBe(true);
    expect(filterSettingsSearchItems(adminItems, 'vending').map((item) => item.id)).toContain(
      'enableVendingMachine',
    );
  });
});
