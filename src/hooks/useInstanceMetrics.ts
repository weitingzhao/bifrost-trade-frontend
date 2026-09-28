import { useEffect, useMemo, useState } from 'react'
import { fetchInstancePerformance, fetchInstanceExecutions } from '@/api/trading'
import { fetchOptionStockLinkMapForExecutions } from '@/utils/ledger/fetchOptionStockLinkMap'
import {
  sliceExecutionForInstanceOptView,
  instanceOptionStockSlippageAdjustment,
} from '@/utils/ledger/ledgerOptHelpers'
import {
  computeInstanceExecDerivedNetPnl,
  computeInstanceMaxRiskUsd,
  underlyingCostSellOptUsd,
  type InstanceListMetricsEntry,
} from '@/utils/instanceListMetrics'
import type { StrategyInstance } from '@/types/positions'
import type { Execution } from '@/types/positions'

export type { InstanceListMetricsEntry }

function rawExecutionToExecution(raw: import('@/types/trading').RawExecution): Execution {
  const sideUpper = (raw.side ?? '').toUpperCase()
  const side: Execution['side'] = sideUpper === 'BUY' || sideUpper === 'BOT' || sideUpper === 'B' ? 'Buy' : 'Sell'
  return {
    account_executions_id: raw.account_executions_id,
    account_id: raw.account_id ?? '',
    contract_key: raw.contract_key ?? '',
    symbol: raw.symbol ?? '',
    sec_type: raw.sec_type,
    right: raw.option_right ?? undefined,
    strike: raw.strike ?? undefined,
    expiry: raw.expiry ?? undefined,
    side,
    qty: raw.quantity,
    quantity: raw.quantity,
    price: raw.price,
    time: raw.time ?? null,
    trade_date: raw.trade_date ?? null,
    report_date: raw.report_date ?? null,
    commission: raw.commission,
    realized_pnl: raw.realized_pnl,
    net_cash: raw.net_cash,
    strategy_instance_id: raw.strategy_instance_id ?? null,
    instance_allocations: raw.instance_allocations,
  }
}

const CHUNK_SIZE = 5

type LoadedMetrics = {
  sessionKey: string
  map: Map<number, InstanceListMetricsEntry>
}

export function useInstanceMetrics(
  instances: StrategyInstance[],
  revalidateKey = 0,
): Map<number, InstanceListMetricsEntry> {
  // The key is the *content* of the id list. The effect below depends on it
  // alone — never on the array — because a caller that rebuilds `instances`
  // every render (Trade › Rules did: its selection is parsed fresh from the
  // URL each render) hands a new array with the same ids, and an effect keyed
  // on the array's identity cancels and restarts on every render. Each chunk
  // that landed re-rendered the page, which restarted the loop at chunk 0:
  // on PROD 2026-09-28 it fetched the same 10 instances 65 times in 13 s and
  // the other 31 never loaded.
  const idsKey = instances.map((i) => i.strategy_instance_id).join(',')
  const ids = useMemo(
    () => (idsKey ? idsKey.split(',').map(Number) : []),
    [idsKey],
  )
  const sessionKey = `${idsKey}:${revalidateKey}`

  const [loaded, setLoaded] = useState<LoadedMetrics>(() => ({
    sessionKey: '',
    map: new Map(),
  }))

  useEffect(() => {
    if (ids.length === 0) return

    let cancelled = false

    void (async () => {
      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        if (cancelled) return
        const chunk = ids.slice(i, i + CHUNK_SIZE)
        const chunkResults = await Promise.all(
          chunk.map(async (id): Promise<[number, InstanceListMetricsEntry]> => {
            try {
              const [perf, execRes] = await Promise.all([
                fetchInstancePerformance(id),
                fetchInstanceExecutions(id),
              ])
              const raw = execRes.executions ?? []
              const normalized = raw.map(rawExecutionToExecution)
              const sliced = normalized
                .map((ex) => sliceExecutionForInstanceOptView(ex, id))
                .filter((row): row is Execution => row != null)
              const linkMap = await fetchOptionStockLinkMapForExecutions(sliced)
              const linkedStockSlippage = instanceOptionStockSlippageAdjustment(normalized, id, linkMap)
              const execDerivedNetPnl = computeInstanceExecDerivedNetPnl(sliced, linkedStockSlippage)
              const underlying = underlyingCostSellOptUsd(sliced)
              const maxRiskUsd = computeInstanceMaxRiskUsd(sliced, underlying)
              return [
                id,
                {
                  status: 'ready',
                  summary: perf.summary,
                  sliced,
                  linkedStockSlippage,
                  execDerivedNetPnl,
                  maxRiskUsd,
                } as const,
              ]
            } catch {
              return [id, { status: 'error' } as const]
            }
          }),
        )
        if (cancelled) return
        setLoaded((prev) => {
          const base = prev.sessionKey === sessionKey ? prev.map : new Map<number, InstanceListMetricsEntry>()
          const next = new Map(base)
          for (const [id, row] of chunkResults) next.set(id, row)
          return { sessionKey, map: next }
        })
      }
    })()

    return () => {
      cancelled = true
    }
    // `ids` is derived from `sessionKey`'s own content (memoised on idsKey),
    // so the string is the whole dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey])

  return useMemo(() => {
    if (ids.length === 0) return new Map<number, InstanceListMetricsEntry>()
    const source = loaded.sessionKey === sessionKey ? loaded.map : new Map<number, InstanceListMetricsEntry>()
    const next = new Map<number, InstanceListMetricsEntry>()
    for (const id of ids) {
      next.set(id, source.get(id) ?? { status: 'loading' })
    }
    return next
  }, [ids, loaded, sessionKey])
}
