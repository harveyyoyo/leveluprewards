const SELECTABLE_ROW_INTERACTIVE_SELECTOR =
  'button,input,select,textarea,a,[role="button"],[role="combobox"],[role="checkbox"]';

/** Ignore row-toggle clicks that originate from embedded controls. */
export function shouldIgnoreSelectableRowClick(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return true;
  return !!target.closest(SELECTABLE_ROW_INTERACTIVE_SELECTOR);
}

export function handleSelectableRowClick(
  event: { target: EventTarget | null },
  toggle: () => void,
): void {
  if (shouldIgnoreSelectableRowClick(event.target)) return;
  toggle();
}
