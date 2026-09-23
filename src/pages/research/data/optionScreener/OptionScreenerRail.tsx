/**
 * The numbered rail — `2 · Structure` and `3 · Filters` — and the panel shell
 * all three steps share (`1 · Underlyings` lives in `OptionScreenerSources`).
 *
 * The numbers are the design's argument: what to screen, in what shape, how
 * tight. The filters are live — no Run button — because they only narrow a
 * chain already fetched; see `screenerModel.ts`.
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { IncludeExcludeToggle } from '@/components/data-display'
import { STRUCTURE_TYPES } from './optionScreenerConstants'
import { FILTER_SPECS, type LiveFilters } from './screenerModel'

export function RailPanel({
  step,
  title,
  aside,
  children,
}: {
  step: number
  title: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card" aria-label={title}>
      <header className="flex items-baseline gap-2 border-b border-border bg-[var(--sk-raised2)] px-3 py-2">
        <span className="text-dense-micro font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {step} · {title}
        </span>
        {aside}
      </header>
      {children}
    </section>
  )
}

export function StructurePanel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <RailPanel step={2} title="Structure">
      <div role="radiogroup" aria-label="Structure" className="flex flex-col gap-1.5 px-2.5 py-2">
        {STRUCTURE_TYPES.map((s) => {
          const on = s.value === value
          return (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!s.enabled}
              onClick={() => onChange(s.value)}
              title={s.enabled ? undefined : s.needs}
              className={cn(
                'flex items-start gap-2 rounded-md border px-2.5 py-2 text-left',
                on ? 'border-primary/60 bg-primary/[0.05]' : 'border-border bg-[var(--sk-raised)]',
                s.enabled ? 'hover:bg-secondary/60' : 'cursor-not-allowed opacity-50',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 size-3 shrink-0 rounded-full border',
                  on ? 'border-primary bg-primary' : 'border-[var(--sk-line2)]',
                )}
              />
              <span className="min-w-0">
                <span className="flex items-baseline gap-2">
                  <span className="text-dense-body font-semibold">{s.label}</span>
                  <span className="text-dense-caption text-muted-foreground">{s.sub}</span>
                </span>
                <span className="mt-0.5 block text-dense-caption text-muted-foreground">{s.needs}</span>
              </span>
            </button>
          )
        })}
      </div>
    </RailPanel>
  )
}

export function FiltersPanel({
  filters,
  onChange,
  onReset,
  includeEarnings,
  onIncludeEarnings,
}: {
  filters: LiveFilters
  onChange: (next: LiveFilters) => void
  onReset: () => void
  includeEarnings: boolean
  onIncludeEarnings: (v: boolean) => void
}) {
  return (
    <RailPanel
      step={3}
      title="Filters"
      aside={
        <>
          <span className="text-dense-caption text-muted-foreground">live — no Run button</span>
          <button
            type="button"
            onClick={onReset}
            className="ml-auto text-dense-caption text-primary hover:underline"
          >
            Reset
          </button>
        </>
      }
    >
      <div className="px-3 pb-2.5 pt-1.5">
        {FILTER_SPECS.map((spec) => (
          <label
            key={spec.key}
            className="grid grid-cols-[7.5rem_minmax(0,1fr)_3.5rem] items-center gap-2 py-1 text-dense-meta"
          >
            <span className="text-secondary-foreground">{spec.label}</span>
            <input
              type="range"
              min={spec.min}
              max={spec.max}
              step={spec.step}
              value={filters[spec.key]}
              onChange={(e) => onChange({ ...filters, [spec.key]: Number(e.target.value) })}
              className="w-full accent-[var(--primary)]"
              aria-label={spec.label}
            />
            <span className="text-right font-mono tabular-nums text-foreground">
              {spec.format(filters[spec.key])}
            </span>
          </label>
        ))}
        <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
          <IncludeExcludeToggle
            label="Earnings inside window"
            include={includeEarnings}
            onChange={onIncludeEarnings}
            size="xs"
          />
          {/* Earnings is the one filter the server applies: the response has
              no earnings date per name, so toggling it re-screens. */}
          <span className="text-dense-caption text-muted-foreground">
            {includeEarnings ? 'allowed — every CSP rule would still refuse' : 'excluded (rule default)'} ·
            re-screens
          </span>
        </div>
      </div>
    </RailPanel>
  )
}
