import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DisplayCondition } from '@/hooks/useStockInspector'
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
              canClick && styles.condRowClickable,
              isActive && styles.condRowActive,
            )}
            onClick={canClick ? () => onSelect(isActive ? null : c.id) : undefined}
            onKeyDown={canClick ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(isActive ? null : c.id)
              }
            } : undefined}
            role={canClick ? 'button' : undefined}
            tabIndex={canClick ? 0 : undefined}
          >
            {c.pass ? (
              <Check className={cn('h-3.5 w-3.5 shrink-0', styles.condIconPass)} aria-hidden />
            ) : (
              <X className={cn('h-3.5 w-3.5 shrink-0', styles.condIconFail)} aria-hidden />
            )}
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
              <span className={cn(
                'text-[10px] font-semibold uppercase',
                c.pass ? 'text-emerald-500' : 'text-red-500',
              )}>
                {c.pass ? 'Pass' : 'Fail'}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
