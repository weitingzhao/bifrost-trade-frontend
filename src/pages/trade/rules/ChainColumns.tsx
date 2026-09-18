/**
 * The four columns, and the panel that opens under whatever is picked.
 *
 * Dimming is the whole interaction: with nothing selected every card reads at
 * full strength, and with something selected the cards outside its lineage drop
 * back. A card that is *not* lit is the answer to "what is this connected to",
 * so the dim has to be readable rather than invisible.
 */
import { cn } from '@/lib/utils'
import { DenseTag } from '@/components/data-display'
import { positionsUi } from '@/components/positions/positionsUi'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtUsd } from '@/utils/positions'
import { fmtIsoDateToken } from '@/lib/format'
import type { ChainCard, ChainColumn, ChainDetail, ChainSelection } from './rulesChain'

/** Each column caps at this many cards before it offers the rest. */
export const COLUMN_CAP = 8

export function ChainColumnList({
  column,
  expanded,
  onExpand,
  onPick,
}: {
  column: ChainColumn
  expanded: boolean
  onExpand: () => void
  onPick: (sel: ChainSelection) => void
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
        <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>{column.count}</span>
      </header>
      <div className="flex max-h-[60vh] min-w-0 flex-col gap-2 overflow-y-auto pr-0.5">
        {shown.length === 0 ? (
          <p className="m-0 rounded-md border border-border bg-[var(--sk-raised)] px-2.5 py-2 text-dense-meta text-muted-foreground">
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
  onPick,
}: {
  detail: ChainDetail
  onPick: (sel: ChainSelection) => void
}) {
  return (
    <section className={cn(positionsUi.panel, 'border-[var(--sk-line2)]')} aria-label="Selected">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>{detail.kind}</span>
        <span className={positionsUi.panelTitle}>{detail.title}</span>
        <span className="min-w-0 text-dense-meta text-muted-foreground">{detail.lineage}</span>
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
      {detail.rows.length > 0 ? (
        // A structure can carry the whole book's history — capped and scrolled
        // for the same reason the columns are.
        <div className="max-h-[22rem] overflow-auto border-t border-border">
          <table className="w-full min-w-[42rem] border-collapse">
            <thead>
              <tr>
                <th className={cn(positionsUi.th, 'text-left')}>Instance</th>
                <th className={cn(positionsUi.th, 'text-left')}>Symbol</th>
                <th className={cn(positionsUi.th, 'text-left')}>Structure</th>
                <th className={cn(positionsUi.th, 'text-left w-[7rem]')}>Opened</th>
                <th className={cn(positionsUi.th, 'w-[5rem]')}>Fills</th>
                <th className={cn(positionsUi.th, 'w-[8rem]')}>Realised</th>
                <th className={cn(positionsUi.th, 'text-left w-[6rem]')}>State</th>
              </tr>
            </thead>
            <tbody>
              {detail.rows.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer hover:[&>td]:bg-[var(--sk-raised2)]"
                  onClick={() => onPick({ kind: 'instance', id: r.id })}
                >
                  <td className={cn(positionsUi.td, 'text-left')}>{r.label}</td>
                  <td className={cn(positionsUi.td, 'text-left font-semibold text-foreground')}>{r.symbolish}</td>
                  <td className={cn(positionsUi.td, 'text-left font-sans text-secondary-foreground')}>
                    {r.structureName}
                  </td>
                  <td className={cn(positionsUi.td, 'text-left text-muted-foreground')}>
                    {r.openedOn ? fmtIsoDateToken(r.openedOn) : '—'}
                  </td>
                  <td className={positionsUi.td}>{r.fills}</td>
                  <td
                    className={cn(
                      positionsUi.td,
                      r.realised == null ? 'text-muted-foreground' : pnlColorClass(r.realised),
                    )}
                  >
                    {r.realised == null ? 'open' : fmtUsd(r.realised, true)}
                  </td>
                  <td className={cn(positionsUi.td, 'text-left')}>
                    <DenseTag variant={r.closed ? 'neutral' : 'success'} size="cell">
                      {r.closed ? 'closed' : 'open'}
                    </DenseTag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
