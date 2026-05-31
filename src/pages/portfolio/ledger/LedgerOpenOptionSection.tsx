import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { fmtExpiry, fmtTradeDate, fmtTs, fmtUsd, getContractLabelParts } from '@/lib/format'
import type { Execution } from '@/types/positions'
import type { OptionStockLinkSummary } from '@/types/trading'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { findOppositeLegAttributionSource, getOptGroupKey, ledgerOptDetailRowPnl } from '@/utils/ledger/ledgerOptHelpers'
import { ExecSourceBadge } from './ExecSourceBadge'
import { LedgerOptActionButtons, sideLabel } from './LedgerOptActionButtons'
import { LedgerStgInsCell } from './LedgerStgInsCell'
import type { OptGroupCallbacks } from './ledgerTypes'
import styles from './TradeLedgerPage.module.css'

function tradesSummary(g: OptExecutionGroup): string {
  return (g.trades ?? [])
    .map(ex => {
      const q = ex.quantity != null ? Number(ex.quantity) : NaN
      const p = ex.price != null ? Number(ex.price) : NaN
      const idLabel = ex.account_executions_id != null ? `#${ex.account_executions_id}` : 'id?'
      const parts: string[] = [sideLabel(ex)]
      if (Number.isFinite(q)) parts.push(String(q))
      if (Number.isFinite(p)) parts.push(`@${p}`)
      parts.push(`(${idLabel})`)
      return parts.join(' ')
    })
    .join('; ')
}

