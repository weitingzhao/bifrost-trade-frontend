import { cn } from '@/lib/utils'
import { denseTable } from '@/components/data-display'
import { closedOptHeadPrimary, closedOptNumCell } from './ledgerClosedOptionUi'

/** Open Option groups table — balanced column rhythm (Contract wide, meta columns compact). */
export const openOptTableClass = 'min-w-[960px]'

export const openOptHeadPrimary = closedOptHeadPrimary

export const openOptNumCell = closedOptNumCell

export const openOptExpandCell = cn(denseTable.expandColCell, 'w-7 max-w-[1.75rem]')

export const openOptContractCell = cn(
  denseTable.entityCell,
  'min-w-[14rem] !max-w-none !pl-1 pr-2 align-middle whitespace-nowrap',
)

export const openOptContractHead = cn(openOptHeadPrimary, '!pl-1 text-left')

export const openOptMetaCell = 'text-xs whitespace-nowrap'

export const openOptTradesCell = cn(
  denseTable.detailCellClip,
  'text-xs font-mono leading-snug align-top',
)

export function OpenOptColgroup({ showActions = false }: { showActions?: boolean }) {
  return (
    <colgroup>
      <col style={{ width: '1.75rem' }} />
      <col style={{ width: '30%' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '5%' }} />
      <col style={{ width: showActions ? '28%' : '34%' }} />
      <col style={{ width: '5%' }} />
      {showActions ? <col style={{ width: '4rem' }} /> : null}
    </colgroup>
  )
}
