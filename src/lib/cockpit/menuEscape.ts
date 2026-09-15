/**
 * Escape on an open menu must close the menu, not the Copilot dock.
 *
 * `keybinds.ts` listens on `window`. Radix dismisses the menu on the same
 * key; without stopping the event, both run and the dock closes too.
 */
export function stopMenuEscapeFromClosingDock(event: {
  stopPropagation: () => void
}): void {
  event.stopPropagation()
}
