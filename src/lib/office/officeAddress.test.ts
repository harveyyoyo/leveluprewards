import { describe, expect, it } from 'vitest';
import { formatPhotonAddress, officeAddressMatches } from '@/lib/office/officeAddress';

describe('officeAddressMatches', () => {
  it('finds a state written either way', () => {
    expect(officeAddressMatches('45 Ocean Pkwy, Brooklyn, NY 11218', 'new york')).toBe(true);
    expect(officeAddressMatches('45 Ocean Pkwy, Brooklyn, New York 11218', 'NY')).toBe(true);
    expect(officeAddressMatches('12 Oak St, Springfield, NJ 07081', 'New Jersey')).toBe(true);
    expect(officeAddressMatches('12 Oak St, Springfield, NJ 07081', 'new york')).toBe(false);
  });

  it('reads NYC and New York City as any borough or New York, NY', () => {
    expect(officeAddressMatches('45 Ocean Pkwy, Brooklyn, NY 11218', 'NYC')).toBe(true);
    expect(officeAddressMatches('10 W 42nd St, New York, NY 10036', 'nyc')).toBe(true);
    expect(officeAddressMatches('1 Main St, Queens, New York 11101', 'New York City')).toBe(true);
    expect(officeAddressMatches('12 Oak St, Springfield, NJ 07081', 'NYC')).toBe(false);
    expect(officeAddressMatches('5 Queens Rd, Charlotte, NC 28204', 'NYC')).toBe(false);
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
