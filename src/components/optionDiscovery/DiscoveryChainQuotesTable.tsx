import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { CHAIN_COLUMN_LABEL } from '@/utils/optionDiscovery/strikePresets'
import type { OptionSnapshotRow } from '@/types/optionDiscovery'
import { optionContractKey } from '@/utils/optionDiscovery/optionContractMetrics'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTableNumCell,
} from '@/components/data-display'
import type { StrikeSideMode } from './DiscoverySideToggle'

type ChainColumnId = keyof typeof CHAIN_COLUMN_LABEL

type Props = {
  chainColumnList: ChainColumnId[]
  strikeSideMode: StrikeSideMode
  showCallSide: boolean
  showPutSide: boolean
  chainStrikesSorted: number[]
  rowIndexByStrikeRight: Map<string, number>
  snapshotRows: OptionSnapshotRow[]
  selectedContractKey: string | null
  onSelectContractKey: (key: string | null) => void
  underlyingPrice: number | null
  renderChainSideCells: (
    side: 'call' | 'put',
    row: OptionSnapshotRow | undefined,
    rowIdx: number | null,
    sideSelected: boolean,
  ) => ReactNode
}

export function DiscoveryChainQuotesTable({
  chainColumnList,
  strikeSideMode,
  showCallSide,
  showPutSide,
  chainStrikesSorted,
  rowIndexByStrikeRight,
  snapshotRows,
  selectedContractKey,
  onSelectContractKey,
  underlyingPrice,
  renderChainSideCells,
}: Props) {
  return (
    <DenseDataTable wrapClassName="border-0 rounded-none" tableClassName="text-xs">
      <DenseTableHeader>
        {strikeSideMode === 'put' ? (
          <>
            <DenseTableHeadRow>
              <DenseTableHead
                rowSpan={2}
                className="sticky top-0 z-10 bg-card font-semibold normal-case tracking-normal"
                scope="col"
              >
                Strike
              </DenseTableHead>
              <DenseTableHead
                colSpan={chainColumnList.length}
                className="sticky top-0 z-10 bg-red-500/10 text-center font-semibold normal-case tracking-normal text-destructive"
                scope="colgroup"
              >
                Puts
              </DenseTableHead>
            </DenseTableHeadRow>
            <DenseTableHeadRow>
              {chainColumnList.map(col => (
                <DenseTableHead
                  key={`put-h-${col}`}
                  className={cn(
                    'sticky top-[1.85rem] z-10 bg-red-500/5 text-right font-medium normal-case tracking-normal',
                    denseTableNumCell,
                  )}
                  scope="col"
                >
                  {CHAIN_COLUMN_LABEL[col]}
                </DenseTableHead>
              ))}
            </DenseTableHeadRow>
          </>
        ) : (
          <>
            <DenseTableHeadRow>
              {showCallSide && (
                <DenseTableHead
                  colSpan={chainColumnList.length}
                  className="sticky top-0 z-10 bg-[color-mix(in_oklch,var(--color-option-call)_10%,transparent)] text-center font-semibold normal-case tracking-normal text-option-call"
                  scope="colgroup"
                >
                  Calls
                </DenseTableHead>
              )}
              <DenseTableHead
                rowSpan={2}
                className="sticky top-0 z-10 bg-card text-center font-semibold normal-case tracking-normal"
                scope="col"
              >
                Strike
              </DenseTableHead>
              {showPutSide && strikeSideMode === 'all' && (
                <DenseTableHead
                  colSpan={chainColumnList.length}
                  className="sticky top-0 z-10 bg-[color-mix(in_oklch,var(--color-option-put)_10%,transparent)] text-center font-semibold normal-case tracking-normal text-option-put"
                  scope="colgroup"
                >
                  Puts
                </DenseTableHead>
              )}
            </DenseTableHeadRow>
            <DenseTableHeadRow>
              {showCallSide &&
                chainColumnList.map(col => (
                  <DenseTableHead
                    key={`call-h-${col}`}
                    className={cn(
                      'sticky top-[1.85rem] z-10 bg-green-500/5 text-right font-medium normal-case tracking-normal',
                      denseTableNumCell,
                    )}
                    scope="col"
                  >
                    {CHAIN_COLUMN_LABEL[col]}
                  </DenseTableHead>
                ))}
              {showPutSide &&
                strikeSideMode === 'all' &&
                chainColumnList.map(col => (
                  <DenseTableHead
                    key={`put-h-${col}`}
                    className={cn(
                      'sticky top-[1.85rem] z-10 bg-red-500/5 text-right font-medium normal-case tracking-normal',
                      denseTableNumCell,
                    )}
                    scope="col"
                  >
                    {CHAIN_COLUMN_LABEL[col]}
                  </DenseTableHead>
                ))}
            </DenseTableHeadRow>
          </>
        )}
      </DenseTableHeader>
      <DenseTableBody>
        {chainStrikesSorted.map(strike => {
          const callIdx = rowIndexByStrikeRight.get(`${strike}|C`) ?? null
          const putIdx = rowIndexByStrikeRight.get(`${strike}|P`) ?? null
          const callRow = callIdx != null ? snapshotRows[callIdx] : undefined
          const putRow = putIdx != null ? snapshotRows[putIdx] : undefined
          const callKey = callRow ? optionContractKey(callRow) : null
          const putKey = putRow ? optionContractKey(putRow) : null
          const callSel = callKey != null && selectedContractKey === callKey
          const putSel = putKey != null && selectedContractKey === putKey
          const rowHighlight = (callIdx != null && callSel) || (putIdx != null && putSel)
          const atm =
            underlyingPrice != null &&
            Number.isFinite(underlyingPrice) &&
            Math.abs(strike - underlyingPrice) < 0.021
          const itm =
            !atm &&
            underlyingPrice != null &&
            Number.isFinite(underlyingPrice) &&
            strike < underlyingPrice

          return (
            <DenseTableRow
              key={strike}
              className={cn(
                'cursor-pointer tabular-nums',
                rowHighlight && 'bg-accent/15',
                atm && 'bg-primary/5',
                !atm && itm && 'bg-muted/30',
              )}
              onClick={() => {
                if (callIdx != null && callKey) onSelectContractKey(callSel ? null : callKey)
                else if (putIdx != null && putKey) onSelectContractKey(putSel ? null : putKey)
              }}
            >
              {strikeSideMode === 'put' ? (
                <>
                  <DenseTableCell
                    className={cn(
                      'sticky left-0 z-[1] bg-card text-center font-mono font-semibold',
                      denseTableNumCell,
                      (callSel || putSel) && 'bg-accent/20',
                    )}
                    onClick={e => {
                      e.stopPropagation()
                      if (putIdx != null && putKey) onSelectContractKey(putSel ? null : putKey)
                      else if (callIdx != null && callKey) onSelectContractKey(callSel ? null : callKey)
                    }}
                  >
                    {strike.toFixed(2)}
                  </DenseTableCell>
                  {renderChainSideCells('put', putRow, putIdx, putSel)}
                </>
              ) : (
                <>
                  {showCallSide && renderChainSideCells('call', callRow, callIdx, callSel)}
                  <DenseTableCell
                    className={cn(
                      'text-center font-mono font-semibold',
                      denseTableNumCell,
                      (callSel || putSel) && 'bg-accent/20',
                    )}
                    onClick={e => {
                      e.stopPropagation()
                      if (callIdx != null && callKey) onSelectContractKey(callSel ? null : callKey)
                      else if (putIdx != null && putKey) onSelectContractKey(putSel ? null : putKey)
                    }}
                  >
                    {strike.toFixed(2)}
                  </DenseTableCell>
                  {showPutSide && strikeSideMode === 'all' && renderChainSideCells('put', putRow, putIdx, putSel)}
                </>
              )}
            </DenseTableRow>
          )
        })}
      </DenseTableBody>
    </DenseDataTable>
  )
}
