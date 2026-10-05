/**
 * Calendar · Expiries (future) — the book's option legs on the day they
 * expire, as the Expiry desk holds them: the attribution read, netted one row
 * per contract (`buildExpiryLegs`), grouped by the shared expiry rule
 * (`groupByExpiry`). One item per name per expiry — `SMCI 2 legs` — opening
 * the desk on that expiry (`/trade/expiration?fri=`).
 */
import { useMemo } from 'react'
import { usePositionAttribution } from '@/hooks/usePositionAttribution'
import { etTodayIso } from '@/lib/freshness'
import { isoOfExpiry } from '@/utils/bookCalendar'
import { buildExpiryLegs, groupByExpiry, type ExpiryGroup } from '@/utils/expiryLegs'
import { layerStateOf, type CalendarItem, type CalendarLayerReading } from './calendarLayers'

const NO_MARKS = new Map<string, { close: number | null; asOf: string | null }>()
const NO_SPOTS = new Map<string, number | null>()

function legLabel(l: { qty: number; strike: number; right: string }): string {
  return `${l.qty > 0 ? '+' : '−'}${Math.abs(l.qty)} ${l.strike}${l.right}`
}

export function expiryItems(groups: readonly ExpiryGroup[]): CalendarItem[] {
  const out: CalendarItem[] = []
  for (const g of groups) {
    const iso = isoOfExpiry(g.expiry)
    if (!iso) continue
    const bySym = new Map<string, typeof g.legs>()
    for (const l of [...g.legs].sort((a, b) => a.strike - b.strike)) bySym.set(l.symbol, [...(bySym.get(l.symbol) ?? []), l])
    for (const [sym, legs] of bySym) {
      out.push({
        key: `expiry:${iso}:${sym}`,
        d: iso,
        layer: 'expiry',
        cell: legs.length === 1 ? `${sym} ${legs[0].strike}${legs[0].right}` : `${sym} ${legs.length} legs`,
        text: legs.map(legLabel).join(' · '),
        syms: [sym],
        ink: 'contract',
        to: `/trade/expiration?fri=${iso}`,
      })
    }
  }
  return out
}

export function useCalendarExpiries(): CalendarLayerReading {
  const q = usePositionAttribution()
  const items = useMemo(() => {
    const legs = buildExpiryLegs({ attributions: q.data?.items ?? [], markByKey: NO_MARKS, spotBySymbol: NO_SPOTS })
    return expiryItems(groupByExpiry(legs, etTodayIso()))
  }, [q.data?.items])
  const state = layerStateOf([q])
  return {
    layer: 'expiry',
    items,
    state,
    note: state === 'failed' ? 'The book’s legs could not be read — no expiry was placed, not an empty book.' : null,
  }
}
