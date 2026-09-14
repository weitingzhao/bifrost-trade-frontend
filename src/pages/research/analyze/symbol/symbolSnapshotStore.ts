/**
 * Last exhibit the desk saw for a symbol — the prior half of "Since last snapshot".
 *
 * Research does not yet return a previous band on the exhibit. Until it does,
 * the Symbol page keeps one snapshot per symbol in localStorage and diffs when
 * `as_of` advances. First visit on a clean desk has no prior → no rail.
 */
import { STORAGE_KEYS } from '@/constants/storage'
import type { SymbolExhibitSnapshot } from '@/lib/bandChanges'

type Store = Record<string, SymbolExhibitSnapshot>

function readAll(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.symbolExhibitSnapshot)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Store
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEYS.symbolExhibitSnapshot, JSON.stringify(store))
  } catch {
    // Quota / private mode — the rail simply stays empty.
  }
}

export function loadSymbolSnapshot(symbol: string): SymbolExhibitSnapshot | null {
  const key = symbol.trim().toUpperCase()
  if (!key) return null
  return readAll()[key] ?? null
}

export function saveSymbolSnapshot(symbol: string, snap: SymbolExhibitSnapshot): void {
  const key = symbol.trim().toUpperCase()
  if (!key) return
  const all = readAll()
  all[key] = snap
  writeAll(all)
}
