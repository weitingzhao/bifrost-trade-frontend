import { createContext, useContext } from 'react'

/**
 * Where a docked inspector renders.
 *
 * The inspector is opened by a page — a row click, deep inside the outlet —
 * but a docked panel has to be a sibling of the content, not a child of it,
 * or it cannot take width from it. So `AppLayout` owns an empty slot in the
 * shell's flex row and the page portals into it.
 *
 * `display: contents` on the slot keeps it weightless: with nothing portalled
 * in it occupies no space, and the portalled `<aside>` becomes a flex item of
 * the row itself rather than of a wrapper.
 *
 * Null outside the app shell (tests, Storybook) — the shell then floats, which
 * is what it did everywhere before this existed.
 */
export const InspectorSlotContext = createContext<HTMLElement | null>(null)

export function useInspectorSlot(): HTMLElement | null {
  return useContext(InspectorSlotContext)
}
