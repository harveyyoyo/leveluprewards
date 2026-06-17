export const SSS_SIDEBAR_FONT_PX = 18;
export const SSS_MAIN_FONT_PX = 14;
export const SSS_MAIN_ZOOM = SSS_MAIN_FONT_PX / SSS_SIDEBAR_FONT_PX;

export const SSS_PORTAL_DATA_ATTR = 'sss-portal';
export const SSS_SIDEBAR_PANE_CLASS = 'sss-sidebar-pane';
export const SSS_MAIN_PANE_CLASS = 'sss-main-pane';
export const SSS_CONTENT_PANE_CLASS = 'sss-content-pane';
export const SSS_LAYOUT_PANE_CLASS = 'sss-layout-pane';

export function applySssRootScale(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute(SSS_PORTAL_DATA_ATTR, 'true');
  root.style.fontSize = `${SSS_SIDEBAR_FONT_PX}px`;
  root.style.setProperty('--sss-main-zoom', String(SSS_MAIN_ZOOM));
  root.dataset.sssPortal = '';
  root.dataset.hideGlobalHeader = '';
}

export function clearSssRootScale(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.removeAttribute(SSS_PORTAL_DATA_ATTR);
  root.style.fontSize = '';
  root.style.removeProperty('--sss-main-zoom');
  delete root.dataset.sssPortal;
  delete root.dataset.hideGlobalHeader;
}
