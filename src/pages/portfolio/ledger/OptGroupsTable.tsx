import {
  Table, TableBody, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { isOptionExpired } from '@/utils/ledger/optExecutionGroups'
import { getOptGroupKey } from '@/utils/ledger/ledgerOptHelpers'
import type { OptionStockLinkSummary } from '@/types/trading'
import { OptGroupRow } from './OptGroupRow'
import type { OptGroupCallbacks } from './types'

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
    <div className="rounded-md border overflow-hidden text-xs">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="h-7 w-7 px-2" />
            <TableHead className="h-7 font-medium">Contract</TableHead>
            <TableHead className="h-7 w-8 text-center">Inst</TableHead>
            <TableHead className="h-7 text-center w-10">Links</TableHead>
            {!showNetQty && <TableHead className="h-7 text-right">Buy Avg</TableHead>}
            {!showNetQty && <TableHead className="h-7 text-right">Sell Avg</TableHead>}
            {showNetQty && <TableHead className="h-7 text-right">Net Qty</TableHead>}
            <TableHead className="h-7 text-right">Total Qty</TableHead>
            <TableHead className="h-7 text-right min-w-[110px]">Realized PnL</TableHead>
            <TableHead className="h-7 text-right w-12">#Fills</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
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
        </TableBody>
      </Table>
    </div>
  )
}
