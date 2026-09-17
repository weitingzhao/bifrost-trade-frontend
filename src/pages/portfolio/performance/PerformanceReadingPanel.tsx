import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import type { ReadingMetric, ReadingTone } from './performanceReading'
import { perfUi } from './performanceUi'

function toneClass(m: ReadingMetric): string {
  const byTone: Record<ReadingTone, string> = {
    pnl: pnlColorClass(m.raw),
    loss: 'text-loss',
    unrealized: 'text-unrealized',
    plain: 'text-foreground',
    soft: 'text-foreground/80',
    muted: 'text-muted-foreground',
  }
  return byTone[m.tone]
}

/** Reading · <range>: the eleven range-level metrics as one strip; each group opens with a rule. */
export function PerformanceReadingPanel({ rangeLabel, metrics }: { rangeLabel: string; metrics: ReadingMetric[] }) {
  return (
    <section className={perfUi.panel} aria-label="Reading">
      <header className={perfUi.panelHead}>
        <span className={perfUi.cap}>Reading · {rangeLabel}</span>
        <span className={cn(perfUi.note, 'ml-auto')}>
          eleven range-level metrics · by asset class, see the calendar’s Summary
        </span>
      </header>
      {metrics.length === 0 ? (
        <p className={cn(perfUi.note, 'px-3 py-2')}>No performance summary for this range yet.</p>
      ) : (
        <div className="flex flex-wrap items-stretch gap-y-0.5 px-2.5 py-1.75">
          {metrics.map(m => (
            <span
              key={m.label}
              title={m.title}
              className={cn('flex min-w-0 flex-col px-3 py-0.5', m.groupHead && 'border-l border-border')}
            >
              <span className={cn(perfUi.cap, 'text-dense-micro', m.groupHead && 'text-foreground/85')}>{m.label}</span>
              <span className={cn(perfUi.mono, 'whitespace-nowrap text-sm font-semibold', toneClass(m))}>{m.value}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
