/**
 * The record under the lineage bar (design Rev .101) — one frame for every
 * kind of focus: a header with the thing's own actions, a reading strip, and
 * whichever of the three bodies the kind has (entry conditions · the scope
 * board · the rules table). The instance list follows inside the same frame.
 *
 * Presentational only: `rulesRecordModel.ts` decides what each kind shows.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { PositionsStat } from '@/components/positions/PositionsStat'
import { positionsUi } from '@/components/positions/positionsUi'
import { cn } from '@/lib/utils'
import type { BoardSort } from './rulesFocus'
import type { RecordModel } from './rulesRecordModel'

export function RulesRecord({
  model,
  boardSort,
  onBoardSort,
  children,
}: {
  model: RecordModel
  boardSort: BoardSort
  onBoardSort: (v: BoardSort) => void
  children?: ReactNode
}) {
  const m = model
  return (
    <section aria-label="Record" className="min-w-0 mat-card">
      <header className="flex flex-wrap items-baseline gap-2 px-3.5 pt-3 pb-2">
        <span className="text-dense-micro font-semibold text-muted-foreground">{m.kind}</span>
        <span className={cn('type-section font-semibold', m.titleClass)}>{m.title}</span>
        {m.tag ? (
          <DenseTag variant={m.tag.variant} size="cell">
            {m.tag.label}
          </DenseTag>
        ) : null}
        <span className="text-dense-label text-[var(--sk-mute2)]">{m.sub}</span>
        <span className="ml-auto flex flex-none flex-wrap gap-1.5">
          {m.actions.map((a) =>
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

      {m.step ? (
        <div className="flex flex-wrap items-center gap-2.5 border-t border-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] px-3.5 py-1.5 text-dense-label">
          <button
            type="button"
            className={positionsUi.btn}
            onClick={m.step.prev?.go}
            disabled={!m.step.prev}
            title="Previous row in the list you came from"
          >
            ‹ {m.step.prev?.label ?? '—'}
          </button>
          <span className="text-[var(--sk-mute2)]">
            <span className="font-mono text-foreground">{m.step.pos}</span> in {m.step.from}
          </span>
          <button
            type="button"
            className={positionsUi.btn}
            onClick={m.step.next?.go}
            disabled={!m.step.next}
            title="Next row in the list you came from"
          >
            {m.step.next?.label ?? '—'} ›
          </button>
          <span className="ml-auto text-dense-micro text-muted-foreground">[ and ] step · stepping does not add to Back</span>
        </div>
      ) : null}

      {m.stats.length ? (
        <div data-sr-kpi="strip-inset" className="border-t border-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)]">
          {m.stats.map((f) => (
            <PositionsStat key={f.k} cap={f.k} value={f.v} ink={f.ink} sub={<span className={f.noteClass}>{f.note}</span>} />
          ))}
        </div>
      ) : null}

      {m.conds ? (
        <div className="flex flex-wrap items-baseline gap-2 border-t border-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] px-3.5 py-2 text-dense-label">
          <span className="text-dense-micro font-semibold text-muted-foreground">Enters when</span>
          <span className={cn('font-mono', m.conds.recorded ? 'text-[var(--sk-soft)]' : 'text-muted-foreground')}>
            {m.conds.text}
          </span>
          <span className="text-muted-foreground">{m.conds.note}</span>
        </div>
      ) : null}

      {m.board ? (
        <div className="flex flex-col gap-2 border-t border-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] px-3.5 py-2.5">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="text-dense-body font-semibold">Scope</span>
            <span className="font-mono text-dense-micro text-muted-foreground">{m.board.count}</span>
            <span className="text-dense-micro text-muted-foreground">{m.board.hint}</span>
            <span className="ml-auto flex items-center gap-2">
              <span className="text-dense-micro font-semibold text-muted-foreground">Sort</span>
              <SegmentControl
                size="xs"
                ariaLabel="Sort symbols"
                value={boardSort}
                onChange={(v) => onBoardSort(v as BoardSort)}
                options={[
                  { value: 'pnl', label: 'Realised' },
                  { value: 'count', label: 'Count' },
                  { value: 'az', label: 'A–Z' },
                ]}
              />
            </span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-1.5">
            {m.board.tiles.map((t) => (
              <button
                key={t.sym}
                type="button"
                onClick={t.go}
                title={t.title}
                aria-pressed={t.on}
                className={cn(
                  // Rev .142: a clickable tile is group material; the picked one keeps its accent outline.
                  'flex min-w-0 flex-col gap-1 rounded-[var(--mat-card-radius)] px-2.5 py-2 text-left transition-opacity',
                  t.on
                    ? 'bg-[color-mix(in_srgb,var(--sk-accent)_14%,transparent)] shadow-[inset_0_0_0_1px_var(--sk-accent)]'
                    : 'bg-[var(--mat-card-fill)] hover:bg-[var(--mat-card-fill-hover)]',
                  t.dim && 'opacity-60',
                )}
              >
                <span className="flex min-w-0 items-baseline gap-1.5">
                  <span className="font-mono text-dense-body font-bold text-[var(--sk-ticker)]">{t.sym}</span>
                  <span className={cn('text-dense-micro font-semibold whitespace-nowrap', t.flagClass)}>{t.flag}</span>
                  <span className={cn('ml-auto font-mono text-dense-label tabular-nums', t.pnlClass)}>{t.pnl}</span>
                </span>
                <span className="flex text-dense-micro text-muted-foreground">
                  <span>{t.meta}</span>
                  <span className="ml-auto">{t.win}</span>
                </span>
                <span className="relative h-[3px] overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)]">
                  <span className={cn('absolute inset-y-0 left-0', t.barClass)} style={{ width: t.bar }} />
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {m.rules ? (
        <div className="border-t border-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)]">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5 px-3.5 pt-2.5 pb-1">
            <span className="text-dense-body font-semibold">{m.rules.title}</span>
            <span className="text-dense-micro text-muted-foreground">{m.rules.note}</span>
          </div>
          <div className="overflow-x-auto">
            <table data-sr-table="" className="w-full">
              <thead>
                <tr>
                  <th>Opportunity</th>
                  <th>Structure</th>
                  <th>Allocation · gate</th>
                  <th data-sr-col="num">{m.rules.instHead}</th>
                  <th data-sr-col="num">Open</th>
                  <th data-sr-col="num">Realised</th>
                </tr>
              </thead>
              <tbody>
                {m.rules.rows.map((r) => (
                  <tr
                    key={r.id}
                    tabIndex={0}
                    onClick={r.go}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') r.go()
                    }}
                    title={r.title}
                    // Hover is the list scope's; the picked opportunity is an
                    // accent 14% row state (Trade Rules.dc.html Rev .154 `--sr-row`).
                    className={cn(
                      'cursor-pointer',
                      r.selected && '[--sr-row:color-mix(in_srgb,var(--sk-accent)_14%,transparent)]',
                    )}
                  >
                    <td className="font-semibold">{r.name}</td>
                    <td className="text-[var(--sk-mute2)]">{r.structure}</td>
                    <td className={r.allocWarn ? 'text-warning' : 'text-[var(--sk-soft)]'}>{r.alloc}</td>
                    <td data-sr-col="num">{r.n}</td>
                    <td data-sr-col="num">{r.open}</td>
                    <td data-sr-col="num" className={r.realisedClass}>
                      {r.realised}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {children}
    </section>
  )
}
