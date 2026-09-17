import { fmtUsdRound } from '@/lib/format'
import type { ByDayRangeData, PerformanceResponse } from '@/types/trading'

/** How a figure is inked: direction, no direction (unrealized, counts), or quiet. */
export type ReadingTone = 'pnl' | 'loss' | 'plain' | 'soft' | 'muted'

export interface ReadingMetric {
  label: string
  value: string
  /** The number behind `value`, for the `pnl` tone. */
  raw?: number | null
  tone: ReadingTone
  /** First metric of a group: Profitability, Consistency, Risk. */
  groupHead?: boolean
  title?: string
}

/** `+$1,235` · `−$399` · `$0` · `—`. */
export function fmtSignedUsd0(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  if (Math.abs(v) < 0.5) return '$0'
  return `${v > 0 ? '+' : '−'}${fmtUsdRound(Math.abs(v))}`
}

function fmtFactor(v: number | null | undefined): string {
  if (v == null) return '—'
  if (!Number.isFinite(v)) return '∞'
  return v.toFixed(2)
}

/**
 * The range-level reading (Design F1): eleven metrics in three groups, plus the
 * cash flows the page leaves out. One read of the performance response, so the
 * figures here and anywhere that cites them cannot disagree.
 *
 * Three API facts shape the labels. `trade_count` counts every fill in the range,
 * opening fills included, so the API's `win_rate` (wins ÷ all fills) reads low
 * against closed trades; the reading divides wins by the fills that realized a
 * gain or a loss instead. `total_unrealized_pnl` is every open position now, not
 * limited to the range. The return divides by a capital base built from today's
 * net liquidation. Each says so in its title rather than pass as a range figure.
 */
export function buildReadingMetrics(perf: PerformanceResponse | undefined): ReadingMetric[] {
  const s = perf?.summary
  if (!s) return []
  const unrealized = s.total_unrealized_pnl
  const total = s.total_pnl ?? s.net_pnl + unrealized
  const realized = s.total_realized_pnl ?? null
  const closed = (s.win_count ?? 0) + (s.loss_count ?? 0)
  const winRate = closed > 0 ? `${((100 * s.win_count) / closed).toFixed(1)}%` : '—'
  const maxDd = s.max_drawdown != null ? -Math.abs(s.max_drawdown) : null
  const ret = s.return_pct
  const netCash = perf?.transaction?.net_cash_flow ?? null

  return [
    { label: 'Profitability · total P&L', value: fmtSignedUsd0(total), raw: total, tone: 'pnl', groupHead: true,
      title: 'Net of fees plus unrealized' },
    { label: 'Realized', value: fmtSignedUsd0(realized), raw: realized, tone: 'pnl' },
    { label: 'Unrealized', value: fmtSignedUsd0(unrealized), tone: 'soft',
      title: 'Every open position now — not limited to the range' },
    { label: 'Net of fees', value: fmtSignedUsd0(s.net_pnl), raw: s.net_pnl, tone: 'pnl' },
    { label: 'Commissions', value: fmtSignedUsd0(-Math.abs(s.total_commission ?? 0)), tone: 'muted',
      title: 'A cost: Net of fees is Realized less this' },
    { label: 'Consistency · win rate · closed trades', value: winRate, tone: 'plain', groupHead: true,
      title: `${s.win_count} of ${closed} fills that realized a gain or a loss — opening fills are left out. Not the calendar's win days.` },
    { label: 'Profit factor', value: fmtFactor(s.profit_factor), tone: 'plain' },
    { label: 'Trades', value: String(s.trade_count ?? 0), tone: 'soft', title: 'Every fill in the range, opening fills included' },
    { label: 'Avg win / loss', value: `${fmtSignedUsd0(s.avg_win)} / ${fmtSignedUsd0(s.avg_loss)}`, tone: 'soft' },
    { label: 'Risk · max drawdown', value: fmtSignedUsd0(maxDd), tone: 'loss', groupHead: true },
    { label: 'Return on capital base', value: ret == null ? '—' : `${ret >= 0 ? '+' : '−'}${Math.abs(ret).toFixed(2)}%`,
      raw: ret, tone: 'pnl',
      title: "Total P&L ÷ capital base. The base is today's net liquidation plus half the range's cash transactions — see Return basis" },
    { label: 'Cash flows excluded', value: fmtSignedUsd0(netCash), tone: 'muted',
      title: 'Every cash transaction in the range, read from Transfer & Pay. Not P&L.' },
  ]
}

/** `N active days · N trades · capital base $X` for the filter strip. */
export function buildScopeNote(
  byDayRangeData: ByDayRangeData | null | undefined,
  perf: PerformanceResponse | undefined,
): string {
  const parts: string[] = []
  if (byDayRangeData) {
    const dates = new Set<string>()
    const mark = (rec: Record<string, { realized: number; unrealized: number }>) => {
      for (const [d, v] of Object.entries(rec)) {
        if (Math.abs(v.realized) >= 0.005 || Math.abs(v.unrealized) >= 0.005) dates.add(d)
      }
    }
    mark(byDayRangeData.opt)
    mark(byDayRangeData.stocks)
    mark(byDayRangeData.fixed_income)
    mark(byDayRangeData.cash_like)
    for (const bucket of Object.values(byDayRangeData.stkBucketNotional)) {
      for (const [d, n] of Object.entries(bucket)) if (Math.abs(n) >= 0.005) dates.add(d)
    }
    parts.push(`${dates.size} active ${dates.size === 1 ? 'day' : 'days'}`)
  }
  if (perf?.summary) parts.push(`${perf.summary.trade_count ?? 0} trades`)
  const base = perf?.transaction?.capital_base
  parts.push(base != null ? `capital base ${fmtUsdRound(base)}` : 'no capital base')
  return parts.join(' · ')
}
