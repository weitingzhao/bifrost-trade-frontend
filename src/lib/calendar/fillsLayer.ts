/**
 * Calendar · Fills (past) — the rows Orders & Fills draws, from the same read
 * (`useExecutionsAll`, every source) and the same builder (`buildFillRows`).
 *
 * Day: the broker's trade date, as Fills scopes its window by; a row the source
 * sent without one falls back to its execution time in New York. Name: the
 * contract key's root, so a TWS and a Flex fill of one option are one name.
 * Opens the Trade that claims it, else Fills narrowed to the name.
 */
import { useMemo } from 'react'
import { useExecutionsAll } from '@/hooks/useExecutions'
import { etDate } from '@/lib/freshness'
import { shortOptContractKey } from '@/utils/ledger/optionsModeBridge'
import { buildFillRows, type FillRow } from '@/utils/fillRows'
import type { Execution } from '@/types/positions'
import { layerStateOf, type CalendarItem, type CalendarLayerReading } from './calendarLayers'

function fillDay(r: FillRow): string | null {
  if (r.tradeDate) return r.tradeDate.slice(0, 10)
  return r.time != null && Number.isFinite(r.time) ? etDate(r.time * 1000) : null
}

export function fillItems(executions: readonly Execution[]): CalendarItem[] {
  const out: CalendarItem[] = []
  for (const r of buildFillRows(executions)) {
    const d = fillDay(r)
    if (!d) continue
    const what = r.secType === 'OPT' ? shortOptContractKey(r.contractKey) : `${r.symbol}${r.secType === 'STK' ? ' sh' : ''}`
    out.push({
      key: `fills:${r.key}`,
      d,
      layer: 'fills',
      cell: '',
      text: `${r.side} ${what} ×${r.qty}`,
      syms: r.symbol ? [r.symbol] : [],
      ink: 'soft',
      to:
        r.tradeId != null
          ? `/trade/${r.tradeId}`
          : r.symbol
            ? `/trade/fills?symbol=${encodeURIComponent(r.symbol)}`
            : '/trade/fills',
    })
  }
  return out.sort((a, b) => a.d.localeCompare(b.d))
}

export function useCalendarFills(): CalendarLayerReading {
  const q = useExecutionsAll()
  const items = useMemo(() => fillItems(q.data?.items ?? []), [q.data?.items])
  const state = layerStateOf([q])
  return {
    layer: 'fills',
    items,
    state,
    note: state === 'failed' ? 'The executions read failed — no fill was placed, not a quiet book.' : null,
  }
}
