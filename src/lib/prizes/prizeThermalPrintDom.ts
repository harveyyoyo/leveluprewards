/** DOM helpers for 80mm thermal prize print — Tailwind `min-h-screen` on html/body/app root wins over many @media print rules. */

export function thermalPrizePrintRootElements(): HTMLElement[] {
  if (typeof document === 'undefined') return [];
  return [
    document.documentElement,
    document.body,
    document.querySelector<HTMLElement>('[data-app-view-root]'),
  ].filter((n): n is HTMLElement => n instanceof HTMLElement);
}

export function applyThermalPrizePrintRootLocks(): void {
  for (const el of thermalPrizePrintRootElements()) {
    el.style.setProperty('min-height', '0', 'important');
    el.style.setProperty('height', 'auto', 'important');
  }
}

export function clearThermalPrizePrintRootLocks(): void {
  for (const el of thermalPrizePrintRootElements()) {
    el.style.removeProperty('min-height');
    el.style.removeProperty('height');
  }
}
