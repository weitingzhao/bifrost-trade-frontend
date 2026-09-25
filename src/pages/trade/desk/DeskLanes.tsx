/**
 * The three lanes, and the strip above them.
 *
 * Rendering only — what goes in a lane is decided in `deskModel.ts`, and the
 * one write on this page lives in `HedgeMenu.tsx`.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DenseTag } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { cn } from '@/lib/utils'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import { withSymbolParam } from '@/lib/symbolLink'
import type { DeskItem, DeskLane, DeskTone } from './deskModel'

const DOT: Record<DeskTone, string> = {
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-primary',
  success: 'bg-success',
  neutral: 'bg-muted-foreground',
}

export interface StripCell {
  label: string
  value: string
  note: ReactNode
  lamp: 'green' | 'yellow' | 'red' | 'gray'
  /** Marked rather than dropped: the reading does not exist on this side. */
  marker?: string
  /** The hedge menu, on the cell the design puts it on. */
  slot?: ReactNode
}

export function DeskStrip({ cells }: { cells: StripCell[] }) {
  return (
    <div className="flex flex-wrap items-stretch overflow-visible border mat-card">
      {cells.map((c) => (
        <div
          key={c.label}
          className="relative flex min-w-0 flex-[1_1_13.75rem] flex-wrap items-start gap-x-2.5 gap-y-1.5 border-r border-border/60 px-3 py-2.25 last:border-r-0"
        >
          <span className="flex-none pt-1">
            <StatusLamp lamp={c.lamp} variant="dot" />
          </span>
          <span className="flex min-w-0 flex-[1_1_10rem] flex-col">
            <span className={positionsUi.cap}>{c.label}</span>
            <span
              className={cn(
                positionsUi.mono,
                'mt-0.5 truncate text-base font-semibold leading-tight',
                c.marker ? 'text-muted-foreground' : 'text-foreground',
              )}
            >
              {c.value}
            </span>
            <span className="mt-px text-dense-meta leading-normal text-muted-foreground text-pretty">{c.note}</span>
            {c.marker ? (
              <span className="mt-1 flex">
                <DenseTag variant="warning" size="cell">
                  {c.marker}
                </DenseTag>
              </span>
            ) : null}
          </span>
          {c.slot ? <span className="ml-auto flex-none self-start">{c.slot}</span> : null}
        </div>
      ))}
    </div>
  )
}

function ItemActions({ item, onAction }: { item: DeskItem; onAction: (item: DeskItem, index: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1">
      {item.tags.map((t) => (
        <DenseTag key={t.label} variant={t.tone === 'neutral' ? 'neutral' : t.tone} size="cell">
          {t.label}
        </DenseTag>
      ))}
      {item.actions.map((a, i) =>
        a.to ? (
          <Link key={a.label} to={a.to} className={cn(positionsUi.btn, 'no-underline')}>
            {a.label}
          </Link>
        ) : (
          <button key={a.label} type="button" className={positionsUi.btn} onClick={() => onAction(item, i)}>
            {a.label}
          </button>
        ),
      )}
    </div>
  )
}

export function DeskLaneList({
  lane,
  onAction,
}: {
  lane: DeskLane
  onAction: (item: DeskItem, index: number) => void
}) {
  return (
    <section className={cn(positionsUi.panel, 'min-w-0')} aria-label={lane.title}>
      <header className={positionsUi.panelHead}>
        <span className="text-dense-caption font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {lane.step}
        </span>
        <span className={positionsUi.panelTitle}>{lane.title}</span>
        <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>{lane.items.length}</span>
        <span className="ml-auto whitespace-nowrap text-dense-meta text-muted-foreground">{lane.from}</span>
      </header>
      {lane.items.length === 0 ? (
        // An empty lane is a reading, not a blank panel.
        <p className="m-0 px-3 py-3 text-dense-meta leading-normal text-muted-foreground text-pretty">
          {lane.emptyRead}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {lane.items.map((it) => (
            <li key={it.key} className="flex gap-2 border-b border-border/55 px-3 py-2 last:border-b-0">
              <span className={cn('mt-1.5 h-2 w-2 flex-none rounded-full', DOT[it.tone])} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-baseline gap-2">
                  {/* The name is its own destination where the row is about
                      one. Where the label stands for several, or is an
                      import's own word, it stays plain and says so rather
                      than opening an approximate page. */}
                  {it.name ? (
                    <Link
                      to={withSymbolParam(SYMBOL_PATH, it.name)}
                      className={cn(
                        positionsUi.mono,
                        'flex-none text-dense-body font-bold text-foreground hover:underline',
                      )}
                      title={`Open ${it.name} on Symbol`}
                    >
                      {it.symbol}
                    </Link>
                  ) : (
                    <span
                      className={cn(positionsUi.mono, 'flex-none text-dense-body font-bold text-foreground')}
                      title="Not one name — nothing to open."
                    >
                      {it.symbol}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-dense-body leading-normal text-secondary-foreground">
                    {it.title}
                  </span>
                  <span className={cn(positionsUi.mono, 'ml-auto flex-none text-dense-meta text-muted-foreground')}>
                    {it.when}
                  </span>
                </div>
                <p className="m-0 text-dense-meta leading-normal text-muted-foreground text-pretty">{it.sub}</p>
                <ItemActions item={it} onAction={onAction} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
