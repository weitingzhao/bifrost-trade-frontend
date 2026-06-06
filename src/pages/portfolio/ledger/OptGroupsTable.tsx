import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { isOptionExpired } from '@/utils/ledger/optExecutionGroups'
import { getOptGroupKey } from '@/utils/ledger/ledgerOptHelpers'
import type { OptionStockLinkSummary } from '@/types/trading'
import { OptGroupRow } from './OptGroupRow'
import type { OptGroupCallbacks } from './ledgerTypes'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  denseTableNumCell,
} from '@/components/data-display'

export function OptGroupsTable({
  groups, showNetQty, linkByOptionId, expandedGroups, toggleGroup, keyPrefix = '', ...cbs
}: {
  groups: OptExecutionGroup[]
  showNetQty: boolean
  linkByOptionId?: Record<number, OptionStockLinkSummary>
  expandedGroups: Set<string>
  toggleGroup: (k: string) => void
  keyPrefix?: string
} & OptGroupCallbacks) {
  return (
    <DenseDataTable wrapClassName="mt-1">
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead className="w-8" aria-hidden />
          <DenseTableHead>Contract</DenseTableHead>
          {!showNetQty && <DenseTableHead className={denseTableNumCell}>Buy Avg</DenseTableHead>}
          {!showNetQty && <DenseTableHead className={denseTableNumCell}>Sell Avg</DenseTableHead>}
          {showNetQty && <DenseTableHead className={denseTableNumCell}>Net Qty</DenseTableHead>}
          <DenseTableHead className={denseTableNumCell}>Total Qty</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Realized PnL</DenseTableHead>
          <DenseTableHead className={`${denseTableNumCell} w-12`}>#Fills</DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {groups.map(g => {
          const key = keyPrefix + getOptGroupKey(g)
          return (
            <OptGroupRow
              key={key}
              group={g}
              expanded={expandedGroups.has(key)}
              expired={isOptionExpired(g.expiry)}
              showNetQty={showNetQty}
              linkByOptionId={linkByOptionId}
              onToggle={() => toggleGroup(key)}
              {...cbs}
            />
          )
        })}
      </DenseTableBody>
    </DenseDataTable>
  )
}
