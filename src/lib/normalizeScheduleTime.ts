/** Normalize schedule times to HH:mm (24h). Accepts "8:30", "08:30", "8:30 AM", etc. */

export function normalizeTimeToHHMM(raw: string): string | null {
  const s = (raw || '').trim();
  if (!s) return null;

  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = Number(m24[1]);
    const m = Number(m24[2]);
    if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (m12) {
    let h = Number(m12[1]);
    const m = Number(m12[2]);
    const ap = String(m12[3]).toLowerCase();
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    if (ap === 'pm' && h !== 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  return null;
}
