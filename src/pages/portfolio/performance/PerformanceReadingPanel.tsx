import { cn } from '@/lib/utils'
import type { ReadingMetric } from '@/utils/performanceReading'
import { readingToneClass } from '@/utils/performanceHeroes'
import { perfUi } from './performanceUi'

/**
 * Consistency · risk · <range>: the range-level metrics the hero row did not
 * take (Rev .82 — Profitability moved up, nothing is printed twice); each
 * group opens with a rule.
 */
export function PerformanceReadingPanel({ rangeLabel, metrics }: { rangeLabel: string; metrics: ReadingMetric[] }) {
  return (
    <section className={perfUi.panel} aria-label="Consistency and risk">
      <header className={perfUi.panelHead}>
        <span className={perfUi.cap} title="Range-level metrics · by asset class, see the calendar’s Summary">
          Consistency · risk · {rangeLabel}
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
              <span className={cn(perfUi.mono, 'whitespace-nowrap text-sm font-semibold', readingToneClass(m.tone, m.raw))}>{m.value}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
