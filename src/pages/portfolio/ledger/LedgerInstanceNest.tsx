import { getContractLabelParts } from '@/lib/format'
import type { Execution } from '@/types/positions'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { getOptGroupKey } from '@/utils/ledger/ledgerOptHelpers'
import { ledgerContractDisplay, fmtExpiryOccToken } from './ledgerContractMark'
import { LedgerBookingTagForFills } from './LedgerBookingTag'
import { ledgerTableMinClass } from './ledgerTableFloors'
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
  onContractClick?: (group: OptExecutionGroup) => void
  stockFills?: Execution[]
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
  groups,
  onContractClick,
  stockFills = [],
}: {
  title: string
  groups: OptExecutionGroup[]
  onContractClick?: (group: OptExecutionGroup) => void
  stockFills?: Execution[]
}) {
  if (groups.length === 0) return null

  return (
    <div className="min-w-0">
      <h6 className={`${denseTable.sectionTitle} text-dense-meta uppercase tracking-wide`}>
        {title}
      </h6>
      <NestedDenseTable tableClassName={ledgerTableMinClass.t1}>
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead>Contract</DenseTableHead>
            <DenseTableHead>Expiry</DenseTableHead>
            <DenseTableHead>Strike</DenseTableHead>
            <DenseTableHead>Type</DenseTableHead>
            <DenseTableHead align="right">Net qty</DenseTableHead>
            <DenseTableHead align="right">Trades</DenseTableHead>
            <DenseTableHead>Booking</DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {groups.map(g => {
            const { mark, occ } = ledgerContractDisplay(g)
            return (
              <DenseTableRow
                key={getOptGroupKey(g)}
                className={onContractClick ? 'cursor-pointer' : undefined}
                onClick={onContractClick ? () => onContractClick(g) : undefined}
              >
                <DenseTableCell title={occ}>
                  <span className="font-mono text-foreground">{mark}</span>
                </DenseTableCell>
                <DenseTableCell>{fmtExpiryOccToken(g.expiry)}</DenseTableCell>
                <DenseTableCell>{g.strike ?? '—'}</DenseTableCell>
                <DenseTableCell>{typeLabel(g)}</DenseTableCell>
                <DenseTableCell className="text-right font-mono tabular-nums">
                  {g.net_qty ?? '—'}
                </DenseTableCell>
                <DenseTableCell className="text-right font-mono tabular-nums">
                  {g.trades?.length ?? 0}
                </DenseTableCell>
                <DenseTableCell>
                  <LedgerBookingTagForFills fills={g.trades ?? []} stockFills={stockFills} />
                </DenseTableCell>
              </DenseTableRow>
            )
          })}
        </DenseTableBody>
      </NestedDenseTable>
    </div>
  )
}

export function LedgerInstanceNest({ closedGroups, openGroups, onContractClick, stockFills }: Props) {
  if (closedGroups.length === 0 && openGroups.length === 0) {
    return <p className={denseTable.emptyHint}>No contracts for this instance.</p>
  }

  return (
    <div className="flex flex-col gap-1.5">
      <ContractTable title="Closed Option" groups={closedGroups} onContractClick={onContractClick} stockFills={stockFills} />
      <ContractTable title="Open Option" groups={openGroups} onContractClick={onContractClick} stockFills={stockFills} />
    </div>
  )
}
