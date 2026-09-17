import { ledgerTableMinClass } from './ledgerTableFloors'
import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display'

/** Closed Option groups table — Legacy `replay-opt-groups` column rhythm. */
export const closedOptTableClass = ledgerTableMinClass.t3

/** Primary header row (Contract, Expiry, BUY, …) — slightly larger than default DenseTableHead. */
export const closedOptHeadPrimary =
  '!text-dense-body font-semibold uppercase tracking-wide leading-snug text-muted-foreground'

/** BUY/SELL sub-header row (Size, @, Cost, …). */
export const closedOptHeadSub =
  '!text-dense-meta font-medium normal-case tracking-normal text-muted-foreground'

/** Numeric body cells — left-aligned tabular (Legacy table-operations parity). */
export const closedOptNumCell = 'font-mono tabular-nums text-left'

/** Contract body cell — tight to expand chevron, room for long IB symbols. */
export const closedOptContractCell = cn(
  denseTable.entityCell,
  'min-w-[12rem] !pl-1 pr-2 align-middle',
)

export const closedOptContractHead = cn(closedOptHeadPrimary, '!pl-1 text-left')

export const closedOptExpandCell = cn(denseTable.expandColCell, 'w-7 max-w-[1.75rem]')

export function ClosedOptColgroup() {
  return (
    <colgroup>
      {/* Measured on DEV at the 1240 floor: every figure whole; Contract takes the rest. */}
      <col style={{ width: '1.75rem' }} />
      <col style={{ width: '15%' }} />
      <col style={{ width: '6.5%' }} />
      <col style={{ width: '7.5%' }} />
      <col style={{ width: '3.5%' }} />
      <col style={{ width: '6.5%' }} />
      <col style={{ width: '8.5%' }} />
      <col style={{ width: '3.5%' }} />
      <col style={{ width: '6.5%' }} />
      <col style={{ width: '8.5%' }} />
      <col style={{ width: '9.5%' }} />
      <col style={{ width: '7.5%' }} />
      <col style={{ width: '6.5%' }} />
      <col style={{ width: '8%' }} />
    </colgroup>
  )
}

/** Details (per trade) — fit all columns in the card (no horizontal scrollbar). */
export const closedOptDetailTableClass = ledgerTableMinClass.t4

export const closedOptDetailContractCell = cn(
  denseTable.entityCell,
  'min-w-0 !pl-1 pr-1.5 align-middle overflow-hidden',
)

export const closedOptDetailActionsCell =
  'min-w-0 overflow-hidden whitespace-nowrap px-1 text-left'

export const closedOptDetailActionsHead = cn(closedOptHeadPrimary, closedOptDetailActionsCell)

export function ClosedOptDetailColgroup() {
  return (
    <colgroup>
      {/* Stg / ins and Booking wrap (prototype L:356); the figures and the action buttons do not. */}
      <col style={{ width: '15.5%' }} />
      <col style={{ width: '15%' }} />
      <col style={{ width: '7.5%' }} />
      <col style={{ width: '5%' }} />
      <col style={{ width: '4.5%' }} />
      <col style={{ width: '6.5%' }} />
      <col style={{ width: '6.5%' }} />
      <col style={{ width: '9.5%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '13%' }} />
    </colgroup>
  )
}
