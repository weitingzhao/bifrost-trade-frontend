import { getContractLabelParts } from '@/lib/format'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { adjustedRealizedPnlForOptGroup, getOptGroupKey } from '@/utils/ledger/ledgerOptHelpers'
import type { OptionStockLinkSummary } from '@/types/trading'
import { fmtCcy, fmtLedgerExpiry, pnlClass } from './ledgerFormat'
import styles from './TradeLedgerPage.module.css'

type Props = {
  closedGroups: OptExecutionGroup[]
  openGroups: OptExecutionGroup[]
  linkByOptionId?: Record<number, OptionStockLinkSummary>
}

function contractLabel(g: OptExecutionGroup): string {
  const parts = getContractLabelParts(g.contract_key ?? '')
  return parts.symbol || g.contract_key
}

function typeLabel(g: OptExecutionGroup): string {
  const parts = getContractLabelParts(g.contract_key ?? '')
  if (parts.rightLabel) return parts.rightLabel
  const r = (g.option_right ?? '').toUpperCase()
  if (r === 'C') return 'CALL'
  if (r === 'P') return 'PUT'
  return '—'
}

export function LedgerInstanceNest({ closedGroups, openGroups, linkByOptionId }: Props) {
  if (closedGroups.length === 0 && openGroups.length === 0) {
    return <p className={styles.instanceEmptyHint}>No contracts for this instance.</p>
  }

  return (
    <div className={styles.instanceNestBody}>
      {closedGroups.length > 0 && (
        <div className={styles.instanceBlock}>
          <h6 className={styles.instanceSubheading}>Closed Option</h6>
          <div className={styles.instanceTableWrap}>
            <table className={styles.instanceFlatTable}>
              <thead>
                <tr>
                  <th>Contract</th>
                  <th>Expiry</th>
                  <th>Strike</th>
                  <th>Type</th>
                  <th className={styles.numCol}>Buy Qty</th>
                  <th className={styles.numCol}>Sell Qty</th>
                  <th className={styles.numCol}>PnL</th>
                  <th className={styles.numCol}>Trades</th>
                </tr>
              </thead>
              <tbody>
                {closedGroups.map(g => {
                  const pnl = adjustedRealizedPnlForOptGroup(g, linkByOptionId ?? {})
                  return (
                    <tr key={getOptGroupKey(g)}>
                      <td>{contractLabel(g)}</td>
                      <td>{fmtLedgerExpiry(g.expiry)}</td>
                      <td>{g.strike ?? '—'}</td>
                      <td>{typeLabel(g)}</td>
                      <td className={styles.numCol}>{g.buy_volume}</td>
                      <td className={styles.numCol}>{g.sell_volume}</td>
                      <td className={styles.numCol}>
                        <span className={pnlClass(pnl)}>{fmtCcy(pnl)}</span>
                      </td>
                      <td className={styles.numCol}>{g.trades?.length ?? 0}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {openGroups.length > 0 && (
        <div className={styles.instanceBlock}>
          <h6 className={styles.instanceSubheading}>Open Option</h6>
          <div className={styles.instanceTableWrap}>
            <table className={styles.instanceFlatTable}>
              <thead>
                <tr>
                  <th>Contract</th>
                  <th>Expiry</th>
                  <th>Strike</th>
                  <th>Type</th>
                  <th className={styles.numCol}>Net Qty</th>
                  <th className={styles.numCol}>Trades</th>
                </tr>
              </thead>
              <tbody>
                {openGroups.map(g => (
                  <tr key={getOptGroupKey(g)}>
                    <td>{contractLabel(g)}</td>
                    <td>{fmtLedgerExpiry(g.expiry)}</td>
                    <td>{g.strike ?? '—'}</td>
                    <td>{typeLabel(g)}</td>
                    <td className={styles.numCol}>{g.net_qty ?? '—'}</td>
                    <td className={styles.numCol}>{g.trades?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
