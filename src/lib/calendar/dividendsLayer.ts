/**
 * Calendar · Dividends (past, Rev .157) — the dividends that reached the
 * account, as Transfer & Pay lists them: the same read (its default window,
 * the last 365 days, under its own query key) and the same classification
 * (`kindOf`: the broker's `dividend` label; the matching ` - US TAX` rows are
 * Tax).
 *
 * Day: the broker's posting date. IB stamps cash rows at midnight UTC of that
 * date, so the UTC date is the day — as Transfer & Pay groups its months.
 * One item per name per day: a payment and its payment-in-lieu are one cash
 * event; the withholding on the same name that day is netted in the text.
 * Off in every preset (Rev .157) — a chip to turn on, not a default. The
 * cell reads `SYM $x` (the amount received) in profit ink, as the prototype
 * writes it; the day panel adds the withholding and the net.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTransactions } from '@/api/trading'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { fmtUsd } from '@/lib/format'
import type { AccountTransaction } from '@/types/trading'
import { kindOf } from '@/utils/transactionKind'
import { getRangeForPreset } from '@/utils/transferPay'
import { layerStateOf, type CalendarItem, type CalendarLayerReading } from './calendarLayers'

/** The posting day of a cash row, `YYYY-MM-DD` (UTC; see above); null when the stamp is unreadable. */
export function cashDay(ts: AccountTransaction['ts']): string | null {
  const sec = Number(ts)
  if (!Number.isFinite(sec) || sec <= 0) return null
  return new Date((sec > 1e12 ? sec : sec * 1000)).toISOString().slice(0, 10)
}

export function dividendItems(rows: readonly AccountTransaction[]): CalendarItem[] {
  const byKey = new Map<string, { d: string; sym: string; gross: number; tax: number; n: number }>()
  for (const tx of rows) {
    const kind = kindOf(tx)
    const sym = (tx.symbol ?? '').trim().toUpperCase()
    if (!sym || (kind !== 'Dividend' && kind !== 'Tax')) continue
    const d = cashDay(tx.ts)
    if (!d) continue
    const k = `${d}:${sym}`
    const e = byKey.get(k) ?? { d, sym, gross: 0, tax: 0, n: 0 }
    const amt = Number(tx.amount)
    if (!Number.isFinite(amt)) continue
    if (kind === 'Dividend') {
      e.gross += amt
      e.n += 1
    } else e.tax += amt
    byKey.set(k, e)
  }
  const out: CalendarItem[] = []
  for (const [k, e] of byKey) {
    // A tax row with no dividend that day (a later correction) is Transfer & Pay's, not a dividend.
    if (e.n === 0) continue
    const tax = Math.abs(e.tax) >= 0.005 ? ` · ${fmtUsd(e.tax)} tax · net ${fmtUsd(e.gross + e.tax)}` : ''
    out.push({
      key: `dividends:${k}`,
      d: e.d,
      layer: 'dividends',
      cell: `${e.sym} ${fmtUsd(e.gross)}`,
      text: `${e.sym} dividend received ${fmtUsd(e.gross)}${tax}`,
      syms: [e.sym],
      ink: 'profit',
      to: '/portfolio/transfer',
    })
  }
  return out.sort((a, b) => a.d.localeCompare(b.d) || a.key.localeCompare(b.key))
}

export function useCalendarDividends(): CalendarLayerReading {
  // Transfer & Pay's own key and window (`last_365`), so the two share one read.
  const q = useQuery({
    queryKey: [...QUERY_KEYS.trading.transactions, 'last_365'],
    queryFn: () => {
      const { sinceTs, untilTs } = getRangeForPreset('last_365')
      return getTransactions({ from_ts: sinceTs, to_ts: untilTs, limit: 500 })
    },
  })
  const items = useMemo(() => dividendItems(q.data?.transactions ?? []), [q.data?.transactions])
  const state = layerStateOf([q])
  return {
    layer: 'dividends',
    items,
    state,
    note:
      state === 'failed'
        ? 'The Transfer & Pay read failed — no dividend was placed, not a quiet account.'
        : 'Dividends received in the last 365 days — Transfer & Pay’s window.',
  }
}
