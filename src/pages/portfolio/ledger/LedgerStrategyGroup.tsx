import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { fmtCcy, pnlClass } from './ledgerFormat'
import { LedgerInstanceNest } from './LedgerInstanceNest'
import type { StratOppGroup } from './ledgerTypes'
import type { OptionStockLinkSummary } from '@/types/trading'
import { adjustedRealizedPnlForOptGroup } from '@/utils/ledger/ledgerOptHelpers'
import styles from './ledgerStyles'

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
    <div className={styles.strategyGroup}>
      <button
        type="button"
        className={styles.strategyGroupHeader}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className={cn(styles.chevron, expanded && styles.chevronOpen)} aria-hidden>▶</span>
        <span className={styles.strategyGroupTitle}>{og.title}</span>
        <span className={styles.strategyGroupStats}>
          <span>Instances: {og.instanceSubgroups.length}</span>
          <span>Closed: {closedCount}</span>
          <span>Open: {openCount}</span>
          <span className={pnlClass(totalPnl)}>
            PnL: {fmtCcy(totalPnl)}
          </span>
        </span>
      </button>
      {expanded && (
        <div className={styles.strategyGroupBody}>
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
              <div key={instKey} className={styles.instanceNest}>
                <div className={styles.instanceHeaderRow}>
                  <button
                    type="button"
                    className={styles.instanceHeader}
                    onClick={() => onToggleInst(og.opportunityId, sg.instanceId)}
                    aria-expanded={instExpanded}
                  >
                    <span className={cn(styles.chevron, instExpanded && styles.chevronOpen)} aria-hidden>▶</span>
                    <span>
                      {sg.instanceId === 'none' ? (
                        'No instance'
                      ) : (
                        <>
                          {sg.label ? <span title={sg.label ?? undefined}>{sg.label} </span> : null}
                          <span className="font-mono">#{String(sg.instanceId)}</span>
                        </>
                      )}
                    </span>
                    <span className={styles.instanceStats}>
                      <span>Closed: {closedGs.length}</span>
                      <span>Open: {openCnt}</span>
                      <span className={pnlClass(instPnl)}>PnL: {fmtCcy(instPnl)}</span>
                    </span>
                  </button>
                  {sg.instanceId !== 'none' && (
                    <Link
                      to={`/strategy/instances?instance=${sg.instanceId}`}
                      className={styles.instanceOpenLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={sg.label ? `Open instance #${sg.instanceId} (${sg.label})` : `Open instance #${sg.instanceId}`}
                    >
                      Open
                    </Link>
                  )}
                </div>
                {instExpanded && (
                  <div className={styles.instanceBody}>
                    <LedgerInstanceNest
                      closedGroups={closedGs}
                      openGroups={openGs}
                      linkByOptionId={linkByOptionId}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
