import { getContractLabelParts, fmtUsd } from '@/lib/format'
import type { Execution } from '@/types/positions'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { getOptGroupKey } from '@/utils/ledger/ledgerOptHelpers'
import { ledgerContractDisplay, fmtExpiryOccToken } from './ledgerContractMark'
import { LedgerBookingTagForFills } from './LedgerBookingTag'
import { ledgerTableMinClass } from './ledgerTableFloors'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTable,
  denseTableNumCell,
} from '@/components/data-display'

type Props = {
  /** Closed contracts first, then open ones — one table, as the prototype draws it. */
  groups: OptExecutionGroup[]
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

/** T1: the contracts under one instance in the Strategy view. */
export function LedgerInstanceNest({ groups, onContractClick, stockFills = [] }: Props) {
  if (groups.length === 0) {
    return <p className={denseTable.emptyHint}>No contracts for this instance.</p>
  }

  return (
    <DenseDataTable wrapClassName="rounded-sm" tableClassName={ledgerTableMinClass.t1}>
      {/* Measured on DEV at the 660 floor, with strike as `$1,220.00` and the full contract token
          (widest 165px / 87px); Booking wraps rather than clipping. */}
      <colgroup>
        <col style={{ width: '25%' }} />
        <col style={{ width: '11%' }} />
        <col style={{ width: '13.5%' }} />
        <col style={{ width: '7.5%' }} />
        <col style={{ width: '10.5%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '22.5%' }} />
      </colgroup>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Contract</DenseTableHead>
          <DenseTableHead>Expiry</DenseTableHead>
          <DenseTableHead align="right">Strike</DenseTableHead>
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
              <DenseTableCell className="font-mono text-muted-foreground">{fmtExpiryOccToken(g.expiry)}</DenseTableCell>
              <DenseTableCell className={denseTableNumCell}>
                {/* A group built without a strike carries 0, not a price. */}
                {g.strike > 0 ? fmtUsd(g.strike) : '—'}
              </DenseTableCell>
              <DenseTableCell className="text-dense-meta text-muted-foreground">{typeLabel(g)}</DenseTableCell>
              <DenseTableCell className={`${denseTableNumCell} font-semibold`}>{g.net_qty ?? '—'}</DenseTableCell>
              <DenseTableCell className={`${denseTableNumCell} text-muted-foreground`}>
                {g.trades?.length ?? 0}
              </DenseTableCell>
              <DenseTableCell>
                <LedgerBookingTagForFills fills={g.trades ?? []} stockFills={stockFills} />
              </DenseTableCell>
            </DenseTableRow>
          )
        })}
      </DenseTableBody>
    </DenseDataTable>
  )
}
