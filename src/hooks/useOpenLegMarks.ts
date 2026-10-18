/**
 * Marks for open option legs — the trade record's chain (design Rev .101),
 * read by the trade page and by the Symbol page's in-hand bar (RESPONSE
 * 2026-10-17: the bar takes the trade page's marks, not the monitor's):
 *
 * 1. a **live** quote while the gateway has one;
 * 2. else the vendor's **snapshot** of the contract — the same rows Positions
 *    reads, with the capture time;
 * 3. else the contract's last `option_daily` close, dated (**eod**). After the
 *    close the quote cache is empty and the IB snapshot carries no option
 *    price at all (both measured on DEV and PROD 2026-09-28).
 *
 * A leg none of the three prices carries no mark — never a zero.
 *
 * The quote read and the vendor rollup come back with the marks: the trade
 * page reads spot off the same quotes and the Greeks off the same rollup, so
 * nothing is asked for twice.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useQuotes } from '@/hooks/useQuotes'
import { useOptionGreeks, type GreekLeg } from '@/hooks/useOptionGreeks'
import { buildOptionTicker } from '@/utils/optionTicker'
import { fetchOptionDailyBars, occToOptionTicker } from '@/api/marketData/dailyBars'
import type { LegMark, RecordLeg } from '@/utils/tradeRecord/tradeRecordModel'
import { etTodayIso } from '@/lib/freshness'

export type MarkableLeg = Pick<RecordLeg, 'key' | 'root' | 'expiry' | 'strike' | 'right' | 'open' | 'openQty'>

const shiftIso = (iso: string, days: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)

/** The vendor's ticker for a leg — the key of the snapshot and the Greeks rows. */
export function legVendorTicker(l: Pick<RecordLeg, 'root' | 'expiry' | 'strike' | 'right'>): string | null {
  return buildOptionTicker({ underlying: l.root, expiry: l.expiry ?? '', strike: l.strike, right: l.right })
}

export function useOpenLegMarks(legs: readonly MarkableLeg[]) {
  const today = etTodayIso()
  const openKeys = useMemo(() => legs.filter((l) => l.open).map((l) => l.key), [legs])
  const roots = useMemo(() => [...new Set(legs.map((l) => l.root).filter(Boolean))], [legs])

  const quotesQ = useQuotes(roots, openKeys)
  const quotes = useMemo(() => quotesQ.data?.quotes ?? [], [quotesQ.data])

  const live: Record<string, LegMark> = useMemo(() => {
    const out: Record<string, LegMark> = {}
    for (const q of quotes) {
      const ck = (q.contract_key ?? '').trim()
      const px = q.mid ?? q.last ?? null
      if (openKeys.includes(ck) && px != null && px > 0) out[ck] = { price: px, source: 'live' }
    }
    return out
  }, [quotes, openKeys])

  // The vendor's per-contract rows for the open legs — Positions' own read.
  const greekLegs: GreekLeg[] = useMemo(
    () =>
      legs
        .filter((l) => l.open && l.expiry)
        .map((l) => ({ underlying: l.root, expiry: l.expiry!, strike: l.strike, right: l.right, qty: l.openQty })),
    [legs],
  )
  const greeks = useOptionGreeks(greekLegs)
  const snap: Record<string, LegMark> = useMemo(() => {
    const out: Record<string, LegMark> = {}
    for (const l of legs) {
      if (!l.open) continue
      const t = legVendorTicker(l)
      const c = t ? greeks.closeByTicker.get(t) : undefined
      if (c && c.close > 0) out[l.key] = { price: c.close, source: 'snap', asOf: c.asOf ?? undefined }
    }
    return out
  }, [legs, greeks.closeByTicker])

  const needEod = useMemo(
    () => (greeks.isLoading ? [] : openKeys.filter((k) => !live[k] && !snap[k])),
    [openKeys, live, snap, greeks.isLoading],
  )
  const eodQ = useQuery({
    queryKey: ['trade-record', 'eod-marks', needEod, today],
    queryFn: async () => {
      const out: Record<string, LegMark> = {}
      await Promise.all(
        needEod.map(async (k) => {
          const ticker = occToOptionTicker(k)
          if (!ticker) return
          const bars = await fetchOptionDailyBars(ticker, shiftIso(today, -21), today)
          const last = [...bars].reverse().find((b) => b.close != null && b.close > 0)
          if (last) out[k] = { price: last.close!, source: 'eod', asOf: last.date }
        }),
      )
      return out
    },
    enabled: needEod.length > 0,
    staleTime: 15 * 60_000,
  })

  const marks = useMemo(() => ({ ...(eodQ.data ?? {}), ...snap, ...live }), [eodQ.data, snap, live])
  return {
    marks,
    openKeys,
    roots,
    quotesQ,
    quotes,
    greeks,
    /** Still asking: the vendor rows, or the daily closes for legs neither quote nor snapshot priced. */
    pending: greeks.isLoading || (eodQ.isLoading && needEod.length > 0),
  }
}
