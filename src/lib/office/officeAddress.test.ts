import { describe, expect, it } from 'vitest';
import { formatPhotonAddress, officeAddressMatches } from '@/lib/office/officeAddress';

describe('officeAddressMatches', () => {
  it('finds a state written either way', () => {
    expect(officeAddressMatches('45 Ocean Pkwy, Brooklyn, NY 11218', 'new york')).toBe(true);
    expect(officeAddressMatches('45 Ocean Pkwy, Brooklyn, New York 11218', 'NY')).toBe(true);
    expect(officeAddressMatches('12 Oak St, Springfield, NJ 07081', 'New Jersey')).toBe(true);
    expect(officeAddressMatches('12 Oak St, Springfield, NJ 07081', 'new york')).toBe(false);
  });

  it('matches towns and partial words, but a state code only as its own word', () => {
    expect(officeAddressMatches('45 Ocean Pkwy, Brooklyn, NY 11218', 'brooklyn')).toBe(true);
    expect(officeAddressMatches('45 Ocean Pkwy, Brooklyn, NY 11218', 'Brook')).toBe(true);
    expect(officeAddressMatches('9 Main St, Sunnyside, WA 98944', 'ny')).toBe(false);
    expect(officeAddressMatches('', 'brooklyn')).toBe(false);
    expect(officeAddressMatches(null, '')).toBe(true);
  });
});

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
