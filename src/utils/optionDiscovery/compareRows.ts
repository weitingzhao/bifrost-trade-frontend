import type { OptionSnapshotRow } from '@/types/optionDiscovery'

export const COMPARE_MAX_SLOTS = 4

/** Identity across expiries and symbols — strike|right alone collided when comparing names. */
export function compareRowKey(row: OptionSnapshotRow): string {
  const sym = (row.underlying_ticker ?? '').trim().toUpperCase()
  const right = (row.right || '').trim().toUpperCase()
  return `${sym}|${row.strike}|${right}`
}

export function canAddCompareRow(current: OptionSnapshotRow[], row: OptionSnapshotRow): boolean {
  if (current.length >= COMPARE_MAX_SLOTS) return false
  const k = compareRowKey(row)
  return !current.some((r) => compareRowKey(r) === k)
}

export function addCompareRow(current: OptionSnapshotRow[], row: OptionSnapshotRow): OptionSnapshotRow[] {
  if (!canAddCompareRow(current, row)) return current
  return [...current, row]
}

/** Stamp the page's symbol onto the row so a later name change does not erase it. */
export function withCompareSymbol(row: OptionSnapshotRow, symbol: string): OptionSnapshotRow {
  const sym = symbol.trim().toUpperCase()
  if (!sym) return row
  if ((row.underlying_ticker ?? '').trim().toUpperCase() === sym) return row
  return { ...row, underlying_ticker: sym }
}
