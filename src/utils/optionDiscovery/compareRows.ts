import type { OptionSnapshotRow } from '@/types/optionDiscovery'

export const COMPARE_MAX_SLOTS = 4

export function canAddCompareRow(current: OptionSnapshotRow[], row: OptionSnapshotRow): boolean {
  if (current.length >= COMPARE_MAX_SLOTS) return false
  const k = (r: OptionSnapshotRow) => `${r.strike}|${(r.right || '').trim().toUpperCase()}`
  return !current.some(r => k(r) === k(row))
}

export function addCompareRow(current: OptionSnapshotRow[], row: OptionSnapshotRow): OptionSnapshotRow[] {
  if (!canAddCompareRow(current, row)) return current
  return [...current, row]
}
