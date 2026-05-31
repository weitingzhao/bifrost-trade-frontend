import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, Link2, Pencil, Trash2 } from 'lucide-react'
import type { Execution } from '@/types/positions'
import type { OptionStockLinkSummary } from '@/types/trading'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { adjustedRealizedPnlForOptGroup } from '@/utils/ledger/ledgerOptHelpers'
import { executionDateStr } from '@/utils/ledger/performanceUtils'
import { OptGroupsTable } from './OptGroupsTable'
import { fmtCcy, fmtPrice, pnlClass } from './ledgerFormat'
import type { GroupBy, InstanceSubTab, InstGroup } from './ledgerTypes'
import styles from './TradeLedgerPage.module.css'

export function InstanceTabContent({
  instanceSubTab, filteredGroups, noInstGroups, noInstExecs, linkByOptionId,
  groupBy, displayBuckets, outerExpanded, toggleOuter,
  expandedGroups, toggleGroup, onEdit, onDelete,
  onLinkStrategy, onViewLinks, syncingId, onSyncOpposite,
}: {
  instanceSubTab: InstanceSubTab
  filteredGroups: InstGroup[]
  noInstGroups: OptExecutionGroup[]
  noInstExecs: Execution[]
  linkByOptionId: Record<number, OptionStockLinkSummary>
  groupBy: GroupBy
  displayBuckets: { key: string; label: string; groups: InstGroup[] }[]
  outerExpanded: Set<string>
  toggleOuter: (k: string) => void
  expandedGroups: Set<string>
  toggleGroup: (k: string) => void
  onEdit: (e: Execution) => void
  onDelete: (e: Execution) => void
  onLinkStrategy?: (e: Execution) => void
  onViewLinks?: (ctx: { title: string; oid: number }) => void
  syncingId?: number | null
  onSyncOpposite?: (e: Execution, src: { opportunity_id: number; instance_id: number }) => void
}) {
  const [innerExpanded, setInnerExpanded] = useState<Set<string>>(new Set())
  function toggleInner(key: string) {
    setInnerExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (instanceSubTab === 'no_instance') {
    return (
      <div className="space-y-4">
        {noInstGroups.length === 0
          ? <p className={styles.ledgerEmptyHint}>No unassigned option groups.</p>
          : (
            <>
              <h3 className={styles.ledgerSectionTitle}>No Instance — Closed ({noInstGroups.filter(g => g.status === 'realized').length})</h3>
              <OptGroupsTable
                groups={noInstGroups.filter(g => g.status === 'realized')}
                showNetQty={false}
                linkByOptionId={linkByOptionId}
                expandedGroups={innerExpanded}
                toggleGroup={toggleInner}
                keyPrefix="ni-c-"
                onEdit={onEdit} onDelete={onDelete}
                onLinkStrategy={onLinkStrategy} onViewLinks={onViewLinks}
                syncingId={syncingId} onSyncOpposite={onSyncOpposite}
              />
              {noInstGroups.some(g => g.status === 'unrealized') && (
                <>
                  <h3 className={styles.ledgerSectionTitle}>No Instance — Open ({noInstGroups.filter(g => g.status === 'unrealized').length})</h3>
                  <OptGroupsTable
                    groups={noInstGroups.filter(g => g.status === 'unrealized')}
                    showNetQty
                    linkByOptionId={linkByOptionId}
                    expandedGroups={innerExpanded}
                    toggleGroup={toggleInner}
                    keyPrefix="ni-o-"
                    onEdit={onEdit} onDelete={onDelete}
                    onLinkStrategy={onLinkStrategy} onViewLinks={onViewLinks}
                    syncingId={syncingId} onSyncOpposite={onSyncOpposite}
                  />
                </>
              )}
            </>
          )}
        {noInstExecs.length > 0 && (
          <section>
            <h3 className={styles.ledgerSectionTitle}>Raw executions without instance ({noInstExecs.length})</h3>
            <div className={styles.ledgerTableWrap}>
              <table className={styles.ledgerTable}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th className={styles.numCol}>Qty</th>
                    <th className={styles.numCol}>Price</th>
                    <th className={styles.numCol}>PnL</th>
                    <th className={styles.numCol} style={{ width: '4.5rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {noInstExecs.slice(0, 100).map(e => (
                    <tr key={e.account_executions_id ?? `${e.time}-${e.symbol}`}>
                      <td className="font-mono">{executionDateStr(e)}</td>
                      <td className="font-medium">{e.symbol}</td>
                      <td>{e.side}</td>
                      <td className={styles.numCol}>{Math.abs(e.quantity ?? e.qty)}</td>
                      <td className={styles.numCol}>{fmtPrice(e.price)}</td>
                      <td className={cn(styles.numCol, pnlClass(e.realized_pnl ?? 0))}>
                        {e.realized_pnl != null ? fmtCcy(e.realized_pnl) : '—'}
                      </td>
                      <td className={styles.numCol}>
                        <div className="flex gap-0.5 justify-end">
                          {onLinkStrategy && (
                            <button className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted" title="Link strategy" onClick={() => onLinkStrategy(e)}>
                              <Link2 className="h-3 w-3" />
                            </button>
                          )}
                          <button className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted" title="Edit" onClick={() => onEdit(e)}>
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button className="h-5 w-5 rounded flex items-center justify-center text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete" onClick={() => onDelete(e)}>
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {filteredGroups.length === 0 && (
        <p className={styles.ledgerEmptyHint}>No instances match the current filter.</p>
      )}
      {displayBuckets.map(bucket => {
        const showOuter = groupBy !== 'opportunity'
        const bucketExpanded = showOuter ? outerExpanded.has(bucket.key) : true
        return (
          <div key={bucket.key}>
            {showOuter && (
              <button
                type="button"
                className={styles.ledgerBucketHeader}
                onClick={() => toggleOuter(bucket.key)}
              >
                {bucketExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                {bucket.label}
                <span className={styles.ledgerBucketCount}>({bucket.groups.length})</span>
              </button>
            )}
            {bucketExpanded && (
              <div className={cn('space-y-2', showOuter && 'ml-2 mt-1')}>
                {bucket.groups.map(ig => {
                  const key = `inst-${ig.instanceId}`
                  const expanded = expandedGroups.has(key)
                  const closedGs = ig.groups.filter(g => g.status === 'realized')
                  const openGs = ig.groups.filter(g => g.status === 'unrealized')
                  const instPnl = closedGs.reduce((s, g) => s + adjustedRealizedPnlForOptGroup(g, linkByOptionId), 0)
                  return (
                    <div key={key} className={styles.strategyGroup}>
                      <div className={styles.instanceHeaderRow}>
                        <button
                          type="button"
                          className={styles.instanceHeader}
                          onClick={() => toggleGroup(key)}
                          aria-expanded={expanded}
                        >
                          <span className={cn(styles.chevron, expanded && styles.chevronOpen)} aria-hidden>▶</span>
                          <span>
                            {ig.label ? <span title={ig.label}>{ig.label} </span> : null}
                            <span className="font-mono">#{ig.instanceId}</span>
                          </span>
                          {ig.oppName && <span className={styles.ledgerMetaText}>({ig.oppName})</span>}
                          <span className={styles.instanceStats}>
                            <span>Closed: {closedGs.length}</span>
                            <span>Open: {openGs.length}</span>
                            <span className={pnlClass(instPnl)}>PnL: {fmtCcy(instPnl)}</span>
                          </span>
                        </button>
                        <Link
                          to={`/strategy/instances?instance=${ig.instanceId}`}
                          className={styles.instanceOpenLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open
                        </Link>
                      </div>
                      {expanded && (
                        <div className={styles.instanceBody}>
                          {closedGs.length > 0 && (
                            <OptGroupsTable groups={closedGs} showNetQty={false} linkByOptionId={linkByOptionId}
                              expandedGroups={innerExpanded} toggleGroup={toggleInner} keyPrefix={`${key}-c-`}
                              onEdit={onEdit} onDelete={onDelete}
                              onLinkStrategy={onLinkStrategy} onViewLinks={onViewLinks}
                              syncingId={syncingId} onSyncOpposite={onSyncOpposite} />
                          )}
                          {openGs.length > 0 && (
                            <OptGroupsTable groups={openGs} showNetQty linkByOptionId={linkByOptionId}
                              expandedGroups={innerExpanded} toggleGroup={toggleInner} keyPrefix={`${key}-o-`}
                              onEdit={onEdit} onDelete={onDelete}
                              onLinkStrategy={onLinkStrategy} onViewLinks={onViewLinks}
                              syncingId={syncingId} onSyncOpposite={onSyncOpposite} />
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
