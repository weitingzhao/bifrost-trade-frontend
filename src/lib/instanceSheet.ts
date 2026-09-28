/**
 * The instance sheet's switch (design Rev .101, §14.4 "open the instance
 * face"): any page's `#NNN` opens the same record as a right sheet over that
 * page. The list the token came from rides along, so ‹ › and [ ] step its
 * rows; the same token again closes the sheet. The address does not move —
 * the sheet is a look, not a place (Trade › Rules is the place).
 */
import { createExternalStore } from '@/lib/cockpit/externalStore'

export interface InstanceSheetState {
  id: number
  /** The rows the token came from, in their order — at least `[id]`. */
  ids: number[]
  /** Where it was opened, as the sheet names it (`Ledger · instances`). */
  from: string
  /** A second instance held beside the first. */
  compareId: number | null
}

const store = createExternalStore<{ sheet: InstanceSheetState | null }>({ sheet: null })

const uniq = (xs: readonly number[]) => [...new Set(xs.filter((x) => Number.isFinite(x) && x > 0))]

export function openInstanceSheet(id: number, list: readonly number[] = [], from = ''): void {
  store.setState((prev) => {
    if (prev.sheet && prev.sheet.id === id && prev.sheet.compareId == null) return { sheet: null }
    const ids = uniq(list)
    return { sheet: { id, ids: ids.includes(id) ? ids : [id], from, compareId: null } }
  })
}

/** Open without toggling — a deep link lands on the record even when it is already showing. */
export function showInstanceSheet(id: number, list: readonly number[] = [], from = ''): void {
  const ids = uniq(list)
  store.setState({ sheet: { id, ids: ids.includes(id) ? ids : [id], from, compareId: null } })
}

/** Two instances side by side — Rules' ⇄, and Positions' `?instance=&vs=`. */
export function openInstanceCompare(id: number, compareId: number, from = ''): void {
  store.setState({ sheet: { id, ids: [id], from, compareId } })
}

export function closeInstanceSheet(): void {
  store.setState({ sheet: null })
}

export function stepInstanceSheet(dir: -1 | 1): void {
  store.setState((prev) => {
    const sh = prev.sheet
    if (!sh || sh.compareId != null) return prev
    const next = sh.ids[sh.ids.indexOf(sh.id) + dir]
    return next == null ? prev : { sheet: { ...sh, id: next } }
  })
}

/**
 * Drop the rows the book does not hold from what ‹ › step — a page can list
 * an instance number no record answers (an attribution to an id that is not
 * in this environment's book), and stepping onto it opens nothing.
 */
export function pruneInstanceSheet(known: ReadonlySet<number>): void {
  store.setState((prev) => {
    const sh = prev.sheet
    if (!sh) return prev
    const ids = sh.ids.filter((x) => x === sh.id || known.has(x))
    return ids.length === sh.ids.length ? prev : { sheet: { ...sh, ids } }
  })
}

export function useInstanceSheet(): InstanceSheetState | null {
  return store.useStore().sheet
}

export const instanceSheetStore = store
