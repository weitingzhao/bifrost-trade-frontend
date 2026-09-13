/**
 * Every keyboard shortcut the app registers, in one table.
 *
 * `Docs Gaps.dc.html` B7: the shortcuts existed and were written down nowhere
 * a reader could reach — the Omnibar answers `?` from this now.
 *
 * The global three are here and `keybinds.ts` reads its keys from the same
 * constants, so a rename cannot leave the help describing a key that no longer
 * fires. The page-scoped ones name their page: a help list that offers `j`
 * everywhere would be wrong four pages out of five.
 */
export const KEY_OMNIBAR = 'k'
export const KEY_COPILOT = 'j'

export interface Shortcut {
  /** As the reader would press it. */
  keys: string
  what: string
  /** Where it fires — `Anywhere`, or the page that registers it. */
  scope: string
}

export const SHORTCUTS: readonly Shortcut[] = [
  { keys: '⌘K', what: 'Open the Omnibar — symbols, pages, commands', scope: 'Anywhere' },
  { keys: '⌘J', what: 'Toggle the Research Copilot', scope: 'Anywhere' },
  { keys: 'Esc', what: 'Close the Copilot, unless you are typing', scope: 'Anywhere' },
  { keys: 'j / k', what: 'Next / previous symbol on the list you arrived from', scope: 'Symbol' },
  // The Omnibar's own prefixes: not keys, but the same question — "what can I
  // type here" — and the only place a reader would look for the answer.
  { keys: '/', what: 'Omnibar: pages only', scope: 'Omnibar' },
  { keys: '>', what: 'Omnibar: commands only', scope: 'Omnibar' },
  { keys: '?', what: 'Omnibar: this list', scope: 'Omnibar' },
]
