/** Fields returned by the Photon geocoder (OpenStreetMap). */
export type PhotonAddressProps = {
  name?: string;
  housenumber?: string;
  street?: string;
  city?: string;
  district?: string;
  county?: string;
  state?: string;
  postcode?: string;
  countrycode?: string;
  country?: string;
  osm_key?: string;
};

const US_STATES: Record<string, string> = {
  alabama: 'al', alaska: 'ak', arizona: 'az', arkansas: 'ar', california: 'ca', colorado: 'co',
  connecticut: 'ct', delaware: 'de', 'district of columbia': 'dc', florida: 'fl', georgia: 'ga',
  hawaii: 'hi', idaho: 'id', illinois: 'il', indiana: 'in', iowa: 'ia', kansas: 'ks', kentucky: 'ky',
  louisiana: 'la', maine: 'me', maryland: 'md', massachusetts: 'ma', michigan: 'mi', minnesota: 'mn',
  mississippi: 'ms', missouri: 'mo', montana: 'mt', nebraska: 'ne', nevada: 'nv', 'new hampshire': 'nh',
  'new jersey': 'nj', 'new mexico': 'nm', 'new york': 'ny', 'north carolina': 'nc', 'north dakota': 'nd',
  ohio: 'oh', oklahoma: 'ok', oregon: 'or', pennsylvania: 'pa', 'rhode island': 'ri',
  'south carolina': 'sc', 'south dakota': 'sd', tennessee: 'tn', texas: 'tx', utah: 'ut', vermont: 'vt',
  virginia: 'va', washington: 'wa', 'west virginia': 'wv', wisconsin: 'wi', wyoming: 'wy',
};
const STATE_CODES = new Set(Object.values(US_STATES));
// Longest names first so "west virginia" wins over "virginia".
const STATE_NAME_RE = new RegExp(
  `\\b(${Object.keys(US_STATES).sort((a, b) => b.length - a.length).join('|')})\\b`,
  'g',
);

// After normalizing, "New York City" reads "ny city" and "New York, NY" reads "ny ny".
const NYC_SEARCHES = new Set(['nyc', 'ny city']);
const NYC_PLACES = /\b(brooklyn|queens|bronx|staten island|manhattan)\b|\bny ny\b/;

function normalizeAddressText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(STATE_NAME_RE, (name) => US_STATES[name] ?? name);
}

/**
 * Whether a home address matches what someone searched for. A state can be written either way
 * ("NY" finds "New York", "new jersey" finds "NJ"); other words match anywhere ("Brook" finds Brooklyn).
 */
export function officeAddressMatches(address: string | null | undefined, search: string): boolean {
  const want = normalizeAddressText(search);
  if (!want) return true;
  const have = normalizeAddressText(address ?? '');
  if (!have) return false;
  // Addresses never say "NYC": it means a New York borough, or New York, NY.
  if (NYC_SEARCHES.has(want)) return /\bny\b/.test(have) && NYC_PLACES.test(have);
  // A lone state code must be its own word, so "ny" doesn't match "Sunnyside".
  if (STATE_CODES.has(want)) return new RegExp(`\\b${want}\\b`).test(have);
  return have.includes(want);
}

/** "12 Oak Street, Springfield, New Jersey 07081" (+ country outside the US); null when too vague. */
export function formatPhotonAddress(p: PhotonAddressProps): string | null {
  const streetLine = [p.housenumber, p.street].filter(Boolean).join(' ') || (p.osm_key === 'place' ? '' : p.name ?? '');
  const city = p.city ?? p.district ?? p.county;
  const region = [p.state, p.postcode].filter(Boolean).join(' ');
  const parts = [streetLine, city, region].filter((x): x is string => !!x && !!x.trim());
  if (parts.length < 2) return null;
  if (p.countrycode && p.countrycode.toUpperCase() !== 'US' && p.country) parts.push(p.country);
  return parts.join(', ');
}
