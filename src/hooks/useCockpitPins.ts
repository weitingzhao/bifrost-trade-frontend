/**
 * Thin hook over cockpit pin store (Wave RS-E1.2).
 */
import { useCockpitPinStore, type DiscoveryHitRef } from '@/store/cockpitPinStore'

export type { DiscoveryHitRef }

export function useCockpitPins() {
  const store = useCockpitPinStore()
  return {
    symbols: store.symbols,
    hypothesisIds: store.hypothesisIds,
    hits: store.hits,
    focusedHypothesisId: store.focusedHypothesisId,
    pinSymbol: store.pinSymbol,
    unpinSymbol: store.unpinSymbol,
    pinHypothesis: store.pinHypothesis,
    unpinHypothesis: store.unpinHypothesis,
    pinHit: store.pinHit,
    unpinHit: store.unpinHit,
    setFocusedHypothesis: store.setFocusedHypothesis,
    clear: store.clear,
    isSymbolPinned: store.isSymbolPinned,
    isHypothesisPinned: store.isHypothesisPinned,
  }
}
