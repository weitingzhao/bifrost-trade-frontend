/**
 * One Screen stage (Rev .131 #7–#8). The row reads before → after as a bar
 * (track = the names reaching it against the universe, fill = the share it
 * keeps, darker down the funnel), the after count, and a `−N` button that
 * focuses the list on the names this stage cut. Under a funnel or lineage
 * focus, a second line counts that focus through the stage. Hovering the row
 * shows the stage on the lineage.
 *
 * Stage 1, Model agreement, is read-only here: the model cards set it, and a
 * click scrolls back to them. With two or more models picked, its "at least
 * N" stays here — the cards carry no such control.
 */
import { FilterChip } from '@bifrost/ui'
import { cn } from '@/lib/utils'
import { pineOf, stageActive, type PineStageSettings, type ScreenState, type Stage, type StageCount } from './stockScreenModel'
import { PineStageBody } from './PineStageBody'
import { chipMissing } from './stockScreenStages'

/**
 * One condition chip — the DS `FilterChip` (Rev .157 §17.10): on = ink 15%,
 * never the accent; `dashed` for a narrative (8-K) condition, drawn on and
 * off; `missing` when nothing in range can evaluate it — faint, not
 * clickable, the reason in `title`. Pine signal chips are the same chip.
 */
export function ScreenChip({
  on,
  label,
  n,
  title,
  missing,
  narrative,
  onClick,
}: {
  on: boolean
  label: string
  n: string
  title: string
  missing: boolean
  narrative?: boolean
  onClick: () => void
}) {
  return (
    <FilterChip
      pressed={on}
      onPressedChange={onClick}
      dashed={narrative}
      missing={missing}
      title={title}
      count={n}
      className="h-[22px] px-2 text-dense-meta"
    >
      {narrative ? <span className="font-mono text-dense-caption text-[var(--sk-mute2)]">8-K</span> : null}
      <span>{label}</span>
    </FilterChip>
  )
}

