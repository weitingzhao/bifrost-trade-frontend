/**
 * One shell popover at a time (design Rev .68 §1).
 *
 * The top bar's popovers — Objective, Book, the Control Center, Alerts — the
 * user centre at the foot of the sidebar, and the omnibar are one family: a
 * macOS menu bar, where opening one closes whichever was up. Clicking another
 * item switches straight to it; there is no "close first".
 *
 * Each popover keeps its own Radix root (outside click and Esc still come
 * from there); what it gives up is owning its `open` — that is this store's
 * single id, so opening one is closing the rest, programmatic opens included.
 */
import { useCallback } from 'react'
import { createExternalStore } from '@/lib/cockpit/externalStore'
import { omnibar, omnibarStore } from '@/lib/omnibar'

export type ShellPopoverId = 'objective' | 'book' | 'control' | 'alerts' | 'user'

const store = createExternalStore<{ open: ShellPopoverId | null }>({ open: null })

// The omnibar is the sixth member: it opening puts the popover down.
omnibarStore.subscribe(() => {
  if (omnibarStore.getState().open && store.getState().open != null) store.setState({ open: null })
})

/** `[open, setOpen]` for one member of the family. */
export function useShellPopover(id: ShellPopoverId): [boolean, (open: boolean) => void] {
  const open = store.useStore().open === id
  const setOpen = useCallback(
    (next: boolean) => {
      if (next) {
        store.setState({ open: id })
        if (omnibarStore.getState().open) omnibar.close()
      } else {
        store.setState((s) => (s.open === id ? { open: null } : s))
      }
    },
    [id],
  )
  return [open, setOpen]
}

/** For tests: which member is open. */
export function openShellPopover(): ShellPopoverId | null {
  return store.getState().open
}
