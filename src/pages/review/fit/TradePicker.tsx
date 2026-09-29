/**
 * Single trade's picker (design Rev .104): the toolbar reads ‹ the current
 * trade › and n of N; the middle button opens the closed-trade table —
 * filtered All · Won · Lost · Broke plan, searchable, grouped None · Symbol ·
 * Expiry with each group's count and net. [ and ] step anywhere on the page,
 * Esc closes the table. The model is `tradePickerModel`.
 */
import { useEffect, useMemo, useState } from 'react'
import { SegmentControl } from '@/components/data-display'
import { positionsUi } from '@/components/positions/positionsUi'
import { fmtIsoDateToken } from '@/lib/format'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtSignedUsd0 } from '@/utils/performanceReading'
import type { ReviewTrade } from '@/utils/reviewTrades'
import {
  OUTCOMES,
  filterTrades,
  groupTrades,
  outcomeCount,
  stepTrade,
  type PickGroup,
  type PickOutcome,
} from './tradePickerModel'

const NO_PLAN = 'No plan is linked to any position, so whether a trade broke its plan cannot be read.'

function TradeName({ t }: { t: ReviewTrade }) {
  return (
    <>
      {t.instanceId != null ? (
        <span className="font-mono font-bold text-[var(--sk-instance)]">#{t.instanceId}</span>
      ) : null}{' '}
      <span className="font-mono font-bold text-[var(--sk-ticker)]">{t.underlying}</span>
    </>
  )
}

