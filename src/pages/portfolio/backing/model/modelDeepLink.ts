/**
 * The `?symbol=` deep link into the model band. The page scope's symbol is a
 * substring filter (typing "NV" narrows the book to NVDA), but the table's
 * expanded row is an exact key — so the filter has to be resolved against the
 * entries the model actually returned before it can open one.
 */
import type { UnderlyingEntry } from '@/types/modelAnalysis'

/**
 * Exact (case-insensitive) match wins; otherwise the one entry the filter is
 * a substring of; zero or two-plus candidates is nothing to open.
 */
export function resolveModelSymbol(
  entries: readonly Pick<UnderlyingEntry, 'symbol'>[],
  filterSymbol: string,
): string | null {
  const needle = filterSymbol.trim().toUpperCase()
  if (!needle) return null
  const exact = entries.find((e) => e.symbol.toUpperCase() === needle)
  if (exact) return exact.symbol
  const partial = entries.filter((e) => e.symbol.toUpperCase().includes(needle))
  return partial.length === 1 ? partial[0].symbol : null
}

/**
 * What the reader has clicked, remembered together with the deep link it was
 * clicked under. A choice made under one deep link says nothing about the next.
 */
export interface ModelTableChoice {
  open: boolean | null
  /** undefined: never touched; null: collapsed a row on purpose. */
  expandedSymbol: string | null | undefined
  steeredBy: string | null
}

export const UNTOUCHED_MODEL_TABLE: ModelTableChoice = { open: null, expandedSymbol: undefined, steeredBy: null }

export interface ModelTableState {
  open: boolean
  expandedSymbol: string | null
}

/**
 * A fresh deep link opens the table on its row; a click wins over it until the
 * deep link changes; without a deep link the table starts collapsed. Derived
 * during render, so nothing has to be reset in an effect.
 */
export function modelTableState(deepLinkSymbol: string | null, choice: ModelTableChoice): ModelTableState {
  const current = choice.steeredBy === deepLinkSymbol ? choice : UNTOUCHED_MODEL_TABLE
  return {
    open: current.open ?? deepLinkSymbol != null,
    expandedSymbol: current.expandedSymbol === undefined ? deepLinkSymbol : current.expandedSymbol,
  }
}
