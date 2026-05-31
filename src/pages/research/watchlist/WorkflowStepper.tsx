import { cn } from '@/lib/utils'
import type { PrimaryWorkflowTab } from '@/utils/watchlistHelpers'
import styles from './watchlist.module.css'

interface Props {
  active: PrimaryWorkflowTab
  watchingCount: number
  sizingCount: number
  positionsCount: number
  onChange: (tab: PrimaryWorkflowTab) => void
}

export function WorkflowStepper({
  active,
  watchingCount,
  sizingCount,
  positionsCount,
  onChange,
}: Props) {
  const steps: {
    id: PrimaryWorkflowTab
    index: string
    title: string
    desc: string
    count: number
  }[] = [
    { id: 'watching', index: '1', title: 'Watching', desc: 'Screen names & ideas', count: watchingCount },
    { id: 'sizing', index: '2', title: 'Sizing', desc: 'Size before you trade', count: sizingCount },
    { id: 'positions', index: '3', title: 'Positions', desc: 'Live IB holdings', count: positionsCount },
  ]

  return (
    <div className={styles.stepper} role="tablist" aria-label="Position workflow steps">
      {steps.map((step, i) => {
        const isActive = active === step.id
        const stepOrder = ['watching', 'sizing', 'positions'] as const
        const activeIdx = stepOrder.indexOf(active)
        const stepIdx = stepOrder.indexOf(step.id)
        const isDone = stepIdx < activeIdx

        return (
          <div key={step.id} className="flex flex-1 items-stretch min-w-0">
            {i > 0 && (
              <span
                className={cn(styles.stepConnector, isDone || isActive ? styles.stepConnectorDone : '')}
                aria-hidden
              />
            )}
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              className={cn(
                styles.step,
                isActive && styles.stepActive,
                isDone && styles.stepDone,
              )}
              onClick={() => onChange(step.id)}
            >
              <span className={styles.stepIndex} aria-hidden>{step.index}</span>
              <span className="min-w-0">
                <span className={styles.stepTitle}>{step.title}</span>
                <span className={styles.stepDesc}>{step.desc}</span>
              </span>
              <span className={styles.stepBadge}>{step.count}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
