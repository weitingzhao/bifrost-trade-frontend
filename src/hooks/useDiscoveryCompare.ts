/**
 * Compare drawer state — survives symbol / expiry changes on the Chain tab.
 *
 * Prototype: "The drawer keeps contracts across expiries and symbols." Rows live
 * in sessionStorage (not React state alone) so switching NVDA → AAPL does not
 * wipe the queue; identity is symbol|strike|right.
 */
import { useCallback, useEffect, useState } from 'react'
import { STORAGE_KEYS } from '@/constants/storage'
import type { OptionSnapshotRow } from '@/types/optionDiscovery'
import { addCompareRow, withCompareSymbol } from '@/utils/optionDiscovery/compareRows'

function readStored(): OptionSnapshotRow[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.discoveryCompare)
    if (!raw) return []
    const parsed = JSON.parse(raw) as OptionSnapshotRow[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStored(rows: OptionSnapshotRow[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEYS.discoveryCompare, JSON.stringify(rows))
  } catch {
    // private mode — in-memory only for this visit
  }
}

export function useDiscoveryCompare() {
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareRows, setCompareRowsState] = useState<OptionSnapshotRow[]>(() => readStored())

  const setCompareRows = useCallback(
    (update: OptionSnapshotRow[] | ((prev: OptionSnapshotRow[]) => OptionSnapshotRow[])) => {
      setCompareRowsState((prev) => {
        const next = typeof update === 'function' ? update(prev) : update
        writeStored(next)
        return next
      })
    },
    [],
  )

  // Re-hydrate if another tab wrote the queue (rare; cheap).
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.storageArea !== sessionStorage) return
      if (e.key !== STORAGE_KEYS.discoveryCompare) return
      setCompareRowsState(readStored())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const addToCompare = useCallback(
    (row: OptionSnapshotRow, symbol?: string) => {
      const stamped = symbol ? withCompareSymbol(row, symbol) : row
      setCompareRows((prev) => addCompareRow(prev, stamped))
    },
    [setCompareRows],
  )

  const removeFromCompare = useCallback(
    (contractKey: string) => {
      setCompareRows((prev) =>
        prev.filter((r) => {
          const k = `${(r.underlying_ticker ?? '').trim().toUpperCase()}|${r.strike}|${(r.right || '').trim().toUpperCase()}`
          return k !== contractKey
        }),
      )
    },
    [setCompareRows],
  )

  const clearCompare = useCallback(() => {
    setCompareRows([])
  }, [setCompareRows])

  return {
    compareOpen,
    setCompareOpen,
    compareRows,
    setCompareRows,
    addToCompare,
    removeFromCompare,
    clearCompare,
  }
}
