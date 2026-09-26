import { HeroCard, HeroRow } from '@/components/layout'
import { pnlColorClass } from '@/utils/dailyChange'

interface Props {
  sinceDollar: number
  sincePct: number | null
  dailyDollar: number
  dailyPct: number | null
  /** Rows with a Since $ / a Daily $, over all rows. None priced is unread, never `$0`. */
  priced: number
  dailyPriced: number
  rows: number
  visible: boolean
  /** What the readings sum — `stocks · Host + Secondary`. */
  scopeLabel: string
}

function fmtUsdCompact(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

const signedPct2 = (v: number | null) => (v != null && Number.isFinite(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '— %')

/**
 * The STK streams summary as two heroes (design Rev .85): stocks since each
 * position opened, and stocks today. Both are signed P&L, so they keep the
 * direction inks; the scope they sum is the sub-line.
 */
export function LiveStreamsSummaryBar({
  sinceDollar,
  sincePct,
  dailyDollar,
  dailyPct,
  priced,
  dailyPriced,
  rows,
  visible,
  scopeLabel,
}: Props) {
  if (!visible) return null
  const showSince = priced > 0
  const showDaily = dailyPriced > 0
  // A partial sum says how much of the tape it covers.
  const cover = (n: number) => (n < rows ? ` · ${n} of ${rows} marked` : '')
  return (
    <HeroRow label="STK streams summary">
      <HeroCard
        label="Stocks · since open"
        title={`Stocks P&L since each position opened · ${scopeLabel}`}
        value={showSince ? fmtUsdCompact(sinceDollar) : '—'}
        valueClassName={showSince ? pnlColorClass(sinceDollar) : 'text-muted-foreground'}
        sub={
          showSince
            ? `${signedPct2(sincePct)} · ${scopeLabel}${cover(priced)}`
            : `no row has a mark yet — unread, not flat · ${scopeLabel}`
        }
      />
      <HeroCard
        label="Stocks · today"
        title={`Stocks P&L today · ${scopeLabel}`}
        value={showDaily ? fmtUsdCompact(dailyDollar) : '—'}
        valueClassName={showDaily ? pnlColorClass(dailyDollar) : 'text-muted-foreground'}
        sub={
          showDaily
            ? `${signedPct2(dailyPct)} · ${scopeLabel}${cover(dailyPriced)}`
            : `no row has a daily reference yet · ${scopeLabel}`
        }
      />
    </HeroRow>
  )
}
