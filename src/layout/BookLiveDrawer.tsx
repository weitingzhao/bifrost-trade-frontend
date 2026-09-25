/**
 * Book Live — the strip the status bar's book segment opens upward (design
 * `_Shell StatusBar.dc.html`, Shell Spec §12.3.3).
 *
 * "The place to glance at my book at any moment": a fixed 236px, not
 * draggable, one row per holding, and the full table one click away on
 * Portfolio › Positions. It takes its height from the page rather than
 * covering it — the footer grows and the content above it shrinks.
 */
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useRowLink } from '@/hooks/useRowLink'
import type { BookLive } from '@/hooks/useBookLive'
import type { BookLiveRow } from '@/utils/bookLive'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtSignedUsd0 } from '@/utils/performanceReading'

const POSITIONS = '/portfolio/positions'

const th =
  'whitespace-nowrap border-b border-[var(--sk-surface)] px-2.5 py-1 text-left text-dense-micro font-bold uppercase tracking-[0.1em] text-muted-foreground'
const td =
  'whitespace-nowrap border-b border-[var(--sk-surface)]/80 px-2.5 py-[3px] font-mono text-dense-meta tabular-nums'

function signed(v: number | null, digits: number): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${s}`
}

function dayText(r: BookLiveRow): string {
  if (r.kind === 'stk') return r.dayPct == null ? '—' : `${signed(r.dayPct, 2)}%`
  return signed(r.dayPts, 2)
}

export function BookLiveDrawer({ book }: { book: BookLive }) {
  const rowLink = useRowLink()
  const age = book.quoteAgeSec

  return (
    <div className="h-[236px] overflow-auto border-b border-[var(--sk-surface)]" aria-label="Positions live">
      <table className="w-full min-w-[760px] border-collapse">
        <thead className="sticky top-0 bg-[color-mix(in_srgb,var(--sk-ground)_78%,transparent)] backdrop-blur-[8px]">
          <tr>
            <th className={th}>Position</th>
            <th className={cn(th, 'text-right')}>Qty</th>
            <th className={cn(th, 'text-right')}>Mark</th>
            <th className={cn(th, 'text-right')}>Day</th>
            <th className={cn(th, 'text-right')}>P&amp;L</th>
            <th className={cn(th, 'text-right')} title="Shares-equivalent: the stock's own quantity, or the vendor's Δ × 100 × contracts">
              Δ eff
            </th>
            <th className={th}>Cushion / next</th>
            <th className={th}>Acct</th>
          </tr>
        </thead>
        <tbody>
          {book.rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-2.5 py-4 text-center text-dense-meta text-muted-foreground">
                {book.isLoading ? 'Reading the book…' : 'No holdings in the book.'}
              </td>
            </tr>
          ) : (
            book.rows.map((r) => (
              <tr key={r.key} {...rowLink(POSITIONS, 'hover:bg-[rgb(var(--sk-accent-rgb)/0.04)]')} title={`${r.label} — open Positions`}>
                <td
                  className={cn(
                    td,
                    r.kind === 'stk' ? 'font-bold text-[var(--sk-ticker)]' : 'font-medium text-[var(--sk-contract)]',
                  )}
                >
                  {r.label}
                </td>
                <td className={cn(td, 'text-right text-[var(--sk-soft)]')}>{signed(r.qty, Number.isInteger(r.qty) ? 0 : 2)}</td>
                <td className={cn(td, 'text-right text-foreground')} title={r.markNote ?? 'No price for this row'}>
                  {r.mark == null ? '—' : r.mark.toFixed(2)}
                </td>
                <td className={cn(td, 'text-right', pnlColorClass(r.dayUsd))} title={r.dayWhy ?? (r.dayUsd == null ? undefined : fmtSignedUsd0(r.dayUsd) + ' on the day')}>
                  {dayText(r)}
                </td>
                <td className={cn(td, 'text-right', pnlColorClass(r.pnl))}>{fmtSignedUsd0(r.pnl)}</td>
                <td className={cn(td, 'text-right text-[var(--sk-mute2)]')}>{signed(r.deltaEff, 0)}</td>
                <td
                  className={cn(td, 'font-sans', r.next.warn ? 'text-warning' : 'text-muted-foreground')}
                  title={r.next.title}
                >
                  {r.next.text}
                </td>
                <td className={cn(td, 'text-muted-foreground')} title={r.accountId}>
                  {book.tagOf(r.accountId)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-x-3.5 gap-y-0.5 px-2.5 py-1.5 text-dense-micro text-muted-foreground">
        <span>
          on-demand STK/OPT via IB Gateway bus · quotes {age == null ? '— old' : `${age}s old`}
        </span>
        <span title="The bar's Δ is the model service's book Δ (Risk › Portfolio, Backing & Model); rows carry each leg's own vendor Δ, as the Positions page does.">
          Δ on the bar: model service · rows: per-leg
        </span>
        <span className="ml-auto">
          rows are the held book — full table in{' '}
          <Link to={POSITIONS} className="text-primary hover:underline">
            Portfolio › Positions
          </Link>
        </span>
      </div>
    </div>
  )
}
