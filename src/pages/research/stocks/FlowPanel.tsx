/**
 * Flow (Rev .124–.130): four funnels side by side — one per model (its reach,
 * then this set) and All three — over the lineage ribbons. Every funnel step
 * is a button: it lists exactly the names that step counts (Rev .129), and it
 * intersects with any lineage focus.
 */
import { cn } from '@/lib/utils'
import { AGREE_BAR, AGREE_OF, AXES, type Funnel, type LineageFocus, type NameRow } from './stockScreenModel'
import { LineageRibbons } from './LineageRibbons'
import type { ModelReach } from './MatchCards'
import { MODEL_TINT } from './stockScreenView'

export interface FunnelFocus {
  f: number
  st: number
}

function fmt(n: number | null): string {
  return n == null ? '—' : n.toLocaleString('en-US')
}

export function FlowPanel({
  open,
  onToggle,
  funnels,
  poolN,
  baseN,
  reach,
  ff,
  onFunnelStep,
  base,
  visible,
  pickedModels,
  focus,
  selected,
  onNode,
  onPick,
  hover,
}: {
  open: boolean
  onToggle: () => void
  funnels: readonly Funnel[]
  poolN: number
  baseN: number
  reach: Record<'sepa' | 'radar' | 'premium', ModelReach>
  ff: FunnelFocus | null
  onFunnelStep: (f: number, st: number) => void
  base: readonly NameRow[]
  visible: readonly number[]
  pickedModels: readonly number[]
  focus: LineageFocus
  selected: string | null
  onNode: (axis: number, node: number) => void
  onPick: (sym: string) => void
  /** A hovered Screen stage: what it does to the lineage, and its test. */
  hover: { note: string; keep: ((r: NameRow) => boolean) | null } | null
}) {
  const pickNote = pickedModels.length
    ? `showing ${pickedModels.map((i) => AXES[i].title).join(' · ')} · picked in the cards above`
    : 'all three models · pick cards above to narrow'
  const laNote = hover ? `hover · ${hover.note}` : pickNote
  return (
    <section className="mat-card min-w-0 overflow-hidden border">
      <header className="flex flex-wrap items-baseline gap-2 border-b border-foreground/[0.06] px-3 py-2">
        <span data-sr-tb="label">Flow</span>
        <span className="text-dense-body font-semibold">Funnel · lineage</span>
        <span className="min-w-0 flex-[1_1_300px] text-pretty text-dense-meta text-muted-foreground">
          {baseN.toLocaleString('en-US')} names that pass the other conditions, per model and across all three,
          then followed through each model’s levels. Accent = clears that model’s bar.
        </span>
        <button type="button" onClick={onToggle} className="ml-auto whitespace-nowrap text-dense-meta text-primary hover:underline">
          {open ? 'Hide ▴' : 'Show funnel · lineage ▾'}
        </button>
      </header>
      {open ? (
        <>
          <div className="grid border-b border-foreground/[0.06] [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
            {funnels.map((fn, fi) => {
              const isModel = fn.key !== 'all3'
              const r = isModel ? reach[fn.key as 'sepa'] : null
              return (
                <div
                  key={fn.key}
                  title={isModel ? AGREE_BAR[AGREE_OF[fn.key as 'sepa']] : 'bars cleared, each model’s own'}
                  className="flex min-w-0 flex-col gap-1 border-r border-foreground/[0.06] px-3 py-2.5"
                >
                  <div className="mb-0.5 flex items-center gap-1.5">
                    {isModel ? (
                      <span className="h-2 w-2 flex-none rounded-[2px]" style={{ background: MODEL_TINT[fn.key as 'sepa'] }} />
                    ) : null}
                    <span className="text-dense-label font-semibold">{fn.title}</span>
                    <span className="truncate font-mono text-dense-caption text-muted-foreground">
                      {r ? `platform ${fmt(r.universe)} → ${fmt(r.rated)} rated` : 'agreement across the models'}
                    </span>
                  </div>
                  {fn.steps.map((st, si) => {
                    const n = st.set.length
                    const prev = si ? fn.steps[si - 1].set.length : null
                    const on = ff != null && ff.f === fi && ff.st === si
                    const last = si === fn.steps.length - 1
                    return (
                      <button
                        key={st.label}
                        type="button"
                        onClick={() => onFunnelStep(fi, si)}
                        title={on ? 'Listed below · click to clear' : `Click to list these ${n} names below`}
                        className={cn(
                          '-mx-1.5 grid cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-px text-left [grid-template-columns:minmax(0,118px)_minmax(0,1fr)_24px_26px]',
                          on ? 'bg-primary/15 ring-1 ring-inset ring-primary' : 'hover:bg-foreground/[0.04]',
                        )}
                      >
                        <span className={cn('truncate text-dense-meta text-[var(--sk-soft)]', on && 'font-semibold')}>
                          {st.label}
                        </span>
                        <span className="flex h-3.5 justify-center">
                          {/* Rev .131: the steps darken as they narrow (ink 14% → 44%); the last is the accent. */}
                          <span
                            className={cn('h-full rounded-[3px]', last && 'bg-primary/60')}
                            style={{
                              width: `${Math.max(4, poolN ? (n / poolN) * 100 : 0).toFixed(1)}%`,
                              background: last
                                ? undefined
                                : `color-mix(in srgb, var(--sk-ink) ${Math.round(14 + (fn.steps.length > 2 ? si / (fn.steps.length - 2) : 0) * 30)}%, transparent)`,
                            }}
                          />
                        </span>
                        <span className="text-right font-mono text-dense-label">{fmt(n)}</span>
                        <span className="text-right font-mono text-dense-caption text-muted-foreground">
                          {prev == null ? '' : prev - n ? `−${prev - n}` : '±0'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
          <div className="px-3 pb-2 pt-2.5">
            <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="text-dense-label font-semibold">Lineage</span>
              <span className="font-mono text-dense-meta text-[var(--sk-mute2)]">{laNote}</span>
            </div>
            <div className="mb-1 text-dense-meta text-muted-foreground">
              one ribbon per path · accent ribbons clear all three · click a node to list its names below (click nodes on
              several axes to intersect) · click a ribbon to open its first name
            </div>
            <LineageRibbons
              set={base}
              visible={visible}
              focus={focus}
              selected={selected}
              onNode={onNode}
              onPick={onPick}
              keep={hover?.keep ?? null}
            />
          </div>
        </>
      ) : null}
    </section>
  )
}