export function StageRow({
  index,
  stage,
  count,
  total,
  poolN,
  screen,
  open,
  onOpen,
  pending,
  hovered,
  onHover,
  cutOn,
  onCut,
  focusCount,
  onToCards,
  chipCountOf,
  onChip,
  onMin,
  onPine,
}: {
  index: number
  stage: Stage
  count: StageCount
  /** How many stages, for the bar's grey ramp. */
  total: number
  poolN: number
  screen: ScreenState
  open: boolean
  onOpen: () => void
  pending: boolean
  hovered: boolean
  onHover: (on: boolean) => void
  cutOn: boolean
  onCut: () => void
  /** A funnel / lineage focus counted through this stage, or null. */
  focusCount: StageCount | null
  onToCards: () => void
  chipCountOf: (id: string) => { n: number | null; where: string; noReading?: boolean }
  onChip: (id: string, label: string) => void
  onMin: (stageId: string, next: number, label: string) => void
  onPine: (next: PineStageSettings, why: string) => void
}) {
  const st = stage
  const agree = st.kind === 'agree'
  const active = stageActive(st, screen)
  const need = screen.mins[st.id] ?? 0
  const picked = st.chips.filter((c) => screen.on[c.id]).length
  const labels = st.chips.filter((c) => screen.on[c.id]).map((c) => c.label)
  if ((st.kind === 'min' || agree) && need > 0) labels.unshift(`≥ ${need} of ${st.max ?? st.chips.length}`)
  if (st.id === 'pine' && labels.length) {
    const p = pineOf(screen)
    labels.push(`within ${p.within}${labels.length > 1 ? ` · ${p.match}` : ''}`)
  }
  const summary = agree
    ? `${active ? `${labels.join(' · ')} · ` : ''}set by the cards above`
    : st.missing
      ? 'no store answers it'
      : active
        ? labels.join(' · ')
        : 'pass-through'
  const expanded = agree ? picked >= 2 : open
  const cut = count.before - count.after
  const PN = poolN || 1
  const barInk = `color-mix(in srgb, var(--sk-ink) ${Math.round(14 + (index / Math.max(1, total - 1)) * 30)}%, transparent)`
  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={cn('border-t border-foreground/[0.06] px-3 py-1.5', !active && 'opacity-80', hovered && 'bg-foreground/[0.04]')}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={agree ? onToCards : onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (agree) onToCards()
            else onOpen()
          }
        }}
        title={agree ? 'Set by the model cards above · click to go there' : (st.missing ?? (open ? '' : 'Open to add conditions'))}
        className="grid w-full cursor-pointer items-center gap-2 [grid-template-columns:14px_minmax(0,1fr)_52px_34px_36px]"
      >
        <span className="font-mono text-dense-caption text-muted-foreground">{index + 1}</span>
        <span className="flex min-w-0 items-baseline gap-1.5 overflow-hidden">
          <span className="whitespace-nowrap text-dense-label font-semibold">{st.title}</span>
          <span className="truncate text-dense-meta text-muted-foreground">{summary}</span>
        </span>
        <span className="flex h-1.5" title={`${count.before} → ${count.after}`}>
          <span className="flex h-full overflow-hidden rounded-sm bg-foreground/[0.06]" style={{ width: `${((count.before / PN) * 100).toFixed(1)}%` }}>
            <span className="h-full" style={{ width: `${(count.before ? (count.after / count.before) * 100 : 0).toFixed(1)}%`, background: barInk }} />
          </span>
        </span>
        <span
          className={cn(
            'text-right font-mono text-dense-meta',
            count.after === 0 ? 'text-destructive' : active ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {count.after}
          {pending && active ? '…' : ''}
        </span>
        <span className="flex justify-end">
          {cut > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onCut()
              }}
              title={cutOn ? 'Listed below · click to clear' : `List the ${cut} names this stage cut (${count.before} → ${count.after})`}
              className={cn(
                'h-[18px] whitespace-nowrap rounded-full px-1.5 font-mono text-dense-caption',
                cutOn ? 'bg-primary/15 text-primary ring-1 ring-inset ring-primary' : 'text-[var(--sk-mute2)] ring-1 ring-inset ring-foreground/15',
              )}
            >
              −{cut}
            </button>
          ) : null}
        </span>
      </div>
      {focusCount ? (
        <div className="pl-[22px] pt-0.5 font-mono text-dense-caption text-primary">
          focus {focusCount.before} → {focusCount.after}
        </div>
      ) : null}
      {expanded ? (
        <div className="flex flex-col gap-1.5 pb-0.5 pl-[22px] pt-1.5">
          <div className="flex items-center gap-1.5 text-dense-meta text-muted-foreground">
            <span>{st.mode}</span>
            {st.kind === 'min' || agree ? (
              <span className="ml-auto inline-flex items-center gap-1">
                min
                <button type="button" className="px-0.5 hover:text-foreground" aria-label={`${st.title} min down`} onClick={() => onMin(st.id, Math.max(0, need - 1), `${st.title} min −1`)}>
                  −
                </button>
                <span className="font-mono text-foreground">{need}</span>
                <button
                  type="button"
                  className="px-0.5 hover:text-foreground"
                  aria-label={`${st.title} min up`}
                  onClick={() => onMin(st.id, Math.min(agree ? picked : (st.max ?? st.chips.length), need + 1), `${st.title} min +1`)}
                >
                  ＋
                </button>
              </span>
            ) : null}
          </div>
          {st.missing ? <span className="text-dense-caption text-muted-foreground">{st.missing}</span> : null}
          {st.id === 'pine' ? (
            <PineStageBody stage={st} screen={screen} chipCountOf={chipCountOf} onChip={onChip} onPine={onPine} />
          ) : agree ? null : (
            <div className="flex flex-wrap gap-1">
              {st.chips.map((c) => {
                const cc = chipCountOf(c.id)
                const miss =
                  chipMissing(st.id, c.id) ??
                  (cc.noReading ? `${c.label} — no name in this universe has a reading for it` : null)
                const n = miss ? null : cc.n
                return (
                  <ScreenChip
                    key={c.id}
                    on={!!screen.on[c.id]}
                    label={c.label}
                    n={n == null ? '—' : String(n)}
                    narrative={!!c.narrative}
                    missing={!!miss}
                    title={
                      miss ??
                      [c.narrative ? `${c.narrative} · SEC 8-K by item number; never enters a model` : c.title, `${n ?? '—'} ${cc.where} pass`]
                        .filter(Boolean)
                        .join(' · ')
                    }
                    onClick={() => onChip(c.id, c.label)}
                  />
                )
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
