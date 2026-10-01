/**
 * The result's head (Rev .131): three sections for the three ways the list
 * changes, kept apart. Screen = what passes (conditions, versioned) · Focus =
 * what you are looking at (a funnel step, a lineage node, a stage's −N; not
 * versioned) · Rank = how it is ordered (orders, never filters — the same
 * state as the cards' rank by). Under it, the version strip (renamed
 * Versions: the lineage chart owns the word Lineage).
 */
import { Link } from 'react-router-dom'
import { SegmentControl } from '@/components/data-display'
import { cn } from '@/lib/utils'
import { RankDrawer } from './RankDrawer'
import { RANK_OPTIONS, type WeightSet } from './stockScreenView'
import type { RankModel, ScreenVersion } from './stockScreenModel'

export interface FocusChip {
  key: string
  label: string
  clear: () => void
}

const CELL = 'flex min-w-0 flex-col gap-1 px-3 py-2'

export function ResultHead({
  title,
  version,
  universeN,
  resultN,
  diff,
  chips,
  focusNote,
  onClearFocus,
  model,
  onModel,
  wOpen,
  onToggleW,
  weights,
  onWeights,
  source,
  versions,
  cur,
  countOf,
  onStand,
}: {
  title: string
  version: string
  universeN: number
  resultN: number
  diff: string
  chips: readonly FocusChip[]
  focusNote: string
  onClearFocus: () => void
  model: RankModel
  onModel: (m: RankModel) => void
  wOpen: boolean
  onToggleW: () => void
  weights: WeightSet
  onWeights: (w: WeightSet) => void
  source: string
  versions: readonly ScreenVersion[]
  cur: number
  countOf: (i: number) => number
  onStand: (i: number) => void
}) {
  const shown = versions.length > 6 ? versions.slice(versions.length - 6) : versions
  const wLabel = `${model === 'none' ? 'Sort' : model === 'radar' ? 'Factors' : 'Weights'} ${wOpen ? '▴' : '▾'}`
  return (
    <>
      <header className="flex flex-wrap items-baseline gap-2 border-b border-foreground/[0.06] px-3 py-2">
        <span data-sr-tb="label">Result</span>
        <span className="text-dense-body font-semibold">{title}</span>
        <span className="ml-auto text-dense-meta text-muted-foreground">click a row for why · j k walk · esc</span>
      </header>
      <div className="grid border-b border-foreground/[0.06] [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
        <div
          className={cn(CELL, 'border-r border-foreground/[0.06]')}
          title="The screen in this session: a criteria version. Every change to the criteria is a new version whose parent is the one you stood on."
        >
          <span className="flex items-baseline gap-2">
            <span data-sr-tb="label">Screen</span>
            <span className="text-dense-caption text-muted-foreground">what passes · versioned</span>
          </span>
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-mono text-dense-meta font-bold text-primary">{version}</span>
            <span className="font-mono text-dense-meta text-foreground">
              {universeN.toLocaleString('en-US')} → {resultN.toLocaleString('en-US')}
            </span>
            <span className="font-mono text-dense-caption text-[var(--sk-mute2)]">{diff}</span>
          </span>
        </div>
        <div className={cn(CELL, 'border-r border-foreground/[0.06]')}>
          <span className="flex items-baseline gap-2">
            <span data-sr-tb="label">Focus</span>
            <span className="text-dense-caption text-muted-foreground">what you’re looking at · not versioned</span>
            {chips.length ? (
              <button type="button" onClick={onClearFocus} className="ml-auto text-dense-meta text-primary hover:underline">
                Clear
              </button>
            ) : null}
          </span>
          {chips.length ? (
            <span className="flex flex-wrap items-center gap-1">
              {chips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={c.clear}
                  title="Focus · click to remove"
                  className="mat-tag inline-flex h-[22px] items-center gap-1 border !border-primary bg-primary/15 text-dense-meta"
                >
                  {c.label} <span className="text-muted-foreground">×</span>
                </button>
              ))}
              <span className="font-mono text-dense-caption text-muted-foreground">{focusNote}</span>
            </span>
          ) : (
            <span className="text-pretty text-dense-meta text-[var(--sk-mute2)]">
              None · every name that passes. A funnel step, a lineage node or a stage’s −N narrows it.
            </span>
          )}
        </div>
        <div className={CELL}>
          <span className="flex items-baseline gap-2">
            <span data-sr-tb="label">Rank</span>
            <span className="text-dense-caption text-muted-foreground">orders, never filters · same as the cards’ rank by</span>
          </span>
          <span className="flex flex-wrap items-center gap-2.5">
            <SegmentControl options={RANK_OPTIONS} value={model} onChange={(v) => onModel(v as RankModel)} size="xs" ariaLabel="Rank by" />
            <button type="button" onClick={onToggleW} aria-expanded={wOpen} className="text-dense-meta text-primary hover:underline">
              {wLabel}
            </button>
          </span>
        </div>
      </div>
      {wOpen ? <RankDrawer model={model} weights={weights} onWeights={onWeights} source={source} /> : null}
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5 border-b border-foreground/[0.06] px-3 py-1.5">
        <span data-sr-tb="label" className="mr-1">
          Versions
        </span>
        {shown.map((v, k) => {
          const i = versions.indexOf(v)
          const n = countOf(i)
          const d = v.parent >= 0 ? n - countOf(v.parent) : 0
          return (
            <span key={v.v} className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => onStand(i)}
                title={`${v.why} · ${v.at}${v.parent >= 0 && v.parent !== i - 1 ? ` · branched from v${versions[v.parent].v}` : ''} · click to stand here; the next change branches from it`}
                className={cn(
                  'inline-flex h-5 items-baseline gap-1 rounded-md border px-2 font-mono text-dense-caption',
                  i === cur ? 'border-primary bg-primary/15 text-foreground' : 'border-transparent bg-foreground/[0.06] text-[var(--sk-soft)]',
                )}
              >
                v{v.v}
                <span className="text-muted-foreground">{n || '…'}</span>
                {v.parent >= 0 ? (
                  <span className={d < 0 ? 'text-destructive' : d > 0 ? 'text-[var(--sk-state-green)]' : 'text-muted-foreground'}>
                    {d === 0 ? '±0' : `${d > 0 ? '+' : '−'}${Math.abs(d)}`}
                  </span>
                ) : null}
              </button>
              {k < shown.length - 1 ? <span className="text-dense-caption text-[var(--sk-faint)]">→</span> : null}
            </span>
          )
        })}
        <span className="ml-auto inline-flex items-baseline gap-2.5">
          <Link to="/research/lab/stocks?tab=screens" className="text-dense-meta text-primary hover:underline" title="Saved screens and provenance live on the Method face">
            Explain · lineage ⧉
          </Link>
          <span
            className="font-mono text-dense-caption text-muted-foreground"
            title="Not linked: these versions live in this tab. The screen store keeps saved screens, not their versions, so no Journal node exists for one."
          >
            Journal →
          </span>
        </span>
      </div>
    </>
  )
}
