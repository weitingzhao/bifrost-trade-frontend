/**
 * The page's core reading (Rev .123–.131), in two groups. Result: Pass the
 * screen | All three — both clickable to *focus* the list (Pass clears every
 * focus, All three lists the names that clear all three bars); requiring all
 * three is the small `require` button, because that changes the screen. Per
 * model: one card each, counting among the names that pass every other
 * condition how many clear that model's own bar. Clicking a model card
 * requires it (the Model agreement stage); its "rank by ↓" orders the list.
 */
import type { KeyboardEvent, MouseEvent, Ref } from 'react'
import { cn } from '@/lib/utils'
import { MODEL_TINT } from './stockScreenView'
import {
  AGREE_BAR,
  AXES,
  MODEL_KEYS,
  MODEL_LABEL,
  type AgreeId,
  type MatchCell,
  type ModelKey,
  type NameRow,
  type RankModel,
} from './stockScreenModel'

export interface ModelReach {
  universe: number | null
  rated: number | null
  unit: string
}

function shareOf(k: number, of: number): string {
  return of ? `${Math.round((k / of) * 100)}%` : '0%'
}

function fmt(n: number | null): string {
  return n == null ? '—' : n.toLocaleString('en-US')
}

/** A model's levels across the set, the card's distribution bar. */
function levelSegs(axis: number, base: readonly NameRow[]) {
  const ax = AXES[axis]
  return ax.nodes
    .map((lab, i) => {
      const c = base.filter((r) => ax.of(r) === i).length
      const na = ax.hasNa && i === ax.nodes.length - 1
      return { c, lab: na ? '—' : lab, full: lab, clear: ax.clear.includes(i), na }
    })
    .filter((x) => x.c > 0)
}

function Segs({ axis, base }: { axis: number; base: readonly NameRow[] }) {
  const segs = levelSegs(axis, base)
  const title = AXES[axis].title
  return (
    <>
      <span className="mt-1.5 flex h-1.5 gap-0.5 overflow-hidden rounded-sm">
        {segs.map((s) => (
          <span
            key={s.full}
            title={`${title} · ${s.full} · ${s.c}`}
            style={{ flex: s.c }}
            className={cn(
              s.na ? 'bg-foreground/[0.06]' : s.clear ? 'bg-primary/70' : 'bg-foreground/20',
            )}
          />
        ))}
      </span>
      <span className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
        {segs.map((s) => (
          <span
            key={s.full}
            className={cn(
              'whitespace-nowrap font-mono text-dense-caption',
              s.clear ? 'font-semibold text-foreground' : 'text-muted-foreground',
            )}
          >
            {s.lab} {s.c}
          </span>
        ))}
      </span>
    </>
  )
}

function onKeyActivate(fn: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fn()
    }
  }
}

