import { describe, expect, it } from 'vitest';
import {
  applyHouseWizardSettings,
  buildHouseHallOfFameHref,
  isHouseStudentPointsRollupEnabled,
  resolveHousePointsSource,
} from './housePointsSettings';

describe('housePointsSettings', () => {
  it('defaults to student rollup when unset', () => {
    expect(resolveHousePointsSource({ housesRollupPoints: true })).toBe('studentRollup');
    expect(resolveHousePointsSource({ housesRollupPoints: false })).toBe('manual');
  });

  it('prefers explicit housePointsSource', () => {
    expect(
      resolveHousePointsSource({ housePointsSource: 'manual', housesRollupPoints: true }),
    ).toBe('manual');
  });

  it('rollup enabled only for studentRollup with houses on', () => {
    expect(
      isHouseStudentPointsRollupEnabled({
        enableHouses: true,
        housePointsSource: 'studentRollup',
        housesRollupPoints: true,
      }),
    ).toBe(true);
    expect(
      isHouseStudentPointsRollupEnabled({
        enableHouses: true,
        housePointsSource: 'manual',
        housesRollupPoints: false,
      }),
    ).toBe(false);
  });

  it('applyHouseWizardSettings enables houses and rollup', () => {
    const patch: Record<string, unknown> = {};
    applyHouseWizardSettings(
      {
        themeId: 'quick',
        pointsSource: 'studentRollup',
        assignMode: 'balanced',
        syncTotalsFromStudents: true,
        showHouseOnKiosk: true,
        hallOfFameSortBy: 'lifetimePoints',
        hallOfFamePodiumSize: 3,
      },
      (p) => Object.assign(patch, p),
    );
    expect(patch.enableHouses).toBe(true);
    expect(patch.housePointsSource).toBe('studentRollup');
    expect(patch.housesRollupPoints).toBe(true);
    expect(patch.houseHallOfFameSortBy).toBe('lifetimePoints');
  });

  it('builds house hall of fame URL with house settings', () => {
    const href = buildHouseHallOfFameHref('demo-school', {
      houseHallOfFameSortBy: 'points',
      houseHallOfFameLimit: 12,
      houseHallOfFamePodiumSize: 3,
      houseHallOfFameAutoScroll: true,
      houseHallOfFameGridLayout: false,
    });
    expect(href).toContain('/demo-school/hall-of-fame?');
    expect(href).toContain('fullscreen=1');
    expect(href).toContain('rankType=houses');
  });
});
