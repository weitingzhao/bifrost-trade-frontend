import { ledgerTableMinClass } from './ledgerTableFloors'
import { cn } from '@/lib/utils'
import { closedOptHeadPrimary } from './ledgerClosedOptionUi'

/** Stock / Fixed Income / Cash-like ledger table — Actions column stays visible. */
export const stkTableClass = ledgerTableMinClass.t5

export const stkHeadPrimary = closedOptHeadPrimary

export const stkTimeCell = 'text-xs whitespace-nowrap'

export const stkTradeDateCell = 'text-xs whitespace-nowrap'

export const stkMetaCell = 'text-xs whitespace-nowrap'

export const stkActionsCell =
  '!max-w-none w-[8.5rem] shrink-0 overflow-visible whitespace-nowrap px-1.5'

export const stkActionsHead = cn(stkHeadPrimary, stkActionsCell, 'text-left')

export function StkColgroup({ showSymbolCol }: { showSymbolCol: boolean }) {
  if (showSymbolCol) {
    return (
      <colgroup>
        <col style={{ width: '8%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '7.5%' }} />
        <col style={{ width: '8.5%' }} />
        <col style={{ width: '4.5%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '9.5%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '8%' }} />
        <col style={{ width: '9%' }} />
      </colgroup>
    )
  }

  // Measured on DEV at the 1160 floor. Time was 10.5rem for an 11-character
  // clock while Category, Qty and Comm. clipped; the widths now follow content.
  return (
    <colgroup>
      <col style={{ width: '9%' }} />
      <col style={{ width: '7.5%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '5%' }} />
      <col style={{ width: '7.5%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '10.5%' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '7.5%' }} />
      <col style={{ width: '8.5%' }} />
      <col style={{ width: '9.5%' }} />
    </colgroup>
  )
}