function OpenGroupTable({
  groups,
  expandedDetailKeys,
  toggleDetailExpand,
  showExpiredClose,
  onExpiredClose,
}: {
  groups: OptExecutionGroup[]
  expandedDetailKeys: string[]
  toggleDetailExpand: (key: string) => void
  showExpiredClose?: boolean
  onExpiredClose?: (ex: Execution) => void
}) {
  return (
    <table className={styles.optTable}>
      <thead>
        <tr>
          <th className={styles.optExpandCol} />
          <th>Contract</th>
          <th>Account</th>
          <th>Expiry</th>
          <th>STRIKE</th>
          <th>Net qty</th>
          <th>Trades (side / qty / price / id)</th>
          <th>Source</th>
          {showExpiredClose && <th className={styles.optActionsCol}>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {groups.map(g => {
          const p = getContractLabelParts(g.contract_key ?? '')
          const strikeStr = g.strike != null ? ` ${g.strike}` : ''
          const groupKey = getOptGroupKey(g)
          const isExpanded = expandedDetailKeys.includes(groupKey)
          const uniqueAccounts = Array.from(
            new Set((g.trades ?? []).map(ex => (ex.account_id ?? '').trim()).filter(Boolean)),
          )
          const uniqueSources = Array.from(
            new Set((g.trades ?? []).map(ex => (ex.source ?? '').trim()).filter(Boolean)),
          )
          return (
            <tr
              key={groupKey}
              className={styles.optGroupRow}
              onClick={() => toggleDetailExpand(groupKey)}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDetailExpand(groupKey) }
              }}
              aria-expanded={isExpanded}
            >
              <td className={styles.optExpandCol}>
                <span className={`${styles.optExpandIcon} ${isExpanded ? styles.optExpandIconOpen : ''}`} aria-hidden>
                  {isExpanded ? '▼' : '▶'}
                </span>
              </td>
              <td className={styles.optContract}>
                {p.symbol ? (
                  <>
                    <strong>{p.symbol}</strong> {p.rightLabel}
                    {strikeStr}
                  </>
                ) : (
                  g.contract_key
                )}
              </td>
              <td>{uniqueAccounts.length > 0 ? uniqueAccounts.join(', ') : '—'}</td>
              <td>{fmtExpiry(g.expiry)}</td>
              <td><strong>{fmtUsd(g.strike)}</strong></td>
              <td>{g.net_qty}</td>
              <td>{tradesSummary(g) || '—'}</td>
              <td>
                {uniqueSources.length > 0
                  ? uniqueSources.map(s => <ExecSourceBadge key={s} source={s} />)
                  : '—'}
              </td>
              {showExpiredClose && (
                <td className={styles.optActionsCol} onClick={e => e.stopPropagation()}>
                  {onExpiredClose && (g.trades?.[0] != null) && (
                    <button
                      type="button"
                      className={`${styles.iconBtn} ${styles.iconBtnWarn}`}
                      onClick={() => onExpiredClose(g.trades[0])}
                      title="Close expired position"
                      aria-label="Close expired position"
                    >
                      ✕
                    </button>
                  )}
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

type Props = {
  openActiveGroups: OptExecutionGroup[]
  openExpiredGroups: OptExecutionGroup[]
  openExpandedGroups: OptExecutionGroup[]
  expandedDetailKeys: string[]
  toggleDetailExpand: (key: string) => void
  linkByOptionId: Record<number, OptionStockLinkSummary>
} & OptGroupCallbacks

export function LedgerOpenOptionSection({
  openActiveGroups,
  openExpiredGroups,
  openExpandedGroups,
  expandedDetailKeys,
  toggleDetailExpand,
  linkByOptionId,
  onEdit,
  onDelete,
  onLinkStrategy,
  onExpiredClose,
  onSyncOpposite,
  syncingId,
}: Props) {
  if (openActiveGroups.length === 0 && openExpiredGroups.length === 0) {
    return <p className={styles.optEmptyHint}>No open option groups.</p>
  }

  return (
    <>
      {openActiveGroups.length > 0 && (
        <div className={styles.optTableWrap}>
          <h5 className={styles.optDetailTitle}>
            Open Option
            <InfoTooltip text="Option positions with non-zero net quantity and future expiry. They are excluded from the Summary (fully closed trades only) and the Closed Option table above." />
          </h5>
          <OpenGroupTable
            groups={openActiveGroups}
            expandedDetailKeys={expandedDetailKeys}
            toggleDetailExpand={toggleDetailExpand}
          />
        </div>
      )}

      {openExpiredGroups.length > 0 && (
        <div className={styles.optTableWrap}>
          <h5 className={styles.optDetailTitle}>
            Expired but not closed
            <InfoTooltip text="These option contracts have expired but net quantity is not zero. Some executions may be missing in the trade ledger; add the missing trades to close the position." />
          </h5>
          <OpenGroupTable
            groups={openExpiredGroups}
            expandedDetailKeys={expandedDetailKeys}
            toggleDetailExpand={toggleDetailExpand}
            showExpiredClose
            onExpiredClose={onExpiredClose}
          />
        </div>
      )}

      <h5 className={styles.optDetailTitle}>
        Details (per trade)
        <InfoTooltip text="Click an open option row above to load its execution details." />
      </h5>
      <table className={styles.optTable}>
        <thead>
          <tr>
            <th>Contract</th>
            <th>Expiry</th>
            <th>STRIKE</th>
            <th>Stg/Ins</th>
            <th>Trade date</th>
            <th>Side</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Comm.</th>
            <th>PnL</th>
            <th>Account</th>
            <th>Source</th>
            <th className={styles.optActionsCol}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {openExpandedGroups.length === 0 ? (
            <tr>
              <td colSpan={13} className={styles.optDetailPlaceholder}>
                Click an open option row above to load details
              </td>
            </tr>
          ) : (
            openExpandedGroups.flatMap(g =>
              (g.trades ?? []).map((ex, ti) => {
                const groupTrades = g.trades ?? []
                const oppositePeer = findOppositeLegAttributionSource(groupTrades, ex)
                const showSync =
                  onSyncOpposite &&
                  ex.account_executions_id != null &&
                  (ex.strategy_instance_id == null || !Number.isFinite(Number(ex.strategy_instance_id))) &&
                  oppositePeer != null
                const { displayPnl } = ledgerOptDetailRowPnl(ex, linkByOptionId)
                const pnlCls =
                  displayPnl < 0 ? styles.pnlNegative : displayPnl > 0 ? styles.pnlPositive : styles.pnlZero
                const p_ = getContractLabelParts(g.contract_key ?? '')
                const strikeStr_ = g.strike != null ? ` ${g.strike}` : ''

                return (
                  <tr key={`${getOptGroupKey(g)}-${ti}-${ex.time ?? ti}`}>
                    <td className={styles.optContract}>
                      {p_.symbol ? (
                        <>
                          <strong>{p_.symbol}</strong> {p_.rightLabel}
                          {strikeStr_}
                          {ex.account_executions_id != null && (
                            <span className={styles.contractExecId}>#{ex.account_executions_id}</span>
                          )}
                        </>
                      ) : (
                        g.contract_key
                      )}
                    </td>
                    <td>{fmtExpiry(ex.expiry ?? g.expiry)}</td>
                    <td><strong>{fmtUsd(g.strike)}</strong></td>
                    <td><LedgerStgInsCell ex={ex} /></td>
                    <td title={ex.time != null ? `Exec time: ${fmtTs(ex.time)}` : undefined}>
                      {fmtTradeDate(ex.trade_date)}
                    </td>
                    <td>{sideLabel(ex)}</td>
                    <td>{ex.quantity != null ? Number(ex.quantity) : '—'}</td>
                    <td>{fmtUsd(ex.price)}</td>
                    <td>{fmtUsd(ex.commission ?? 0)}</td>
                    <td><span className={pnlCls}>{fmtUsd(displayPnl)}</span></td>
                    <td>{ex.account_id ?? '—'}</td>
                    <td><ExecSourceBadge source={ex.source} /></td>
                    <td className={styles.optActionsCol}>
                      {ex.account_executions_id != null ? (
                        <LedgerOptActionButtons
                          onEdit={onEdit ? () => onEdit(ex) : undefined}
                          onLink={onLinkStrategy ? () => onLinkStrategy(ex) : undefined}
                          onDelete={onDelete ? () => onDelete(ex) : undefined}
                          onSync={
                            showSync && oppositePeer && onSyncOpposite
                              ? () =>
                                  onSyncOpposite(ex, {
                                    opportunity_id: oppositePeer.strategy_opportunity_id!,
                                    instance_id: oppositePeer.strategy_instance_id!,
                                  })
                              : undefined
                          }
                          syncDisabled={syncingId === ex.account_executions_id}
                          syncSpinning={syncingId === ex.account_executions_id}
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                )
              }),
            )
          )}
        </tbody>
      </table>
    </>
  )
}
