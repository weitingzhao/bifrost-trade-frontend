/**
 * Screen (Rev .121 #1, #4; .131 #6–#8): Start from = presets (condition sets,
 * not models) and My screens; a search that adds a condition; the stages
 * (`StageRow`). Stages are AND; chips in a stage are OR unless the stage has a
 * min or reads "all selected". Every change is a new version. The panel
 * collapses to a 38px strip so the table can take the row.
 */
import { useState } from 'react'
import { stageActive, type ScreenState, type Stage, type StageCount } from './stockScreenModel'
import { chipMissing } from './stockScreenStages'
import { ScreenChip, StageRow } from './StageRow'
import type { StartChoice } from './stockScreenView'

export function ScreenPanel({
  title,
  poolN,
  resultN,
  nOn,
  onClear,
  starts,
  startId,
  savedNote,
  stages,
  counts,
  screen,
  chipCountOf,
  pending,
  onChip,
  onMin,
  collapsed,
  onToggle,
  hovered,
  onHover,
  cutIdx,
  onCut,
  focusCounts,
  onToCards,
}: {
  title: string
  poolN: number
  resultN: number
  nOn: number
  onClear: () => void
  starts: readonly StartChoice[]
  startId: string | null
  /** What My screens holds, or why it is empty. */
  savedNote: string | null
  stages: readonly Stage[]
  counts: readonly StageCount[]
  screen: ScreenState
  /** A chip's count in the universe; a server-set chip not yet loaded reads its tier's own count. */
  chipCountOf: (id: string) => { n: number | null; where: string; noReading?: boolean }
  pending: boolean
  onChip: (id: string, label: string) => void
  onMin: (stageId: string, next: number, label: string) => void
  collapsed: boolean
  onToggle: () => void
  hovered: number | null
  onHover: (i: number | null) => void
  /** The stage whose −N focuses the list, or null. */
  cutIdx: number | null
  onCut: (i: number) => void
  /** A funnel / lineage focus counted through each stage, or null. */
  focusCounts: readonly StageCount[] | null
  onToCards: () => void
}) {
  const [openSt, setOpenSt] = useState<Record<string, boolean>>({})
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const matches = needle
    ? stages
        .flatMap((st) =>
          st.chips
            .filter((c) => !screen.on[c.id] && !chipMissing(st.id, c.id))
            .filter((c) => c.label.toLowerCase().includes(needle) || c.id.includes(needle.replace(/\s+/g, '_')))
            .map((c) => ({ st, c })),
        )
        .slice(0, 8)
    : []
  if (collapsed) {
    return (
      <section className="mat-card w-[38px] flex-none self-stretch overflow-hidden border">
        <button
          type="button"
          onClick={onToggle}
          title="Show the screen"
          className="flex h-full min-h-[260px] w-full cursor-pointer flex-col items-center gap-2.5 py-2.5"
        >
          <span className="text-dense-body text-[var(--sk-soft)]">›</span>
          <span className="whitespace-nowrap text-dense-meta text-[var(--sk-soft)] [writing-mode:vertical-rl]">
            Screen · {title} ·{' '}
            <span className="font-mono">
              {poolN.toLocaleString('en-US')} → {resultN.toLocaleString('en-US')}
            </span>
          </span>
        </button>
      </section>
    )
  }
  return (
    <aside className="flex min-w-[290px] max-w-full flex-[0_1_330px] flex-col gap-2.5">
    <section className="mat-card min-w-0 overflow-hidden border">
      <header className="flex flex-wrap items-baseline gap-2 border-b border-foreground/[0.06] px-3 py-2">
        <button
          type="button"
          onClick={onToggle}
          title="Collapse the screen · the table takes the full row"
          aria-label="Collapse the screen"
          className="px-0.5 text-dense-body leading-none text-[var(--sk-mute2)] hover:text-foreground"
        >
          ‹
        </button>
        <span data-sr-tb="label">Screen</span>
        <span className="min-w-0 truncate text-dense-body font-semibold">{title}</span>
        <span className="font-mono text-dense-label text-muted-foreground">
          {poolN.toLocaleString('en-US')} → <span className="text-foreground">{resultN.toLocaleString('en-US')}</span>
        </span>
        {nOn > 0 ? (
          <button type="button" onClick={onClear} className="ml-auto whitespace-nowrap text-dense-meta text-primary hover:underline">
            Clear {nOn}
          </button>
        ) : null}
      </header>
      <div className="flex flex-col gap-1.5 px-3 pb-1 pt-2">
        <span className="text-dense-meta text-muted-foreground">Start from · presets are condition sets, not models</span>
        <div className="flex flex-wrap gap-1">
          {starts.map((p) => (
            <ScreenChip
              key={p.id}
              on={startId === p.id}
              label={p.label}
              n={p.k}
              title={p.missing ? `${p.title} — not offered: ${p.missing}` : p.title}
              missing={!!p.missing}
              onClick={p.apply}
            />
          ))}
        </div>
        {savedNote ? <span className="text-dense-caption text-muted-foreground">{savedNote}</span> : null}
      </div>
      <div className="relative px-3 pb-2 pt-1.5">
        <span className="pointer-events-none absolute left-5 top-3 text-dense-body text-muted-foreground">⌕</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Add a condition: sma, eps, 8-k, iv rank…"
          aria-label="Add a condition"
          className="mat-field h-7 w-full border pl-6 pr-2 text-dense-label outline-none"
        />
        {matches.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {matches.map(({ st, c }) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChip(c.id, c.label)
                  setQ('')
                }}
                className="mat-tag inline-flex h-[22px] items-center gap-1.5 text-dense-meta text-[var(--sk-soft)] hover:text-foreground"
              >
                <span>{c.label}</span>
                <span className="font-mono text-dense-caption text-muted-foreground">{chipCountOf(c.id).n ?? '—'}</span>
                <span className="text-muted-foreground">{st.title}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {stages.map((st, i) => (
        <StageRow
          key={st.id}
          index={i}
          stage={st}
          count={counts[i]}
          total={stages.length}
          poolN={poolN}
          screen={screen}
          open={stageActive(st, screen) || !!openSt[st.id]}
          onOpen={() => {
            const open = stageActive(st, screen) || !!openSt[st.id]
            setOpenSt((o) => ({ ...o, [st.id]: !open }))
          }}
          pending={pending}
          hovered={hovered === i}
          onHover={(on) => onHover(on ? i : hovered === i ? null : hovered)}
          cutOn={cutIdx === i}
          onCut={() => onCut(i)}
          focusCount={focusCounts ? focusCounts[i] : null}
          onToCards={onToCards}
          chipCountOf={chipCountOf}
          onChip={onChip}
          onMin={onMin}
        />
      ))}
      <div className="text-pretty border-t border-foreground/[0.06] px-3 py-2 text-dense-meta leading-normal text-muted-foreground">
        Stages are AND. Chips in a stage are OR, unless it has a min (at least N of these) or reads “all selected”. Bars are
        before → after each stage; click −N to list the names a stage cut, hover a stage to see it on the lineage. Stage 1
        follows the model cards above. Every change is a new version of the screen.
      </div>
    </section>
    </aside>
  )
}
