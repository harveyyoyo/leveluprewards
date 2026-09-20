/** Empty grid slots stay invisible while teaching; arrange mode keeps drop targets visible. */
export function shouldHideEmptyDeskSlot(input: {
  hasStudent: boolean;
  editMode: boolean;
  hideEmptyDesks?: boolean;
}): boolean {
  if (input.hasStudent) return false;
  return !!input.hideEmptyDesks || !input.editMode;
}
