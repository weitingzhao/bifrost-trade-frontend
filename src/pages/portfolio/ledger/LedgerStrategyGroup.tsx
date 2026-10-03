import { TradeRef } from '@/components/tradeRecord/TradeRef'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import { CollapsibleChevron } from '@/components/data-display'
import { fmtCcy } from './ledgerFormat'
import { LedgerTradeNest } from './LedgerTradeNest'
import { LedgerTradeStateTag } from './LedgerTradeStateTag'
import { ledgerGroupRowClass } from './ledgerShellUi'
import type { OptExecutionGroup, StratOppGroup } from './ledgerTypes'
import type { Execution } from '@/types/positions'
import type { OptionStockLinkSummary } from '@/types/trading'
import { adjustedRealizedPnlForOptGroup } from '@/utils/ledger/ledgerOptHelpers'

type Props = {
  og: StratOppGroup
  expanded: boolean
  onToggle: () => void
  linkByOptionId: Record<number, OptionStockLinkSummary>
  onContractClick?: (group: OptExecutionGroup) => void
  stockFills?: Execution[]
}

/** One opportunity: a group row, and when open, each instance with its contracts. */
export function LedgerStrategyGroup({
  og,
  expanded,
  onToggle,
  linkByOptionId,
  onContractClick,
  stockFills,
}: Props) {
  const subgroupIds = og.tradeSubgroups.flatMap(sg => (sg.tradeId === 'none' ? [] : [sg.tradeId]))
  let closedCount = 0
  let openCount = 0
  let totalPnl = 0
  for (const sg of og.tradeSubgroups) {
    for (const g of sg.groups) {
      if (g.status === 'realized') {
        closedCount++
        totalPnl += adjustedRealizedPnlForOptGroup(g, linkByOptionId)
      } else {
        openCount++
      }
    }
  }

  return (
    <div>
      <button type="button" className={ledgerGroupRowClass} onClick={onToggle} aria-expanded={expanded}>
        <CollapsibleChevron
          expanded={expanded}
          className={cn('h-3 w-3 self-center', expanded ? 'rotate-0' : '-rotate-90')}
        />
        <span className="min-w-0 flex-[1_1_220px] text-dense-label font-semibold text-foreground">{og.title}</span>
        <span className="font-mono text-dense-meta tabular-nums text-muted-foreground">
          Trades {og.tradeSubgroups.length} · Closed {closedCount} · Open {openCount}
        </span>
        <span className={cn('font-mono text-dense-body font-bold tabular-nums', pnlColorClass(totalPnl))}>
          {fmtCcy(totalPnl)}
        </span>
      </button>

      {expanded && (
        <div className="border-b border-border pb-2 pl-5.5">
          {og.tradeSubgroups.map(sg => {
            const closedGs = sg.groups.filter(g => g.status === 'realized')
            const openGs = sg.groups.filter(g => g.status === 'unrealized')
            const instPnl = closedGs.reduce((s, g) => s + adjustedRealizedPnlForOptGroup(g, linkByOptionId), 0)
            const tradeId = sg.tradeId === 'none' ? null : sg.tradeId
            return (
              <div key={`${og.opportunityId}::${sg.tradeId}`}>
                <div className="flex flex-wrap items-center gap-2 px-2.5 pt-1.75 pb-1">
                  {tradeId == null ? (
                    <span className="text-dense-body font-semibold text-muted-foreground">No trade</span>
                  ) : (
                    <>
                      <TradeRef
                        id={tradeId}
                        list={subgroupIds}
                        from={og.title}
                        className="text-dense-body"
                      />
                      {sg.label ? <span className="text-dense-meta text-muted-foreground">{sg.label}</span> : null}
                      <LedgerTradeStateTag open={openGs.length > 0} />
                    </>
                  )}
                  <span className="ml-auto font-mono text-dense-meta tabular-nums text-muted-foreground">
                    Closed {closedGs.length} · Open {openGs.length} · PnL{' '}
                    <span className={pnlColorClass(instPnl)}>{fmtCcy(instPnl)}</span>
                  </span>
                </div>
                <div className="px-2.5">
                  <LedgerTradeNest
                    groups={[...closedGs, ...openGs]}
                    onContractClick={onContractClick}
                    stockFills={stockFills}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
