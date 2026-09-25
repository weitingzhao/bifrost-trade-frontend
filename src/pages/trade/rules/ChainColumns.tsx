/**
 * The four columns, and the panel that opens under whatever is picked.
 *
 * Dimming is the whole interaction: with nothing selected every card reads at
 * full strength, and with something selected the cards outside its lineage drop
 * back. A card that is *not* lit is the answer to "what is this connected to",
 * so the dim has to be readable rather than invisible.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { DenseTag } from '@/components/data-display'
import { positionsUi } from '@/components/positions/positionsUi'
import type { ChainCard, ChainColumn, ChainDetail, ChainSelection } from './rulesChain'

/** Each column caps at this many cards before it offers the rest. */
export const COLUMN_CAP = 8

export function ChainColumnList({
  column,
  expanded,
  onExpand,
  onPick,
  onNew,
  onPickAll,
}: {
  column: ChainColumn
  expanded: boolean
  onExpand: () => void
  onPick: (sel: ChainSelection) => void
  /** Opens this column's edit sheet on a new one. */
  onNew: () => void
  /** Given, the column's count picks the whole column rather than a card. */
  onPickAll?: () => void
}) {
  const hidden = expanded ? 0 : Math.max(0, column.cards.length - COLUMN_CAP)
  const shown = expanded ? column.cards : column.cards.slice(0, COLUMN_CAP)

  return (
    <section className="flex min-w-0 flex-col gap-2" aria-label={column.title}>
      <header className="flex flex-wrap items-baseline gap-2 px-0.5">
        <span className="text-dense-caption font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {column.step}
        </span>
        <span className="text-dense-body font-semibold text-foreground">{column.title}</span>
        {onPickAll ? (
          // The count is the way into the whole column — every instance in the
          // book, which is what Strategy › Instances was and where its address
          // now lands.
          <button
            type="button"
            className={cn(positionsUi.mono, positionsUi.link, 'text-dense-meta')}
            onClick={onPickAll}
            title="All of them, whatever the chain is showing"
          >
            {column.count}
          </button>
        ) : (
          <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>{column.count}</span>
        )}
        <button type="button" className={cn(positionsUi.link, 'ml-auto')} onClick={onNew}>
          ＋ New
        </button>
      </header>
      <div className="flex max-h-[60vh] min-w-0 flex-col gap-2 overflow-y-auto pr-0.5">
        {shown.length === 0 ? (
          <p className="m-0 border px-2.5 py-2 text-dense-meta text-muted-foreground mat-card">
            Nothing here.
          </p>
        ) : null}
        {shown.map((card) => (
          <Card key={`${card.kind}-${card.id}`} card={card} onPick={onPick} />
        ))}
        {hidden > 0 ? (
          <button type="button" className={cn(positionsUi.link, 'self-start')} onClick={onExpand}>
            + {hidden} more
          </button>
        ) : null}
      </div>
    </section>
  )
}

function Card({ card, onPick }: { card: ChainCard; onPick: (sel: ChainSelection) => void }) {
  return (
    <button
      type="button"
      aria-pressed={card.selected}
      onClick={() => onPick({ kind: card.kind, id: card.id })}
      className={cn(
        'min-w-0 cursor-pointer rounded-md border px-2.5 py-2 text-left transition-opacity',
        card.selected ? 'border-primary bg-primary/5' : 'border-border bg-[var(--sk-raised)]',
        card.lit ? 'opacity-100' : 'opacity-40',
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 truncate text-dense-body font-semibold text-foreground">{card.title}</span>
        <span className="ml-auto flex-none">
          <DenseTag variant={card.tagVariant} size="cell">
            {card.tag}
          </DenseTag>
        </span>
      </span>
      <span className="block pt-0.5 text-dense-meta leading-normal text-muted-foreground text-pretty">{card.sub}</span>
      <span className={cn(positionsUi.mono, 'flex flex-wrap gap-x-2.5 pt-1 text-dense-caption text-muted-foreground')}>
        {card.facts.map((f) => (
          <span key={f}>{f}</span>
        ))}
      </span>
    </button>
  )
}

const TONE: Record<'success' | 'warning' | 'danger', string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

export function ChainDetailPanel({
  detail,
  actions,
  rows,
}: {
  detail: ChainDetail
  /**
   * What this kind of thing can have done to it — the sheets behind the card,
   * plus the odd link to the page that settles something about it.
   */
  actions: { label: string; onClick?: () => void; to?: string; disabled?: boolean; title?: string }[]
  /**
   * What the picked thing is running — the instance list, filters and all.
   * Passed in rather than drawn here: it is the same list Strategy › Instances
   * showed, and one list read twice is the point.
   */
  rows?: ReactNode
}) {
  return (
    <section className={cn(positionsUi.panel, 'border-[var(--sk-line2)]')} aria-label="Selected">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>{detail.kind}</span>
        <span className={positionsUi.panelTitle}>{detail.title}</span>
        <span className="min-w-0 text-dense-meta text-muted-foreground">{detail.lineage}</span>
        <span className="ml-auto flex flex-wrap gap-1.5">
          {actions.map((a) =>
            a.to ? (
              <Link key={a.label} to={a.to} className={cn(positionsUi.btn, 'no-underline')} title={a.title}>
                {a.label}
              </Link>
            ) : (
              <button
                key={a.label}
                type="button"
                className={cn(positionsUi.btn, a.disabled && 'cursor-not-allowed opacity-50')}
                disabled={a.disabled}
                title={a.title}
                onClick={a.onClick}
              >
                {a.label}
              </button>
            ),
          )}
        </span>
      </header>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-x-3.5 gap-y-2 px-3 py-2.5">
        {detail.facts.map((f) => (
          <div key={f.k} className="min-w-0">
            <span className={cn(positionsUi.cap, 'block')}>{f.k}</span>
            <span
              className={cn(
                positionsUi.mono,
                'block pt-0.5 text-sm font-semibold',
                f.tone ? TONE[f.tone] : 'text-foreground',
              )}
            >
              {f.v}
            </span>
            <span className="block pt-0.5 text-dense-meta leading-normal text-muted-foreground text-pretty">
              {f.note}
            </span>
          </div>
        ))}
      </div>
      {rows}
    </section>
  )
}
