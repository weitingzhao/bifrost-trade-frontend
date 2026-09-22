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
/** Owned by `@bifrost/ui`'s sidebar, listed here so the help is complete. */
export const KEY_SIDEBAR = 'b'

export interface Shortcut {
  /** As the reader would press it. */
  keys: string
  what: string
  /** Where it fires — `Anywhere`, or the page that registers it. */
  scope: string
}

export const SHORTCUTS: readonly Shortcut[] = [
  { keys: '⌘K', what: 'Open the Omnibar — symbols, pages, commands', scope: 'Anywhere' },
  { keys: '⌘J', what: 'Toggle the Copilot conversation in the side panel', scope: 'Anywhere' },
  { keys: '⌘B', what: 'Toggle the sidebar — the choice persists across pages', scope: 'Anywhere' },
  // Corrected 2026-09-22, building Settings: this said "close the Copilot",
  // which stopped being true when §5a.8 made the side panel the companion
  // that stays. Esc closes the topmost inspector, then the open float; the
  // panel answers to neither, by design.
  {
    keys: 'Esc',
    what: 'Close the top inspector, else the open float — never while you are typing',
    scope: 'Anywhere',
  },
  { keys: 'j / k', what: 'Next / previous symbol on the list you arrived from', scope: 'Symbol' },
  // The Omnibar's own prefixes: not keys, but the same question — "what can I
  // type here" — and the only place a reader would look for the answer.
  { keys: '/', what: 'Omnibar: pages only', scope: 'Omnibar' },
  { keys: '>', what: 'Omnibar: commands only', scope: 'Omnibar' },
  { keys: '?', what: 'Omnibar: this list', scope: 'Omnibar' },
]
