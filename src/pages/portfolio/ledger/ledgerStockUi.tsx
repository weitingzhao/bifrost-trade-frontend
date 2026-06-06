import { cn } from '@/lib/utils'
import { closedOptHeadPrimary } from './ledgerClosedOptionUi'

/** Stock / Fixed Income / Cash-like ledger table — Actions column stays visible. */
export const stkTableClass = 'min-w-[1080px]'

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
        <col style={{ width: '10.5rem' }} />
        <col style={{ width: '6.5rem' }} />
        <col style={{ width: '5%' }} />
        <col style={{ width: '8%' }} />
        <col style={{ width: '6%' }} />
        <col style={{ width: '4%' }} />
        <col style={{ width: '5%' }} />
        <col style={{ width: '6%' }} />
        <col style={{ width: '8%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '5%' }} />
        <col style={{ width: '5%' }} />
        <col style={{ width: '8.5rem' }} />
      </colgroup>
    )
  }

  return (
    <colgroup>
      <col style={{ width: '10.5rem' }} />
      <col style={{ width: '6.5rem' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '5%' }} />
      <col style={{ width: '5%' }} />
      <col style={{ width: '6%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '5%' }} />
      <col style={{ width: '5%' }} />
      <col style={{ width: '8.5rem' }} />
    </colgroup>
  )
}