export function MatchCards({
  pass,
  poolN,
  universeLabel,
  cells,
  base,
  on,
  model,
  reach,
  onToggle,
  onRankBy,
  allRequired,
  onRequireAll,
  noFocus,
  onListAll,
  allThreeListed,
  onListAllThree,
  cardsRef,
  pulse,
}: {
  pass: number
  poolN: number
  universeLabel: string
  cells: readonly MatchCell[]
  base: readonly NameRow[]
  on: Record<string, boolean>
  model: RankModel
  reach: Record<ModelKey, ModelReach>
  onToggle: (id: AgreeId) => void
  onRankBy: (m: ModelKey) => void
  allRequired: boolean
  onRequireAll: () => void
  /** No funnel, lineage or stage focus: the list shows every name that passes. */
  noFocus: boolean
  onListAll: () => void
  allThreeListed: boolean
  onListAllThree: () => void
  cardsRef: Ref<HTMLDivElement>
  /** Stage 1 was clicked: ring the model cards for a moment (Rev .131 #8). */
  pulse: boolean
}) {
  const bN = base.length
  const all3 = cells[3]
  // Sentence case, 11/600 mono, as the prototype's two caps (Rev .154).
  const cap = 'font-mono text-dense-caption font-semibold text-muted-foreground'
  const mark = (onOff: boolean) => (
    <span className={cn('ml-auto whitespace-nowrap text-dense-caption', onOff ? 'font-semibold text-primary' : 'text-[var(--sk-mute2)]')}>
      {onOff ? 'listed ✓' : 'list ↓'}
    </span>
  )
  return (
    <div className="flex flex-wrap items-stretch gap-x-[18px] gap-y-2.5">
      <div className="flex min-w-0 flex-[1.2_1_300px] flex-col gap-1.5">
        <span className={cap}>Result</span>
        <div
          data-sr-kpi="hero"
          className={cn('!grid flex-1 [grid-template-columns:minmax(0,1fr)_minmax(0,1.4fr)] !bg-primary/[0.07]', allRequired ? '!border-primary' : '!border-primary/25')}
        >
          <div
            role="button"
            tabIndex={0}
            onClick={onListAll}
            onKeyDown={onKeyActivate(onListAll)}
            aria-pressed={noFocus}
            title={
              noFocus
                ? 'The list below shows every name that passes the screen'
                : 'Click to clear the funnel / lineage / stage focus and list every name that passes'
            }
            className={cn('-my-1.5 -ml-1.5 mr-2 flex min-w-0 cursor-pointer flex-col rounded-md p-1.5', noFocus && 'bg-primary/15')}
          >
            <span data-sr-kpi-l="" className="flex items-center gap-1.5 text-[var(--sk-soft)]">
              Pass the screen
              {mark(noFocus)}
            </span>
            <span data-sr-kpi-v="" className="text-foreground">
              {fmt(pass)}
            </span>
            <span data-sr-kpi-s="">
              of {fmt(poolN)} in {universeLabel}
            </span>
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={onListAllThree}
            onKeyDown={onKeyActivate(onListAllThree)}
            aria-pressed={allThreeListed}
            title={
              allThreeListed
                ? `Listed below: the ${all3.k} that clear all three bars · click to show every name that passes`
                : `Click to list the ${all3.k} that clear all three bars below`
            }
            className={cn(
              '-my-1.5 -mr-1.5 flex min-w-0 cursor-pointer flex-col rounded-r-md border-l border-foreground/10 py-1.5 pl-3.5 pr-1.5',
              allThreeListed && 'bg-primary/15',
            )}
          >
            <span data-sr-kpi-l="" className="flex items-center gap-2 text-[var(--sk-soft)]">
              All three
              <button
                type="button"
                onClick={(e: MouseEvent) => {
                  e.stopPropagation()
                  onRequireAll()
                }}
                title={
                  allRequired
                    ? 'All three bars are screen conditions · click to drop them'
                    : 'Make all three bars screen conditions (changes the screen)'
                }
                className={cn(
                  'ml-auto cursor-pointer whitespace-nowrap border-0 bg-transparent p-0 text-dense-caption',
                  allRequired ? 'text-primary' : 'text-[var(--sk-mute2)] hover:text-foreground',
                )}
              >
                {allRequired ? 'required ✓' : 'require'}
              </button>
              <span className={cn('whitespace-nowrap text-dense-caption', allThreeListed ? 'font-semibold text-primary' : 'text-[var(--sk-mute2)]')}>
                {allThreeListed ? 'listed ✓' : 'list ↓'}
              </span>
            </span>
            <span data-sr-kpi-v="" className="text-foreground">
              {fmt(all3.k)}
            </span>
            <span data-sr-kpi-s="">
              of {fmt(all3.of)} · {shareOf(all3.k, all3.of)}
            </span>
            <span className="mt-0.5 block font-mono text-dense-caption text-muted-foreground">SEPA ∩ Radar ∩ Premium bars</span>
            <Segs axis={3} base={base} />
          </div>
        </div>
      </div>
      <div
        ref={cardsRef}
        className={cn(
          'flex min-w-0 flex-[3_1_480px] flex-col gap-1.5 rounded-xl transition-shadow duration-300',
          pulse && 'shadow-[0_0_0_2px_var(--sk-accent)]',
        )}
        title="Each model is judged by its own bar: SEPA SETUP / PIVOT · Radar A+ / A · Premium ≥ 70. Nothing is blended."
      >
        <span className={cap}>Per model · each judged by its own bar</span>
        <div className="flex flex-1 flex-wrap items-stretch gap-2.5">
          {MODEL_KEYS.map((m, i) => {
            const cell = cells[i]
            const id = cell.id as AgreeId
            const active = !!on[id]
            const ranking = model === m
            const r = reach[m]
            const pick = () => onToggle(id)
            return (
              <div
                key={m}
                role="button"
                tabIndex={0}
                data-sr-kpi="hero"
                onClick={pick}
                onKeyDown={onKeyActivate(pick)}
                aria-pressed={active}
                title={`${AGREE_BAR[id]} · ${cell.k} of ${bN} that pass the other conditions · ${bN - cell.covered} not covered by ${MODEL_LABEL[m]} · click to ${active ? 'stop requiring' : 'require'} it`}
                className={cn(
                  'flex-[1_1_150px] cursor-pointer text-left transition-colors hover:bg-[var(--card-fill-hover)]',
                  active && '!border-primary',
                )}
              >
                <span data-sr-kpi-l="" className="flex items-center gap-1.5 text-[var(--sk-soft)]">
                  <span className="h-2 w-2 flex-none rounded-[2px]" style={{ background: MODEL_TINT[m] }} />
                  {MODEL_LABEL[m]}
                  <button
                    type="button"
                    onClick={(e: MouseEvent) => {
                      e.stopPropagation()
                      if (!ranking) onRankBy(m)
                    }}
                    title={
                      ranking
                        ? 'This model orders the list below'
                        : `Order the list below by ${MODEL_LABEL[m]} (same as Rank › ${MODEL_LABEL[m]})`
                    }
                    className={cn(
                      'ml-auto cursor-pointer whitespace-nowrap border-0 bg-transparent p-0 text-dense-caption',
                      ranking ? 'font-semibold text-primary' : 'font-normal text-[var(--sk-mute2)] hover:text-foreground',
                    )}
                  >
                    {ranking ? 'ranking ✓' : 'rank by ↓'}
                  </button>
                </span>
                <span data-sr-kpi-v="panel" className="text-foreground">
                  {fmt(cell.k)}
                </span>
                <span data-sr-kpi-s="">
                  of {fmt(cell.of)} · {shareOf(cell.k, cell.of)}
                </span>
                <span className="mt-0.5 block text-pretty font-mono text-dense-caption text-muted-foreground">
                  reaches {fmt(r.rated)} of {fmt(r.universe)}
                  {r.unit} · {fmt(cell.covered)} of {fmt(bN)} here
                </span>
                <Segs axis={i} base={base} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
