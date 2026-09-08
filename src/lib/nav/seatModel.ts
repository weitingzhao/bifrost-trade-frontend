/**
 * A seat: a persisted posture that decides how one nav group is laid out.
 *
 * Research proved the shape — three ways the Owner uses a domain, one lit at
 * a time, every page still reachable. The machinery is not about Research:
 * it is a small enum, a localStorage key, and a hook. Extracted so a second
 * domain costs a list of seats rather than a copy of this file.
 *
 * Deliberately not a React context: the sidebar, the header and any page can
 * read the seat without threading a provider through the shell, and the store
 * survives a route change because it lives outside the tree.
 */
import { createPersistedStore } from '@/lib/cockpit/externalStore'

export interface SeatModel<S extends string> {
  /** The seats, in the order a rail should show them. */
  readonly seats: readonly S[]
  /** Subscribe from a component. */
  useSeat: () => S
  /** Read once, outside React. */
  getSeat: () => S
  /** Set from a rail, a deep link or a page's call to action. Unknown values are ignored. */
  setSeat: (seat: S) => void
  /** Type guard for URL / storage values, which arrive as unknown strings. */
  isSeat: (v: unknown) => v is S
}

export function createSeatModel<S extends string>(opts: {
  storageKey: string
  seats: readonly S[]
  /** The seat a first-time reader gets. */
  fallback: S
}): SeatModel<S> {
  const { storageKey, seats, fallback } = opts

  function isSeat(v: unknown): v is S {
    return typeof v === 'string' && (seats as readonly string[]).includes(v)
  }

  const store = createPersistedStore<{ seat: S }>(storageKey, { seat: fallback }, (s) => ({
    seat: s.seat,
  }))

  return {
    seats,
    isSeat,
    useSeat: () => {
      // A stored value can outlive the seat it names — a rename, a removed
      // posture. Fall back rather than laying out a group nobody defines.
      const seat = store.useStore().seat
      return isSeat(seat) ? seat : fallback
    },
    getSeat: () => {
      const seat = store.getState().seat
      return isSeat(seat) ? seat : fallback
    },
    setSeat: (seat: S) => {
      if (!isSeat(seat)) return
      store.setState({ seat })
    },
  }
}
