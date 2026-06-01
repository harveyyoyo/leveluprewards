/** Format elapsed milliseconds as m:ss for bathroom pass timers. */
export function formatBathroomElapsed(elapsedMs: number): string {
  const totalSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export function isBathroomOverLimit(elapsedMs: number, maxMinutes: number): boolean {
  if (!Number.isFinite(maxMinutes) || maxMinutes <= 0) return false;
  return elapsedMs > maxMinutes * 60 * 1000;
}
