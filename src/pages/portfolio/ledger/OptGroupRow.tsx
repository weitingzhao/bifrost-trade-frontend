import { cn } from '@/lib/utils'
import {
  ChevronDown, ChevronRight,
  Pencil, Trash2, Link2, RotateCcw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Execution } from '@/types/positions'
import type { OptionStockLinkSummary } from '@/types/trading'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { isOptionExpired } from '@/utils/ledger/optExecutionGroups'
import {
  executionStrategyInstanceIds,
  getInstanceConsistencyState,
} from '@/utils/ledger/ledgerOptHelpers'
import { executionDateStr } from '@/utils/ledger/performanceUtils'
import {
  adjustedRealizedPnlForOptGroup,
} from '@/utils/ledger/ledgerOptHelpers'
import { fmtCcy, fmtPrice, pnlClass } from './ledgerFormat'
import type { OptGroupCallbacks } from './ledgerTypes'
import { ExecSourceBadge } from './ExecSourceBadge'
import styles from './ledgerStyles'

export { ExecSourceBadge }

const INST_STATE_CLASS: Record<string, string> = {
  same: 'bg-emerald-500',
  multiple: 'bg-amber-400',
  mixed: 'bg-slate-400',
}

export function InstBadge({ trades }: { trades: Execution[] }) {
  const state = getInstanceConsistencyState(trades)
  if (state === 'none') return null
  return (
    <span
      className={cn('inline-block h-2 w-2 rounded-full shrink-0', INST_STATE_CLASS[state] ?? 'bg-slate-400')}
      title={`Instance: ${state}`}
    />
  )
}

function findOppositeLegAttribution(
  ex: Execution,
  groupTrades: Execution[],
): { opportunity_id: number; instance_id: number } | null {
  if (executionStrategyInstanceIds(ex).length > 0) return null
  const mySide = (ex.side ?? '').toUpperCase()
  const myIsBuy = mySide === 'BUY' || mySide === 'BOT' || mySide === 'B'
  for (const t of groupTrades) {
    if (t.account_executions_id === ex.account_executions_id) continue
    const tSide = (t.side ?? '').toUpperCase()
    const tIsBuy = tSide === 'BUY' || tSide === 'BOT' || tSide === 'B'
    if (tIsBuy === myIsBuy) continue
    const ids = executionStrategyInstanceIds(t)
    if (ids.length === 0 || t.strategy_opportunity_id == null) continue
    return { opportunity_id: t.strategy_opportunity_id, instance_id: ids[0] }
  }
  return null
}

