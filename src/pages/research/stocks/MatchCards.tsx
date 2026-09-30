/**
 * The page's core reading (Rev .123–.128): Pass the screen, then one card per
 * model and All three. A card counts, among the names that pass every other
 * condition, how many clear that model's own bar. Clicking a card requires it
 * (the Model agreement stage); its "rank by ↓" orders the list by it instead —
 * two actions, two entries, the words kept apart.
 */
import type { KeyboardEvent, MouseEvent } from 'react'
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

function pct(k: number, of: number): string {
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
  mins,
  model,
  reach,
  onToggle,
  onAllThree,
  onRankBy,
}: {
  pass: number
  poolN: number
  universeLabel: string
  cells: readonly MatchCell[]
  base: readonly NameRow[]
  on: Record<string, boolean>
  mins: Record<string, number>
  model: RankModel
  reach: Record<ModelKey, ModelReach>
  onToggle: (id: AgreeId) => void
  onAllThree: () => void
  onRankBy: (m: ModelKey) => void
}) {
  const bN = base.length
  const allOn = MODEL_KEYS.every((_, i) => on[cells[i].id]) && !((mins.agree ?? 0) > 0)
  return (
    <div
      className="flex flex-wrap items-stretch gap-2.5"
      title="Each model is judged by its own bar: SEPA SETUP / PIVOT · Radar A+ / A · Premium ≥ 70. Nothing is blended."
    >
      <div
        data-sr-kpi="hero"
        className="flex-[1_1_150px]"
        title={`Names that pass every active condition. The cards to the right count, among the ${bN} that pass the other conditions, how many clear each model’s bar; click one to require it.`}
      >
        <span data-sr-kpi-l="" className="text-[var(--sk-soft)]">
          Pass the screen
        </span>
        <span data-sr-kpi-v="panel" className="text-foreground">
          {fmt(pass)}
        </span>
        <span data-sr-kpi-s="">
          of {fmt(poolN)} in {universeLabel}
        </span>
      </div>
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
              'flex-[1_1_170px] cursor-pointer text-left transition-colors hover:bg-[var(--card-fill-hover)]',
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
                    : `Order the list below by ${MODEL_LABEL[m]} (same as Rank by › ${MODEL_LABEL[m]})`
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
              of {fmt(cell.of)} · {pct(cell.k, cell.of)}
            </span>
            <span className="mt-0.5 block text-pretty font-mono text-dense-caption text-muted-foreground">
              reaches {fmt(r.rated)} of {fmt(r.universe)}
              {r.unit} · {fmt(cell.covered)} of {fmt(bN)} here
            </span>
            <Segs axis={i} base={base} />
          </div>
        )
      })}
      <div
        role="button"
        tabIndex={0}
        data-sr-kpi="hero"
        onClick={onAllThree}
        onKeyDown={onKeyActivate(onAllThree)}
        aria-pressed={allOn}
        title="Clears all three bars · click to require all three"
        className={cn(
          'flex-[1.4_1_190px] cursor-pointer text-left transition-colors hover:bg-[var(--card-fill-hover)]',
          allOn && '!border-primary',
        )}
      >
        <span data-sr-kpi-l="" className="text-[var(--sk-soft)]">
          All three
        </span>
        <span data-sr-kpi-v="" className="text-foreground">
          {fmt(cells[3].k)}
        </span>
        <span data-sr-kpi-s="">
          of {fmt(cells[3].of)} · {pct(cells[3].k, cells[3].of)}
        </span>
        <span className="mt-0.5 block font-mono text-dense-caption text-muted-foreground">
          SEPA ∩ Radar ∩ Premium bars
        </span>
        <Segs axis={3} base={base} />
      </div>
    </div>
  )
}
