import { Link } from 'react-router-dom'
import type { Execution } from '@/types/positions'
import { executionInstanceLabel } from '@/utils/ledger/ledgerOptHelpers'
import styles from './ledgerStyles'

function formatAllocQty(q: number): string {
  const n = Number(q)
  if (!Number.isFinite(n)) return '—'
  return n % 1 === 0 ? String(n) : String(Number(n.toFixed(6)))
}

export function LedgerStgInsCell({ ex }: { ex: Execution }) {
  const strategyName = ex.strategy_opportunity_name?.trim()
  const allocs = ex.instance_allocations
  const hasSplits = Array.isArray(allocs) && allocs.length > 0
  const instanceId = ex.strategy_instance_id

  if (!strategyName && instanceId == null && !hasSplits) {
    return <>—</>
  }

  if (hasSplits) {
    return (
      <div className={`${styles.stgIns} ${styles.stgInsSplit}`}>
        {strategyName ? (
          <div className={styles.stgInsHead}>
            <span className={styles.stgInsStrategy}>{strategyName}</span>
          </div>
        ) : null}
        <ul className={styles.stgInsAllocList} aria-label="Instance allocations">
          {allocs!.map(a => {
            const sid = a.strategy_instance_id
            const label =
              a.strategy_instance_label?.trim() || executionInstanceLabel(ex, sid) || undefined
            const qty = a.allocated_quantity
            return (
              <li key={sid} className={styles.stgInsAllocItem}>
                {label ? (
                  <span className={styles.stgInsAllocLabel} title={label}>
                    {label}
                  </span>
                ) : null}
                <Link
                  to={`/strategy/instances/${sid}`}
                  className={`${styles.stgInsLink} ${styles.stgInsLinkCompact}`}
                  title={label ? `Open instance #${sid} (${label})` : `Open instance #${sid}`}
                >
                  #{sid}
                </Link>
                <span className={styles.stgInsAllocQty}>{formatAllocQty(qty)}</span>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  if (instanceId != null) {
    const instLabel = executionInstanceLabel(ex, instanceId)?.trim()
    return (
      <span className={styles.stgIns}>
        {strategyName ? (
          <>
            <span className={styles.stgInsStrategy}>{strategyName}</span>
            <span className={styles.stgInsSep}>/</span>
          </>
        ) : null}
        {instLabel ? (
          <span className={styles.stgInsPreId} title={instLabel}>
            {instLabel}
          </span>
        ) : null}
        <Link
          to={`/strategy/instances/${instanceId}`}
          className={styles.stgInsLink}
          title={
            instLabel
              ? `Open instance #${instanceId} (${instLabel})`
              : `Open instance #${instanceId}`
          }
        >
          #{instanceId}
        </Link>
      </span>
    )
  }

  if (strategyName) {
    return (
      <span className={styles.stgIns}>
        <span className={styles.stgInsStrategy}>{strategyName}</span>
        <span className={styles.stgInsSep}>/</span>
        <span className={styles.stgInsEmpty}>—</span>
      </span>
    )
  }

  return <>—</>
}
