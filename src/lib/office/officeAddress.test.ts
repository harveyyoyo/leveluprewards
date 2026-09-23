import { describe, expect, it } from 'vitest';
import { formatPhotonAddress } from '@/lib/office/officeAddress';

describe('formatPhotonAddress', () => {
  it('builds a one-line US address', () => {
    expect(
      formatPhotonAddress({
        housenumber: '12',
        street: 'Oak Street',
        city: 'Springfield',
        state: 'New Jersey',
        postcode: '07081',
        countrycode: 'US',
        country: 'United States',
      }),
    ).toBe('12 Oak Street, Springfield, New Jersey 07081');
  });

  it('adds the country outside the US and skips results that are too vague', () => {
    expect(formatPhotonAddress({ street: 'King St', city: 'Toronto', state: 'Ontario', countrycode: 'CA', country: 'Canada' })).toBe(
      'King St, Toronto, Ontario, Canada',
    );
    expect(formatPhotonAddress({ name: 'Springfield', osm_key: 'place' })).toBeNull();
  });
});
