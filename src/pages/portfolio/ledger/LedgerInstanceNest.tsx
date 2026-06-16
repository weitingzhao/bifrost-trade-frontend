import { getContractLabelParts } from '@/lib/format'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { adjustedRealizedPnlForOptGroup, getOptGroupKey } from '@/utils/ledger/ledgerOptHelpers'
import type { OptionStockLinkSummary } from '@/types/trading'
import { pnlColorClass } from '@/utils/dailyChange'
import { cn } from '@/lib/utils'
import { fmtCcy, fmtLedgerExpiry } from './ledgerFormat'
import {
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  NestedDenseTable,
  denseTable,
} from '@/components/data-display'

type Props = {
  closedGroups: OptExecutionGroup[]
  openGroups: OptExecutionGroup[]
  linkByOptionId?: Record<number, OptionStockLinkSummary>
}

function contractLabel(g: OptExecutionGroup): string {
  const parts = getContractLabelParts(g.contract_key ?? '')
  return parts.symbol || g.contract_key
}

function typeLabel(g: OptExecutionGroup): string {
  const parts = getContractLabelParts(g.contract_key ?? '')
  if (parts.rightLabel) return parts.rightLabel
  const r = (g.option_right ?? '').toUpperCase()
  if (r === 'C') return 'CALL'
  if (r === 'P') return 'PUT'
  return '—'
}

function ContractTable({
  title,
  closed,
  groups,
  linkByOptionId,
}: {
  title: string
  closed: boolean
  groups: OptExecutionGroup[]
  linkByOptionId: Record<number, OptionStockLinkSummary>
}) {
  if (groups.length === 0) return null

  return (
    <div className="min-w-0">
      <h6 className={cn(denseTable.sectionTitle, 'text-dense-meta uppercase tracking-wide')}>
        {title}
      </h6>
      <NestedDenseTable>
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead>Contract</DenseTableHead>
            <DenseTableHead>Expiry</DenseTableHead>
            <DenseTableHead>Strike</DenseTableHead>
            <DenseTableHead>Type</DenseTableHead>
            {closed ? (
              <>
                <DenseTableHead align="right">Buy Qty</DenseTableHead>
                <DenseTableHead align="right">Sell Qty</DenseTableHead>
                <DenseTableHead align="right">PnL</DenseTableHead>
              </>
            ) : (
              <DenseTableHead align="right">Net Qty</DenseTableHead>
            )}
            <DenseTableHead align="right">Trades</DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {groups.map(g => {
            const pnl = closed ? adjustedRealizedPnlForOptGroup(g, linkByOptionId) : null
            return (
              <DenseTableRow key={getOptGroupKey(g)}>
                <DenseTableCell>{contractLabel(g)}</DenseTableCell>
                <DenseTableCell>{fmtLedgerExpiry(g.expiry)}</DenseTableCell>
                <DenseTableCell>{g.strike ?? '—'}</DenseTableCell>
                <DenseTableCell>{typeLabel(g)}</DenseTableCell>
                {closed ? (
                  <>
                    <DenseTableCell className="text-right font-mono tabular-nums">{g.buy_volume}</DenseTableCell>
                    <DenseTableCell className="text-right font-mono tabular-nums">{g.sell_volume}</DenseTableCell>
                    <DenseTableCell className="text-right font-mono tabular-nums">
                      <span className={pnlColorClass(pnl)}>{fmtCcy(pnl)}</span>
                    </DenseTableCell>
                  </>
                ) : (
                  <DenseTableCell className="text-right font-mono tabular-nums">{g.net_qty ?? '—'}</DenseTableCell>
                )}
                <DenseTableCell className="text-right font-mono tabular-nums">{g.trades?.length ?? 0}</DenseTableCell>
              </DenseTableRow>
            )
          })}
        </DenseTableBody>
      </NestedDenseTable>
    </div>
  )
}

export function LedgerInstanceNest({ closedGroups, openGroups, linkByOptionId }: Props) {
  if (closedGroups.length === 0 && openGroups.length === 0) {
    return <p className={denseTable.emptyHint}>No contracts for this instance.</p>
  }

  const links = linkByOptionId ?? {}

  return (
    <div className="flex flex-col gap-1.5">
      <ContractTable title="Closed Option" closed groups={closedGroups} linkByOptionId={links} />
      <ContractTable title="Open Option" closed={false} groups={openGroups} linkByOptionId={links} />
    </div>
  )
}
