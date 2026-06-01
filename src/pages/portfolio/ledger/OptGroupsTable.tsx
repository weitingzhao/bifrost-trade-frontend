import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { isOptionExpired } from '@/utils/ledger/optExecutionGroups'
import { getOptGroupKey } from '@/utils/ledger/ledgerOptHelpers'
import type { OptionStockLinkSummary } from '@/types/trading'
import { OptGroupRow } from './OptGroupRow'
import type { OptGroupCallbacks } from './ledgerTypes'
import styles from './ledgerStyles'

export function OptGroupsTable({
  groups, showNetQty, linkByOptionId, expandedGroups, toggleGroup, keyPrefix = '', ...cbs
}: {
  groups: OptExecutionGroup[]
  showNetQty: boolean
  linkByOptionId?: Record<number, OptionStockLinkSummary>
  expandedGroups: Set<string>
  toggleGroup: (k: string) => void
  keyPrefix?: string
} & OptGroupCallbacks) {
  return (
    <div className={styles.ledgerTableWrap}>
      <table className={styles.ledgerTable}>
        <thead>
          <tr>
            <th className={styles.ledgerExpandCol} aria-hidden />
            <th>Contract</th>
            <th className={styles.numCol} style={{ width: '2.5rem' }}>Inst</th>
            <th className={styles.numCol} style={{ width: '3rem' }}>Links</th>
            {!showNetQty && <th className={styles.numCol}>Buy Avg</th>}
            {!showNetQty && <th className={styles.numCol}>Sell Avg</th>}
            {showNetQty && <th className={styles.numCol}>Net Qty</th>}
            <th className={styles.numCol}>Total Qty</th>
            <th className={styles.numCol}>Realized PnL</th>
            <th className={styles.numCol} style={{ width: '3rem' }}>#Fills</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(g => {
            const key = keyPrefix + getOptGroupKey(g)
            return (
              <OptGroupRow
                key={key}
                group={g}
                expanded={expandedGroups.has(key)}
                expired={isOptionExpired(g.expiry)}
                showNetQty={showNetQty}
                linkByOptionId={linkByOptionId}
                onToggle={() => toggleGroup(key)}
                {...cbs}
              />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