export function TradePicker({
  trades,
  current,
  onPick,
}: {
  trades: readonly ReviewTrade[]
  current: ReviewTrade | null
  onPick: (t: ReviewTrade) => void
}) {
  const [open, setOpen] = useState(false)
  const [outcome, setOutcome] = useState<PickOutcome>('all')
  const [group, setGroup] = useState<PickGroup>('none')
  const [q, setQ] = useState('')
  const idx = current ? trades.findIndex((t) => t.contractKey === current.contractKey) : -1
  const rows = useMemo(() => filterTrades(trades, outcome, q), [trades, outcome, q])
  const groups = useMemo(() => groupTrades(rows, group), [rows, group])
  const step = (d: 1 | -1) => {
    const next = stepTrade(trades, current?.contractKey ?? null, d)
    if (next) onPick(next)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      if (el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '[' || e.key === ']') {
        const next = stepTrade(trades, current?.contractKey ?? null, e.key === ']' ? 1 : -1)
        if (next) {
          e.preventDefault()
          onPick(next)
        }
      } else if (e.key === 'Escape' && open) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [trades, current, onPick, open])

  if (trades.length === 0) return null
  return (
    <>
      <div data-sr-toolbar="" className="flex-wrap">
        <span data-sr-tb="label">Trade</span>
        <button type="button" className={cn(positionsUi.btn, 'w-6.5 justify-center px-0')} onClick={() => step(-1)} title="Previous instance ( [ )" aria-label="Previous instance">
          ‹
        </button>
        <button
          type="button"
          className={cn(positionsUi.btn, 'min-w-0 gap-2', open && 'bg-[color-mix(in_srgb,var(--sk-accent)_16%,transparent)]')}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {current ? (
            <>
              <TradeName t={current} />
              <span className="min-w-0 truncate text-[var(--sk-mute2)]">
                {current.label} ·{' '}
                {current.exitKind === 'open'
                  ? `opened ${current.openedOn ? fmtIsoDateToken(current.openedOn) : '—'}`
                  : `closed ${current.closedOn ? fmtIsoDateToken(current.closedOn) : '—'}`}
              </span>
              <span className={cn('font-mono', current.exitKind === 'open' ? 'text-[var(--color-unrealized)]' : pnlColorClass(current.realised))}>
                {current.exitKind === 'open' ? 'open' : fmtSignedUsd0(current.realised)}
              </span>
            </>
          ) : (
            'Pick a trade'
          )}
          <span className="text-muted-foreground">▾</span>
        </button>
        <button type="button" className={cn(positionsUi.btn, 'w-6.5 justify-center px-0')} onClick={() => step(1)} title="Next instance ( ] )" aria-label="Next instance">
          ›
        </button>
        <span data-sr-tb="meta" className="font-mono">
          {idx >= 0 ? `${idx + 1} of ${trades.length}` : `${trades.length}`}
        </span>
      </div>

      {open ? (
        <section className="overflow-hidden mat-card" aria-label="Instances">
          <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
            <span className={positionsUi.cap}>Instances</span>
            <SegmentControl
              size="sm"
              ariaLabel="Outcome"
              value={outcome}
              onChange={(v) => setOutcome(v as PickOutcome)}
              options={OUTCOMES.map((o) => {
                const n = outcomeCount(trades, o.key)
                return {
                  value: o.key,
                  label: (
                    <>
                      {o.label} <span className="font-mono text-muted-foreground">{n == null ? 'n/c' : n}</span>
                    </>
                  ),
                  title: n == null ? NO_PLAN : undefined,
                }
              })}
            />
            <span className="inline-flex items-center gap-1.5">
              <span className={positionsUi.cap}>Group</span>
              <SegmentControl
                size="sm"
                ariaLabel="Group by"
                value={group}
                onChange={(v) => setGroup(v as PickGroup)}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'sym', label: 'Symbol' },
                  { value: 'exp', label: 'Expiry' },
                ]}
              />
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Symbol, #, rule…"
              aria-label="Filter instances"
              className="h-6 w-44 mat-field px-2 text-dense-label"
            />
            <span className="ml-auto text-dense-meta text-muted-foreground">
              {rows.length === trades.length ? `${trades.length} · open first, then newest close` : `${rows.length} of ${trades.length}`}
            </span>
          </header>
          {outcome === 'broke' ? (
            <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">{NO_PLAN}</p>
          ) : rows.length === 0 ? (
            <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">No instance matches — the filter is on, not the book empty.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <table data-sr-table="" className="w-full">
                <thead>
                  <tr>
                    <th>Instance</th>
                    <th>Contract</th>
                    <th>Rule</th>
                    <th>Closed</th>
                    <th data-sr-col="num">Held</th>
                    <th data-sr-col="num">Net</th>
                    <th data-sr-col="num" title={NO_PLAN}>Discipline Δ</th>
                    <th>Fit</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <GroupRows key={g.key} g={g} current={current} onPick={(t) => { onPick(t); setOpen(false) }} group={group} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </>
  )
}

function GroupRows({
  g,
  group,
  current,
  onPick,
}: {
  g: ReturnType<typeof groupTrades>[number]
  group: PickGroup
  current: ReviewTrade | null
  onPick: (t: ReviewTrade) => void
}) {
  return (
    <>
      {g.label != null ? (
        <tr>
          <td colSpan={8} className="bg-[color-mix(in_srgb,var(--sk-ink)_3%,transparent)] pt-2">
            <span className="flex items-baseline gap-2.5">
              <span className={cn('font-mono font-bold', group === 'sym' && 'text-[var(--sk-ticker)]')}>{g.label}</span>
              <span className="text-dense-meta text-muted-foreground">
                {g.count} trade{g.count === 1 ? '' : 's'}
                {group === 'exp' ? ' · by contract expiry' : ''}
              </span>
              <span className={cn('ml-auto font-mono text-dense-meta', pnlColorClass(g.net))}>{fmtSignedUsd0(g.net)}</span>
            </span>
          </td>
        </tr>
      ) : null}
      {g.rows.map((t) => (
        <tr
          key={t.contractKey}
          role="button"
          tabIndex={0}
          onClick={() => onPick(t)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onPick(t)
          }}
          className={cn(
            'cursor-pointer',
            t.contractKey === current?.contractKey && 'bg-[color-mix(in_srgb,var(--sk-accent)_10%,transparent)]',
          )}
        >
          <td className="whitespace-nowrap">
            <TradeName t={t} />
          </td>
          <td className="whitespace-nowrap font-mono text-[var(--sk-contract)]">{t.label}</td>
          <td className="max-w-48 truncate text-dense-meta text-[var(--sk-mute2)]" title={t.play ?? 'not booked to a rule'}>
            {t.play ?? '—'}
          </td>
          <td className="whitespace-nowrap font-mono text-[var(--sk-mute2)]">
            {t.exitKind === 'open' ? <span className="text-[var(--color-unrealized)]">open</span> : t.closedOn ? fmtIsoDateToken(t.closedOn) : '—'}
          </td>
          <td data-sr-col="num" className="font-mono text-[var(--sk-mute2)]">
            {t.daysHeld != null ? `${t.daysHeld}d` : '—'}
          </td>
          <td
            data-sr-col="num"
            className={cn('font-mono', t.exitKind === 'open' ? 'text-muted-foreground' : pnlColorClass(t.realised))}
            title={t.exitKind === 'open' ? 'Still open — its unrealised line is marked on the page once picked' : undefined}
          >
            {t.exitKind === 'open' ? '—' : fmtSignedUsd0(t.realised)}
          </td>
          <td data-sr-col="num" className="font-mono text-muted-foreground" title={NO_PLAN}>
            —
          </td>
          <td className="whitespace-nowrap text-dense-meta text-muted-foreground">no plan</td>
        </tr>
      ))}
    </>
  )
}
