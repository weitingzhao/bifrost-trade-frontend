import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import {
  CollapsibleChevron,
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupStats,
  CollapsibleGroupTitle,
} from '@/components/data-display'
import { fmtCcy } from './ledgerFormat'
import { instanceOpenLinkClass } from './ledgerSharedClasses'
import { LedgerInstanceNest } from './LedgerInstanceNest'
import type { StratOppGroup } from './ledgerTypes'
import type { OptionStockLinkSummary } from '@/types/trading'
import { adjustedRealizedPnlForOptGroup } from '@/utils/ledger/ledgerOptHelpers'

type Props = {
  og: StratOppGroup
  expanded: boolean
  onToggle: () => void
  strategyInstExpanded: Set<string>
  onToggleInst: (oppId: number | 'none', instId: number | 'none') => void
  linkByOptionId: Record<number, OptionStockLinkSummary>
}
export function LedgerStrategyGroup({
  og,
  expanded,
  onToggle,
  strategyInstExpanded,
  onToggleInst,
  linkByOptionId,
}: Props) {
  let closedCount = 0
  let openCount = 0
  let totalPnl = 0
  for (const sg of og.instanceSubgroups) {
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
    <CollapsibleGroup variant="card">
      <CollapsibleGroupHeader expanded={expanded} onToggle={onToggle}>
        <CollapsibleChevron expanded={expanded} />
        <CollapsibleGroupTitle>{og.title}</CollapsibleGroupTitle>
        <CollapsibleGroupStats>
          <span>Instances: {og.instanceSubgroups.length}</span>
          <span>Closed: {closedCount}</span>
          <span>Open: {openCount}</span>
          <span className={cn('font-mono tabular-nums', pnlColorClass(totalPnl))}>
            PnL: {fmtCcy(totalPnl)}
          </span>
        </CollapsibleGroupStats>
      </CollapsibleGroupHeader>
      {expanded && (
        <CollapsibleGroupBody className="pt-0">
          {og.instanceSubgroups.map(sg => {
            const instKey = `${og.opportunityId}::${sg.instanceId}`
            const instExpanded = strategyInstExpanded.has(instKey)
            const closedGs = sg.groups.filter(g => g.status === 'realized')
            const openGs = sg.groups.filter(g => g.status === 'unrealized')
            const openCnt = openGs.length
            const instPnl = closedGs.reduce(
              (s, g) => s + adjustedRealizedPnlForOptGroup(g, linkByOptionId),
              0,
            )
            return (
              <CollapsibleGroup key={instKey} variant="inset">
                <div className="flex items-stretch">
                  <CollapsibleGroupHeader
                    expanded={instExpanded}
                    onToggle={() => onToggleInst(og.opportunityId, sg.instanceId)}
                    className="flex-1 bg-transparent hover:bg-muted/30"
                  >
                    <CollapsibleChevron expanded={instExpanded} />
                    <span className="min-w-0 truncate">
                      {sg.instanceId === 'none' ? (
                        'No instance'
                      ) : (
                        <>
                          {sg.label ? <span title={sg.label ?? undefined}>{sg.label} </span> : null}
                          <span className="font-mono">#{String(sg.instanceId)}</span>
                        </>
                      )}
                    </span>
                    <CollapsibleGroupStats>
                      <span>Closed: {closedGs.length}</span>
                      <span>Open: {openCnt}</span>
                      <span className={cn('font-mono tabular-nums', pnlColorClass(instPnl))}>
                        PnL: {fmtCcy(instPnl)}
                      </span>
                    </CollapsibleGroupStats>
                  </CollapsibleGroupHeader>
                  {sg.instanceId !== 'none' && (
                    <Link
                      to={`/strategy/instances?instance=${sg.instanceId}`}
                      className={instanceOpenLinkClass}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={
                        sg.label
                          ? `Open instance #${sg.instanceId} (${sg.label})`
                          : `Open instance #${sg.instanceId}`
                      }
                    >
                      Open
                    </Link>
                  )}
                </div>
                {instExpanded && (
                  <CollapsibleGroupBody className="pb-2 pl-5">
                    <LedgerInstanceNest
                      closedGroups={closedGs}
                      openGroups={openGs}
                      linkByOptionId={linkByOptionId}
                    />
                  </CollapsibleGroupBody>
                )}
              </CollapsibleGroup>
            )
          })}
        </CollapsibleGroupBody>
      )}
    </CollapsibleGroup>
  )
}
