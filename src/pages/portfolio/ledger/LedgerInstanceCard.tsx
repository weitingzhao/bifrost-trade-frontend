import type { ReactNode } from 'react'
import { TradeRef } from '@/components/tradeRecord/TradeRef'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import { CollapsibleChevron } from '@/components/data-display'
import { fmtCcy } from './ledgerFormat'
import { LedgerInstanceStateTag } from './LedgerInstanceStateTag'
import { ledgerGroupRowButtonClass, ledgerGroupRowWrapClass } from './ledgerShellUi'

type Props = {
  instanceId: number
  /** Every instance in the view, in order — what the sheet steps. */
  instanceIds: readonly number[]
  label?: string | null
  oppName?: string | null
  closedCount: number
  openCount: number
  pnl: number
  expanded: boolean
  onToggle: () => void
  children: ReactNode
}

/** One instance in the Instance view: a group row, and when open, its contracts and their fills. */
export function LedgerInstanceCard({
  instanceId,
  instanceIds,
  label,
  oppName,
  closedCount,
  openCount,
  pnl,
  expanded,
  onToggle,
  children,
}: Props) {
  const name = label?.trim() || oppName?.trim() || ''
  const showOpp = !!oppName?.trim() && oppName.trim() !== name
  return (
    <div id={`ledger-inst-${instanceId}`}>
      {/* The token opens the instance; the rest of the row folds it. Two
          controls side by side, because a button cannot hold a button. */}
      <div className={ledgerGroupRowWrapClass}>
        <button
          type="button"
          className="flex-none cursor-pointer border-0 bg-transparent py-1 pr-1 pl-2.5"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} #${instanceId}`}
        >
          <CollapsibleChevron
            expanded={expanded}
            className={cn('h-3 w-3 self-center', expanded ? 'rotate-0' : '-rotate-90')}
          />
        </button>
        <TradeRef id={instanceId} list={instanceIds} from="Ledger · trades" className="text-dense-body" />
        <button type="button" className={cn(ledgerGroupRowButtonClass, 'pl-2')} onClick={onToggle} tabIndex={-1} aria-hidden>
          <span className="min-w-0 flex-[1_1_200px] text-dense-body text-foreground">
            {name}
            {showOpp ? <span className="ml-2 text-dense-meta text-muted-foreground">{oppName}</span> : null}
          </span>
          <span className="font-mono text-dense-meta tabular-nums text-muted-foreground">
            Closed {closedCount} · Open {openCount} · PnL <span className={pnlColorClass(pnl)}>{fmtCcy(pnl)}</span>
          </span>
          <LedgerInstanceStateTag open={openCount > 0} />
        </button>
      </div>
      {expanded && <div className="border-b border-border px-2.5 pb-2.5">{children}</div>}
    </div>
  )
}
