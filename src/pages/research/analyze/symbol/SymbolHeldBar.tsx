/**
 * The in-hand bar — the compact Symbol page only (design Rev .163 → .173,
 * contract §18.2: "标的行 → 判词 → 在手仓位条 → tab"). Compact is for watching
 * a book and acting lightly on it, so when this name has an open trade the
 * page says so before any face: the unrealized on the open legs, the trades,
 * and one way out — `Roll or close →` to the Expiry desk, where the decision
 * is confirmed. Nothing here writes or sends (D10).
 *
 * The open trades are the same trade tracks as the list below
 * (`useSymbolTradeTracks`), so the bar and the list cannot disagree on what
 * is open. The unrealized is the trade page's: each open leg at the same
 * mark chain (live → the vendor's snapshot → the last EOD close), cash so
 * far plus the open remainder at that mark (RESPONSE 2026-10-17). A rolled
 * trade's flat legs are history, not what is in hand. An open leg nothing
 * prices is counted as unmarked, never as zero; with none priced the bar
 * says `no mark`.
 */
import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { TradeRef } from '@/components/tradeRecord/TradeRef'
import { fmtPl } from '@/components/symbolChart/symbolPriceModel'
import { cn } from '@/lib/utils'
import { unrealizedPnlColorClass } from '@/utils/dailyChange'
import { heldReading, openOnName, useHeldLegs, useSymbolTradeTracks } from './useSymbolTradeTracks'

const EXPIRY_DESK = '/trade/expiration'

export function SymbolHeldBar({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase()
  const { tracks } = useSymbolTradeTracks(sym)
  const open = openOnName(tracks)
  const ids = open.map((t) => t.id as number)
  const marked = useHeldLegs(sym, ids)
  if (open.length === 0) return null
  const held = heldReading(marked.legs)
  const src = held.sources
  const marksNote = `Each open leg at the trade page's mark: a live quote, else the vendor's snapshot, else the contract's last daily close — ${src.live} live · ${src.snap} snapshot · ${src.eod} EOD.`

  return (
    <section
      aria-label={`Open on ${sym}`}
      className="flex items-center gap-2 rounded-[10px] bg-[color-mix(in_srgb,var(--sk-ink)_5%,transparent)] px-2.5 py-2"
    >
      <div className="flex min-w-0 flex-col gap-px">
        <span className="text-dense-micro font-semibold text-muted-foreground">Open on {sym}</span>
        {held.unrealized == null ? (
          <span
            className="text-dense-label text-muted-foreground"
            title={
              marked.pending
                ? 'Reading the marks for the open legs.'
                : 'No live quote, vendor snapshot or daily close prices these open legs right now, so no unrealized figure is read.'
            }
          >
            {marked.pending ? 'Unrealized · …' : 'Unrealized · no mark'}
          </span>
        ) : (
          <span className="font-mono text-dense-label tabular-nums" title={marksNote}>
            <span className={unrealizedPnlColorClass(held.unrealized)}>{fmtPl(held.unrealized)} unrealized</span>
            {held.marked < held.legs ? (
              <span
                className="text-dense-micro text-muted-foreground"
                title="Only the marked legs are summed; an open leg without a mark is left out, not read as zero."
              >
                {` · ${held.marked} of ${held.legs} legs marked`}
              </span>
            ) : null}
          </span>
        )}
        <span className="min-w-0 truncate text-dense-meta text-[var(--sk-mute2)]">
          {open.map((t, i) => (
            <Fragment key={t.key}>
              {i > 0 ? ' · ' : null}
              <TradeRef id={t.id as number} list={ids} from={`Symbol · ${sym}`} />{' '}
              <span className="font-mono">{t.name.replace(/^#\d+\s*/, '')}</span>
            </Fragment>
          ))}
        </span>
      </div>
      <Link
        to={EXPIRY_DESK}
        title="Opens the Expiry desk — roll or close is confirmed there"
        className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'ml-auto h-7 shrink-0 gap-1 px-2 text-dense-meta')}
      >
        Roll or close →
      </Link>
    </section>
  )
}
