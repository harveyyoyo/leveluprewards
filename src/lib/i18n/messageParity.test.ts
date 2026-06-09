import { describe, expect, it } from 'vitest';
import * as en from './messages/en';
import * as he from './messages/he';

function leafPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
      return leafPaths(child, path);
    }
    return [path];
  });
}

describe('i18n message parity', () => {
  const namespaces = Object.keys(en) as (keyof typeof en)[];

  for (const namespace of namespaces) {
    it(`en/he keys match for ${String(namespace)}`, () => {
      const enPaths = new Set(leafPaths(en[namespace]));
      const hePaths = new Set(leafPaths(he[namespace as keyof typeof he]));
      const missingInHe = [...enPaths].filter((path) => !hePaths.has(path));
      const missingInEn = [...hePaths].filter((path) => !enPaths.has(path));
      expect(missingInHe, `missing in he: ${missingInHe.join(', ')}`).toEqual([]);
      expect(missingInEn, `missing in en: ${missingInEn.join(', ')}`).toEqual([]);
    });
  }
});
