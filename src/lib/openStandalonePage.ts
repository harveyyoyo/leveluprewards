/** Leave the staff portal with a full page load so Next.js cannot bounce back to the tab. */
export function openStandalonePage(href: string, event?: { preventDefault(): void }): void {
  event?.preventDefault();
  if (typeof window === 'undefined' || !href) return;
  window.location.assign(href);
}
