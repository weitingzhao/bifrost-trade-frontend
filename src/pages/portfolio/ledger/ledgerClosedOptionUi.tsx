import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display'

/** Closed Option groups table — Legacy `replay-opt-groups` column rhythm. */
export const closedOptTableClass = 'min-w-[880px]'

/** Primary header row (Contract, Expiry, BUY, …) — slightly larger than default DenseTableHead. */
export const closedOptHeadPrimary =
  '!text-[0.8125rem] font-semibold uppercase tracking-wide text-muted-foreground'

/** BUY/SELL sub-header row (Size, @, Cost, …). */
export const closedOptHeadSub =
  '!text-[length:var(--text-dense-meta)] font-medium normal-case tracking-normal text-muted-foreground'

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
      <col style={{ width: '1.75rem' }} />
      <col style={{ width: '28%' }} />
      <col style={{ width: '6.5%' }} />
      <col style={{ width: '6.5%' }} />
      <col style={{ width: '3.5%' }} />
      <col style={{ width: '5%' }} />
      <col style={{ width: '6%' }} />
      <col style={{ width: '3.5%' }} />
      <col style={{ width: '5%' }} />
      <col style={{ width: '6%' }} />
      <col style={{ width: '7.5%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '7.5%' }} />
    </colgroup>
  )
}

/** Details (per trade) — Legacy `table-operations` width; Actions column must stay visible. */
export const closedOptDetailTableClass = 'min-w-[1080px]'

export const closedOptDetailContractCell = cn(
  closedOptContractCell,
  '!max-w-none min-w-[11rem] overflow-visible',
)

export const closedOptDetailActionsCell =
  '!max-w-none w-[8.5rem] shrink-0 overflow-visible whitespace-nowrap px-1.5'

export const closedOptDetailActionsHead = cn(closedOptHeadPrimary, closedOptDetailActionsCell, 'text-left')

export function ClosedOptDetailColgroup() {
  return (
    <colgroup>
      <col style={{ width: '17%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '6%' }} />
      <col style={{ width: '13%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '5%' }} />
      <col style={{ width: '4%' }} />
      <col style={{ width: '6%' }} />
      <col style={{ width: '5%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '5%' }} />
      <col style={{ width: '8.5rem' }} />
    </colgroup>
  )
}
