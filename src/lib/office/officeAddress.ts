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
