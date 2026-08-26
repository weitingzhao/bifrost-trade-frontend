/**
 * Cockpit pinboard store (Wave RS-E1.2).
 * Persists to localStorage `bifrost.cockpit.pins.v1`. Max 24 per kind (LRU).
 */
import { createPersistedStore } from '@/lib/cockpit/externalStore'

export type DiscoveryHitRef = {
  kind: 'sepa' | 'event' | 'iv' | 'sentiment'
  symbol: string
  ts: string
  detail: Record<string, unknown>
  originPage: string
}

const MAX_PINS = 24
const STORAGE_KEY = 'bifrost.cockpit.pins.v1'

function lruPush<T>(list: T[], item: T, keyOf: (x: T) => string): T[] {
  const key = keyOf(item)
  const without = list.filter((x) => keyOf(x) !== key)
  return [item, ...without].slice(0, MAX_PINS)
}

function hitKey(h: DiscoveryHitRef): string {
  return `${h.kind}:${h.symbol}:${h.originPage}:${h.ts}`
}

type PinState = {
  symbols: string[]
  hypothesisIds: string[]
  hits: DiscoveryHitRef[]
  focusedHypothesisId: string | null
}

type PinActions = {
  pinSymbol: (symbol: string) => void
  unpinSymbol: (symbol: string) => void
  pinHypothesis: (id: string) => void
  unpinHypothesis: (id: string) => void
  pinHit: (hit: DiscoveryHitRef) => void
  unpinHit: (hit: DiscoveryHitRef) => void
  setFocusedHypothesis: (id: string | null) => void
  clear: () => void
  isSymbolPinned: (symbol: string) => boolean
  isHypothesisPinned: (id: string) => boolean
}

export type CockpitPinStore = PinState & PinActions

const initial: PinState = {
  symbols: [],
  hypothesisIds: [],
  hits: [],
  focusedHypothesisId: null,
}

const base = createPersistedStore<CockpitPinStore>(
  STORAGE_KEY,
  {
    ...initial,
    pinSymbol: () => undefined,
    unpinSymbol: () => undefined,
    pinHypothesis: () => undefined,
    unpinHypothesis: () => undefined,
    pinHit: () => undefined,
    unpinHit: () => undefined,
    setFocusedHypothesis: () => undefined,
    clear: () => undefined,
    isSymbolPinned: () => false,
    isHypothesisPinned: () => false,
  },
  (s) => ({
    symbols: s.symbols,
    hypothesisIds: s.hypothesisIds,
    hits: s.hits,
    focusedHypothesisId: s.focusedHypothesisId,
  }),
)

function wireActions() {
  const set = base.setState
  const get = base.getState

  set({
    pinSymbol(symbol) {
      const sym = symbol.trim().toUpperCase()
      if (!sym) return
      set({ symbols: lruPush(get().symbols, sym, (s) => s) })
    },
    unpinSymbol(symbol) {
      const sym = symbol.trim().toUpperCase()
      set({ symbols: get().symbols.filter((s) => s !== sym) })
    },
    pinHypothesis(id) {
      if (!id) return
      set({
        hypothesisIds: lruPush(get().hypothesisIds, id, (x) => x),
        focusedHypothesisId: id,
      })
    },
    unpinHypothesis(id) {
      const next = get().hypothesisIds.filter((x) => x !== id)
      set({
        hypothesisIds: next,
        focusedHypothesisId: get().focusedHypothesisId === id ? (next[0] ?? null) : get().focusedHypothesisId,
      })
    },
    pinHit(hit) {
      set({ hits: lruPush(get().hits, hit, hitKey) })
    },
    unpinHit(hit) {
      const k = hitKey(hit)
      set({ hits: get().hits.filter((h) => hitKey(h) !== k) })
    },
    setFocusedHypothesis(id) {
      set({ focusedHypothesisId: id })
    },
    clear() {
      set({ ...initial })
    },
    isSymbolPinned(symbol) {
      return get().symbols.includes(symbol.trim().toUpperCase())
    },
    isHypothesisPinned(id) {
      return get().hypothesisIds.includes(id)
    },
  })
}

wireActions()

export const cockpitPinStore = {
  getState: base.getState,
  setState: base.setState,
  subscribe: base.subscribe,
}

export function useCockpitPinStore() {
  return base.useStore()
}
