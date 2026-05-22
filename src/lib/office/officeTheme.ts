/** Browser-default root size (non-office pages). */
export const OFFICE_ROOT_FONT_PX = 16;

/** Left navigation rem baseline — Tailwind `rem` units resolve against this on `html`. */
export const OFFICE_SIDEBAR_FONT_PX = 18;

/** Target body size for the right-hand workspace (applied via zoom, see OFFICE_MAIN_ZOOM). */
export const OFFICE_MAIN_FONT_PX = 14;

/** Scales the main pane so rem-based Tailwind type/spacing shrink vs the sidebar. */
export const OFFICE_MAIN_ZOOM = OFFICE_MAIN_FONT_PX / OFFICE_SIDEBAR_FONT_PX;

export const OFFICE_PORTAL_DATA_ATTR = 'office-portal';
export const OFFICE_SIDEBAR_PANE_CLASS = 'office-sidebar-pane';
export const OFFICE_MAIN_PANE_CLASS = 'office-main-pane';

export function applyOfficeRootScale(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute(OFFICE_PORTAL_DATA_ATTR, 'true');
  root.style.fontSize = `${OFFICE_SIDEBAR_FONT_PX}px`;
  root.style.setProperty('--office-sidebar-font-size', `${OFFICE_SIDEBAR_FONT_PX}px`);
  root.style.setProperty('--office-main-font-size', `${OFFICE_MAIN_FONT_PX}px`);
  root.style.setProperty('--office-main-zoom', String(OFFICE_MAIN_ZOOM));
  root.dataset.officePortal = '';
  root.dataset.hideGlobalHeader = '';
}

export function clearOfficeRootScale(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.removeAttribute(OFFICE_PORTAL_DATA_ATTR);
  root.style.fontSize = '';
  root.style.removeProperty('--office-sidebar-font-size');
  root.style.removeProperty('--office-main-font-size');
  root.style.removeProperty('--office-main-zoom');
  delete root.dataset.officePortal;
  delete root.dataset.hideGlobalHeader;
}
