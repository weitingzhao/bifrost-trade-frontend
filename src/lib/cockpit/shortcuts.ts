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
export const KEY_SETTINGS = ','

export interface Shortcut {
  /** As the reader would press it. */
  keys: string
  /** A short name for the row, as Settings lists it (design `Settings.dc.html`). */
  name: string
  what: string
  /** Where it fires — `Anywhere`, or the page that registers it. */
  scope: string
}

export const SHORTCUTS: readonly Shortcut[] = [
  { keys: '⌘K', name: 'Omnibar', what: 'Open the Omnibar — symbols, pages, commands', scope: 'Anywhere' },
  { keys: '⌘J', name: 'Ask Copilot', what: 'Toggle the Copilot conversation in the side panel', scope: 'Anywhere' },
  { keys: '⌘B', name: 'Toggle sidebar', what: 'Toggle the sidebar — the choice persists across pages', scope: 'Anywhere' },
  // Corrected 2026-09-22, building Settings: this said "close the Copilot",
  // which stopped being true when §5a.8 made the side panel the companion
  // that stays. Esc closes the topmost inspector, then the open float; the
  // panel answers to neither, by design.
  {
    keys: 'Esc',
    name: 'Close',
    what: 'Close the top inspector, else the open float — never while you are typing',
    scope: 'Anywhere',
  },
  // Rev .69 §2: the panel's tabs, Settings, and the menu bar by arrows.
  { keys: '⌥W', name: 'Close tab', what: 'Close the panel’s current tab — the toast offers Undo', scope: 'Anywhere the panel is open' },
  { keys: '⌥[ / ⌥]', name: 'Switch tab', what: 'Previous / next tab in the panel', scope: 'Anywhere the panel is open' },
  { keys: '⌘,', name: 'Settings', what: 'Open Settings', scope: 'Anywhere' },
  { keys: '← / →', name: 'Menu bar', what: 'Walk the top bar’s items; ↑ ↓ ← → walk the controls inside an open popover', scope: 'Top bar' },
  { keys: 'Right-click', name: 'Symbol menu', what: 'On a symbol or contract: open beside, locked tab, Symbol page, Watch, Copy. On a panel tab: page, float, close, close others', scope: 'Anywhere' },
  // Rev .70–.71.
  { keys: 'Space', name: 'Quick Look', what: 'On a row that names a symbol or contract: its Symbol face in a card — ↑ ↓ next row, ↵ open, Space or Esc close', scope: 'Anywhere a row names one' },
  { keys: 'hold ⌘', name: 'Shortcut sheet', what: 'Hold ⌘ (or Ctrl) for a moment: every shortcut, until you let go', scope: 'Anywhere' },
  { keys: 'Drag', name: 'Drag a symbol', what: 'Drop it on Open, Compare or Add to Watch; drag a panel tab down to float it; drag the float to an edge to tile it', scope: 'Anywhere' },
  {
    keys: 'j / k',
    name: 'Symbol walk',
    what: 'Next / previous name in the Symbol list, in the order it shows them (a page with its own j / k keeps it)',
    scope: 'Anywhere the list is shown',
  },
  // The Omnibar's own prefixes: not keys, but the same question — "what can I
  // type here" — and the only place a reader would look for the answer.
  { keys: '/', name: 'Pages only', what: 'Omnibar: pages only', scope: 'Omnibar' },
  { keys: '>', name: 'Commands only', what: 'Omnibar: commands only', scope: 'Omnibar' },
  { keys: '?', name: 'This list', what: 'Omnibar: this list', scope: 'Omnibar' },
]
