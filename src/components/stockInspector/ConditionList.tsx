import { cn } from '@/lib/utils'
import type { DisplayCondition } from '@/hooks/useStockInspector'
import { ConditionIcon } from './ConditionIcon'
import styles from './stock-inspector.module.css'
import { fmtCondVal } from './stockInspectorUtils'

interface Props {
  conditions: DisplayCondition[]
  activeId?: string | null
  onSelect?: (id: string | null) => void
  clickable?: boolean
}

export function ConditionList({ conditions, activeId, onSelect, clickable }: Props) {
  return (
    <ul className={styles.condList}>
      {conditions.map((c) => {
        const isActive = activeId === c.id
        const canClick = clickable && onSelect
        return (
          <li
            key={c.id}
            className={cn(
              styles.condRow,
              canClick && styles.condRowWithChevron,
              canClick && styles.condRowClickable,
              isActive && styles.condRowActive,
            )}
            onClick={canClick ? () => onSelect(isActive ? null : c.id) : undefined}
            onKeyDown={
              canClick
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelect(isActive ? null : c.id)
                    }
                  }
                : undefined
            }
            role={canClick ? 'button' : undefined}
            tabIndex={canClick ? 0 : undefined}
          >
            <ConditionIcon pass={c.pass} />
            <span className={cn(!c.pass && 'text-muted-foreground')}>{c.label}</span>
            {c.source === 'api' && (c.actual != null || c.threshold != null) ? (
              <span className={styles.condMetric} title={c.reason ?? undefined}>
                {fmtCondVal(c.actual)}
                {c.threshold != null && (
                  <>
                    {' / '}
                    {fmtCondVal(c.threshold)}
                  </>
                )}
              </span>
            ) : (
              <span className={c.pass ? styles.condPillPass : styles.condPillFail}>
                {c.pass ? 'PASS' : 'FAIL'}
              </span>
            )}
            {canClick && (
              <span className={styles.condChevron} aria-hidden>
                {isActive ? '▴' : '▾'}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
