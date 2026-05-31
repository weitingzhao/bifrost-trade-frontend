import { useCallback, useMemo } from 'react'
import { TableCell } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { bsComputeDetail } from '@/utils/optionDiscovery/bsCalc'
import {
  computeDerivedMetrics,
  effectiveQuotePremium,
  fmtIV,
  fmtOptNum,
  optionContractKey,
  normalizeOptionRight,
} from '@/utils/optionDiscovery/optionContractMetrics'
import { parseExpirationDateParts } from '@/utils/optionDiscovery/expirationMeta'
import { CHAIN_COLUMN_LABEL } from '@/utils/optionDiscovery/strikePresets'
import { fmtUsd } from '@/lib/format'
import type { OptionSnapshotRow } from '@/types/optionDiscovery'

export type ChainColumnId = keyof typeof CHAIN_COLUMN_LABEL

type Params = {
  snapshotRows: OptionSnapshotRow[]
  underlyingPrice: number | null
  selectedExpiration: string
  chainColumnVisibility: Record<ChainColumnId, boolean>
  greeksSource: 'snapshot' | 'bs'
  strikeSideMode: 'all' | 'call' | 'put'
  selectedContractKey: string | null
  setSelectedContractKey: (k: string | null) => void
}

export function useDiscoveryChainTable({
  snapshotRows,
  underlyingPrice,
  selectedExpiration,
  chainColumnVisibility,
  greeksSource,
  strikeSideMode,
  selectedContractKey,
  setSelectedContractKey,
}: Params) {
  const showCallSide = strikeSideMode === 'all' || strikeSideMode === 'call'
  const showPutSide = strikeSideMode === 'all' || strikeSideMode === 'put'

  const chainColumnList = useMemo((): ChainColumnId[] => {
    const order: ChainColumnId[] = [
      'day_open',
      'day_high',
      'day_low',
      'day_close',
      'day_vol',
      ...(['iv', 'delta', 'gamma', 'theta', 'vega', 'oi'] as const),
    ]
    return order.filter(id => chainColumnVisibility[id] !== false)
  }, [chainColumnVisibility])

  const chainStrikesSorted = useMemo(() => {
    const set = new Set<number>()
    for (const r of snapshotRows) {
      if (Number.isFinite(r.strike)) set.add(r.strike)
    }
    return [...set].sort((a, b) => a - b)
  }, [snapshotRows])

  const rowIndexByStrikeRight = useMemo(() => {
    const m = new Map<string, number>()
    snapshotRows.forEach((row, idx) => {
      const nr = normalizeOptionRight(row.right)
      if (nr != null) m.set(`${row.strike}|${nr}`, idx)
    })
    return m
  }, [snapshotRows])

  const bsRowValues = useMemo(() => {
    if (snapshotRows.length === 0 || underlyingPrice == null) {
      return [] as (ReturnType<typeof bsComputeDetail> | null)[]
    }
    const parts = parseExpirationDateParts(selectedExpiration)
    if (!parts) return [] as (ReturnType<typeof bsComputeDetail> | null)[]
    const { y, m, d } = parts
    const expDate = new Date(y, m, d)
    expDate.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dteDays = Math.max(0, Math.round((expDate.getTime() - today.getTime()) / 86400000))
    if (dteDays === 0) return [] as (ReturnType<typeof bsComputeDetail> | null)[]
    const tYears = dteDays / 365
    return snapshotRows.map(row => {
      const mktPrice = effectiveQuotePremium(row)
      if (mktPrice == null) return null
      return bsComputeDetail({
        marketPrice: mktPrice,
        S: underlyingPrice,
        K: row.strike,
        tYears,
        r: 0.045,
        right: row.right,
      })
    })
  }, [snapshotRows, underlyingPrice, selectedExpiration])

  const renderChainSideCells = useCallback(
    (
      side: 'call' | 'put',
      row: OptionSnapshotRow | undefined,
      rowIdx: number | null,
      sideSelected: boolean,
    ) =>
      chainColumnList.map(col => {
        const key = `${side}-${col}`
        let cell = '—'
        if (row) {
          switch (col) {
            case 'day_open':
              cell = row.day_open != null ? fmtUsd(row.day_open) : '—'
              break
            case 'day_high':
              cell = row.day_high != null ? fmtUsd(row.day_high) : '—'
              break
            case 'day_low':
              cell = row.day_low != null ? fmtUsd(row.day_low) : '—'
              break
            case 'day_close':
              cell = row.day_close != null ? fmtUsd(row.day_close) : '—'
              break
            case 'day_vol':
              cell = row.day_volume != null ? String(row.day_volume) : '—'
              break
            case 'iv': {
              const bsRow = greeksSource === 'bs' && rowIdx != null ? bsRowValues[rowIdx] : null
              cell = bsRow != null ? fmtIV(bsRow.iv) : fmtIV(row.iv)
              break
            }
            case 'delta': {
              const bsRow = greeksSource === 'bs' && rowIdx != null ? bsRowValues[rowIdx] : null
              cell = bsRow != null ? (bsRow.delta != null ? bsRow.delta.toFixed(4) : '—') : fmtOptNum(row.delta, 4)
              break
            }
            case 'gamma': {
              const bsRow = greeksSource === 'bs' && rowIdx != null ? bsRowValues[rowIdx] : null
              cell = bsRow != null ? (bsRow.gamma != null ? bsRow.gamma.toFixed(4) : '—') : fmtOptNum(row.gamma, 4)
              break
            }
            case 'theta': {
              const bsRow = greeksSource === 'bs' && rowIdx != null ? bsRowValues[rowIdx] : null
              cell = bsRow != null ? (bsRow.thetaPerDay != null ? bsRow.thetaPerDay.toFixed(4) : '—') : fmtOptNum(row.theta, 4)
              break
            }
            case 'vega': {
              const bsRow = greeksSource === 'bs' && rowIdx != null ? bsRowValues[rowIdx] : null
              cell = bsRow != null ? (bsRow.vegaPer1Pct != null ? bsRow.vegaPer1Pct.toFixed(4) : '—') : fmtOptNum(row.vega, 4)
              break
            }
            case 'oi':
              cell = row.open_interest != null ? String(row.open_interest) : '—'
              break
            default:
              break
          }
        }
        return (
          <TableCell
            key={key}
            className={cn(
              'cursor-pointer py-1 text-right font-mono text-xs tabular-nums',
              sideSelected && 'bg-accent/20',
            )}
            onClick={e => {
              e.stopPropagation()
              if (rowIdx != null) {
                const r = snapshotRows[rowIdx]
                const k = r ? optionContractKey(r) : null
                if (k) setSelectedContractKey(selectedContractKey === k ? null : k)
              }
            }}
          >
            {cell}
          </TableCell>
        )
      }),
    [
      chainColumnList,
      selectedContractKey,
      greeksSource,
      bsRowValues,
      snapshotRows,
      setSelectedContractKey,
    ],
  )

  const selectedRow = useMemo(() => {
    if (!selectedContractKey) return null
    return snapshotRows.find(r => optionContractKey(r) === selectedContractKey) ?? null
  }, [snapshotRows, selectedContractKey])

  const selectedDerived = useMemo(() => {
    if (!selectedRow) return null
    return computeDerivedMetrics(selectedRow, underlyingPrice)
  }, [selectedRow, underlyingPrice])

  return {
    showCallSide,
    showPutSide,
    chainColumnList,
    chainStrikesSorted,
    rowIndexByStrikeRight,
    renderChainSideCells,
    selectedRow,
    selectedDerived,
  }
}
