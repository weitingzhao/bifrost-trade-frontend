/**
 * Which sections of the Positions page are open, remembered.
 *
 * The page had five collapsible blocks whose default state I chose, and one of
 * those choices was wrong: the composition charts were folded away and moved to
 * the end on the reasoning that asset allocation is a monthly question. It is
 * not a monthly question for the person reading this page, and no amount of
 * measuring page height would have revealed that.
 *
 * So the defaults below are a starting point, not a ruling. Whatever gets opened
 * or closed is persisted, and from the second visit onward the page opens the
 * way its reader left it.
 */
import { createPersistedStore } from '@/lib/cockpit/externalStore'
import { STORAGE_KEYS } from '@/constants/storage'

export type PositionsSectionId = 'charts' | 'ladder' | 'capital' | 'coverage' | 'independent'

export type PositionsSectionState = Record<PositionsSectionId, boolean>

/**
 * Charts open because the Owner reads them; the rest closed because each one's
 * collapsed header already states its own answer.
 */
export const DEFAULT_SECTION_STATE: PositionsSectionState = {
  charts: true,
  ladder: false,
  capital: false,
  coverage: false,
  independent: false,
}

const store = createPersistedStore<PositionsSectionState>(
  STORAGE_KEYS.positionsSections,
  DEFAULT_SECTION_STATE,
  (s) => s,
)

/** A stored blob from an older shape must not silently drop a section. */
export function normalizeSectionState(raw: unknown): PositionsSectionState {
  const out = { ...DEFAULT_SECTION_STATE }
  if (raw && typeof raw === 'object') {
    for (const key of Object.keys(DEFAULT_SECTION_STATE) as PositionsSectionId[]) {
      const v = (raw as Record<string, unknown>)[key]
      if (typeof v === 'boolean') out[key] = v
    }
  }
  return out
}

export function usePositionsSections() {
  const state = store.useStore()
  return {
    open: normalizeSectionState(state),
    toggle: (id: PositionsSectionId) =>
      store.setState((prev) => ({ ...normalizeSectionState(prev), [id]: !normalizeSectionState(prev)[id] })),
    openSection: (id: PositionsSectionId) =>
      store.setState((prev) => ({ ...normalizeSectionState(prev), [id]: true })),
  }
}
