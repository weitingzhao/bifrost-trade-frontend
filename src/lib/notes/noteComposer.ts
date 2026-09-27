/**
 * The ⌥N composer's switch (design Rev .96/.97: 随手记 — a note from any page,
 * with the page and the carried symbol attached on the way in).
 *
 * A module store rather than context: the top-bar button, the global key and
 * the composer host live in different trees, and the shell already speaks
 * this pattern (`equipSurface`, `dockState`).
 */
import { createExternalStore } from '@/lib/cockpit/externalStore'

const store = createExternalStore<{ open: boolean }>({ open: false })

export function openNoteComposer(): void {
  store.setState({ open: true })
}

export function closeNoteComposer(): void {
  store.setState({ open: false })
}

export function useNoteComposer(): { open: boolean } {
  return store.useStore()
}

/** ⌥N — anywhere, inputs included: the point is a note from wherever you are. */
export function isNoteShortcut(e: KeyboardEvent): boolean {
  return e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.code === 'KeyN'
}