export function OptGroupRow({
  group, expanded, expired, showNetQty, linkByOptionId, onToggle, onEdit, onDelete,
  onLinkStrategy, onViewLinks, onExpiredClose, syncingId, onSyncOpposite,
}: {
  group: OptExecutionGroup
  expanded: boolean
  expired: boolean
  showNetQty: boolean
  linkByOptionId?: Record<number, OptionStockLinkSummary>
  onToggle: () => void
} & OptGroupCallbacks) {
  const adjPnl = linkByOptionId ? adjustedRealizedPnlForOptGroup(group, linkByOptionId) : group.realized_pnl
  const stockAdj = adjPnl - group.realized_pnl
  const hasAdj = Math.abs(stockAdj) > 0.005

  const totalLinkCount = group.trades.reduce((sum, t) => {
    const oid = t.account_executions_id
    if (oid == null || !linkByOptionId) return sum
    return sum + (linkByOptionId[oid]?.links?.length ?? 0)
  }, 0)

  return (
    <>
      <tr className={styles.ledgerGroupRow} onClick={onToggle}>
        <td className={cn(styles.ledgerExpandCol, 'text-muted-foreground')}>
          {expanded ? <ChevronDown className="h-3.5 w-3.5 mx-auto" /> : <ChevronRight className="h-3.5 w-3.5 mx-auto" />}
        </td>
        <td className="font-mono font-medium">
          <span className="inline-flex items-center gap-1.5">
            <span className={cn(group.option_right?.toUpperCase() === 'P' ? 'text-rose-600 dark:text-rose-400' : 'text-sky-600 dark:text-sky-400', 'font-bold', styles.ledgerMetaText)}>
              {group.option_right?.toUpperCase() === 'C' ? 'C' : 'P'}
            </span>
            <span>{group.symbol}</span>
            <span className="text-muted-foreground">{group.expiry?.replace(/-/g, '/')}</span>
            <span>{group.strike}</span>
            {expired && <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">EXP</Badge>}
          </span>
        </td>
        <td className={cn(styles.numCol, 'text-center')}>
          <InstBadge trades={group.trades} />
        </td>
        <td className={cn(styles.numCol, 'text-center')}>
          {totalLinkCount > 0 && onViewLinks ? (
            <button
              className={cn(styles.ledgerMetaText, 'text-blue-500 hover:underline font-mono')}
              onClick={ev => {
                ev.stopPropagation()
                const firstOid = group.trades.find(t => t.account_executions_id != null && (linkByOptionId?.[t.account_executions_id!]?.links?.length ?? 0) > 0)?.account_executions_id
                if (firstOid != null) onViewLinks({ title: `${group.symbol} ${group.expiry} ${group.strike} ${group.option_right} — stock links`, oid: firstOid })
              }}
            >
              {totalLinkCount}
            </button>
          ) : (
            <span className="text-muted-foreground/40">—</span>
          )}
        </td>
        {!showNetQty && <td className={cn(styles.numCol, 'text-muted-foreground')}>{fmtPrice(group.buy_avg_price)}</td>}
        {!showNetQty && <td className={cn(styles.numCol, 'text-muted-foreground')}>{fmtPrice(group.sell_avg_price)}</td>}
        {showNetQty && <td className={styles.numCol}>{group.net_qty.toFixed(0)}</td>}
        <td className={cn(styles.numCol, 'text-muted-foreground')}>{group.buy_volume + group.sell_volume}</td>
        <td className={cn(styles.numCol, 'font-medium', pnlClass(adjPnl))}>
          {fmtCcy(adjPnl)}
          {hasAdj && (
            <span className={cn('ml-1', styles.ledgerMetaText, 'text-blue-500 dark:text-blue-400')}>
              {stockAdj >= 0 ? '+' : ''}{fmtCcy(stockAdj)}
            </span>
          )}
        </td>
        <td className={cn(styles.numCol, 'text-muted-foreground')}>{group.trades.length}</td>
      </tr>

      {expanded && (
        <tr className={styles.ledgerDetailHeader}>
          <td />
          <td colSpan={3}>Date / Time</td>
          <td className={styles.numCol}>Side</td>
          <td className={styles.numCol}>Qty</td>
          <td className={styles.numCol}>Price</td>
          <td className={styles.numCol}>PnL</td>
          <td className={styles.numCol}>Actions</td>
        </tr>
      )}

      {expanded && group.trades.map(t => {
        const oid = t.account_executions_id
        const linkCount = oid != null && linkByOptionId ? (linkByOptionId[oid]?.links?.length ?? 0) : 0
        const oppSrc = findOppositeLegAttribution(t, group.trades)
        const tSide = (t.side ?? '').toUpperCase()
        const isBuy = tSide === 'BUY' || tSide === 'BOT' || tSide === 'B'
        const isSyncing = oid != null && syncingId === oid
        const q = Math.abs(t.quantity ?? t.qty)
        const p = Number(t.price) || 0
        const c = Number(t.commission) || 0
        const fillPnl = isBuy ? -(q * p * 100 - c) : (q * p * 100 - c)

        return (
          <tr key={oid ?? `${t.time}-${t.price}`} className={styles.ledgerDetailRow}>
            <td />
            <td className="font-mono text-muted-foreground" colSpan={3}>
              <span>{executionDateStr(t)}</span>
              {linkCount > 0 && (
                <button
                  className={cn('ml-2', styles.ledgerMetaText, 'text-blue-500 hover:underline')}
                  onClick={ev => {
                    ev.stopPropagation()
                    if (oid != null && onViewLinks) onViewLinks({ title: `Fill #${oid} — stock links`, oid })
                  }}
                >
                  L{linkCount}
                </button>
              )}
              {t.account_id && <span className="ml-2 text-muted-foreground/60">{t.account_id}</span>}
              <ExecSourceBadge source={t.source} />
            </td>
            <td className={cn(styles.numCol, 'text-center')}>
              <span className={cn('font-medium', isBuy ? 'text-sky-600 dark:text-sky-400' : 'text-amber-600 dark:text-amber-400')}>
                {isBuy ? 'BUY' : 'SELL'}
              </span>
            </td>
            <td className={styles.numCol}>{q}</td>
            <td className={styles.numCol}>{fmtPrice(p)}</td>
            <td className={cn(styles.numCol, pnlClass(fillPnl))}>
              {!showNetQty ? fmtCcy(fillPnl) : '—'}
            </td>
            <td className={styles.numCol} onClick={ev => ev.stopPropagation()}>
              <div className="flex items-center justify-end gap-0.5">
                {onExpiredClose && isOptionExpired(group.expiry) && (
                  <button
                    className="h-5 w-5 rounded flex items-center justify-center text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                    title="Close expired position"
                    onClick={() => onExpiredClose(t)}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                )}
                {oppSrc && onSyncOpposite && (
                  <button
                    className="h-5 w-5 rounded flex items-center justify-center text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 disabled:opacity-40"
                    title="Sync attribution from opposite leg"
                    disabled={isSyncing}
                    onClick={() => onSyncOpposite(t, oppSrc)}
                  >
                    <RotateCcw className={cn('h-3 w-3', isSyncing && 'animate-spin')} />
                  </button>
                )}
                {onLinkStrategy && (
                  <button
                    className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                    title="Link to strategy"
                    onClick={() => onLinkStrategy(t)}
                  >
                    <Link2 className="h-3 w-3" />
                  </button>
                )}
                {onEdit && (
                  <button
                    className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                    title="Edit execution"
                    onClick={() => onEdit(t)}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
                {onDelete && (
                  <button
                    className="h-5 w-5 rounded flex items-center justify-center text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete execution"
                    onClick={() => onDelete(t)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </td>
          </tr>
        )
      })}
    </>
  )
}
