import { useCallback, useState } from 'react'
import type { OptionSnapshotRow } from '@/types/optionDiscovery'
import { addCompareRow } from '@/components/optionDiscovery/OptionDiscoveryCompareDrawer'

export function useDiscoveryCompare() {
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareRows, setCompareRows] = useState<OptionSnapshotRow[]>([])

  const addToCompare = useCallback((row: OptionSnapshotRow) => {
    setCompareRows(prev => addCompareRow(prev, row))
  }, [])

  const removeFromCompare = useCallback((contractKey: string) => {
    setCompareRows(prev => prev.filter(r => {
      const k = `${r.strike}|${(r.right || '').trim().toUpperCase()}`
      return k !== contractKey
    }))
  }, [])

  const clearCompare = useCallback(() => {
    setCompareRows([])
  }, [])

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
