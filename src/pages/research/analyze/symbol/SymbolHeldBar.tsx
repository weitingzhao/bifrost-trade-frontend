/**
 * The in-hand bar — the phone's Symbol page only (design Rev .163, contract
 * §18.2: "标的行 → 判词 → 在手仓位条 → tab"). A phone is for watching a book
 * and acting lightly on it, so when this name has an open trade the page says
 * so before any face: the unrealized on the open legs, the trades, and one
 * way out — `Roll or close →` to the Expiry desk, where the decision is
 * confirmed. Nothing here writes or sends (D10).
 *
 * Read from the same trade tracks as the list below (`useSymbolTradeTracks`),
 * so the bar and the list cannot disagree on what is open. The unrealized is
 * the monitor's marks on the open legs only — a rolled trade's realized legs
 * are history, not what is in hand. An open leg without a mark is counted as
 * unmarked, never as zero.
 */
import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { TradeRef } from '@/components/tradeRecord/TradeRef'
import { fmtPl } from '@/components/symbolChart/symbolPriceModel'
import { cn } from '@/lib/utils'
import { unrealizedPnlColorClass } from '@/utils/dailyChange'
import { openOnName, useSymbolTradeTracks } from './useSymbolTradeTracks'

const EXPIRY_DESK = '/trade/expiration'

export function SymbolHeldBar({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase()
  const { tracks } = useSymbolTradeTracks(sym)
  const held = openOnName(tracks)
  if (held.open.length === 0) return null
  const ids = held.open.map((t) => t.id as number)

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
            title="The monitor carries no mark for these open legs right now, so no unrealized figure is read."
          >
            Unrealized · no mark
          </span>
        ) : (
          <span className="font-mono text-dense-label tabular-nums">
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
          {held.open.map((t, i) => (
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
