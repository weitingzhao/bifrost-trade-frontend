/* eslint-disable react-hooks/set-state-in-effect -- bar load on tab change */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { DiscoveryHint } from '@/components/optionDiscovery/DiscoveryHint'
import { BarsCandlestickChart } from '@/components/charts/BarsCandlestickChart'
import { fetchBars, fetchOptionBars } from '@/api/market'
import { fetchOptionSnapshotsPg, postMassiveSync } from '@/api/research/optionDiscovery'
import type { Bar } from '@/types/market'
import type { Execution } from '@/types/positions'
import { fmtExpiry, parseOptionContractKey } from '@/lib/format'
import { buildPolygonOptionsTicker } from '@/utils/polygonOptionsTicker'
import {
  klineOptionTabKey,
  normalizeOptionExpiryDigits,
  normalizeOptionRightChar,
} from '@/utils/instanceKlineTabKey'
import {
  instanceExecTabActiveClass,
  instanceExecTabClass,
  instanceExecTabsClass,
} from './instanceDetailUi'

type KlineTab =
  | { kind: 'stock'; symbol: string; label: string }
  | {
      kind: 'option'
      symbol: string
      expiry: string
      strike: number
      option_right: string
      label: string
    }

function resolveOptFields(e: Execution): { expiry: string; strike: number; option_right: string } | null {
  let expiry = e.expiry
  let strike = e.strike
  let option_right = e.option_right ?? e.right

  if ((!expiry || strike == null || !option_right) && e.contract_key) {
    const parsed = parseOptionContractKey(e.contract_key)
    if (!expiry && parsed.expiry !== '—') expiry = parsed.expiry
    if (strike == null && parsed.strike !== '—') {
      const s = parseFloat(parsed.strike)
      if (!Number.isNaN(s)) strike = s
    }
    if (!option_right && parsed.right !== '—') option_right = parsed.right
  }

  if (!expiry || strike == null || !option_right) return null
  const expN = normalizeOptionExpiryDigits(expiry)
  if (!expN) return null
  const r = normalizeOptionRightChar(option_right)
  const k = Number(strike)
  if (!Number.isFinite(k)) return null
  return { expiry: expN, strike: k, option_right: r }
}

function deriveTabs(executions: Execution[], symbol: string): KlineTab[] {
  const tabs: KlineTab[] = []
  const sym = symbol.trim().toUpperCase()
  if (!sym) return tabs

  const hasStock = executions.some((e) => (e.sec_type ?? '').toUpperCase() === 'STK')
  if (hasStock) tabs.push({ kind: 'stock', symbol: sym, label: `Stock ${sym}` })

  const seen = new Map<string, KlineTab>()
  for (const e of executions) {
    if ((e.sec_type ?? '').toUpperCase() !== 'OPT') continue
    const fields = resolveOptFields(e)
    if (!fields) continue
    const { expiry, strike, option_right } = fields
    const key = klineOptionTabKey(expiry, strike, option_right)
    if (!seen.has(key)) {
      const rightLabel = option_right === 'P' ? 'PUT' : 'CALL'
      seen.set(key, {
        kind: 'option',
        symbol: sym,
        expiry,
        strike,
        option_right,
        label: `${rightLabel} $${strike} ${fmtExpiry(expiry)}`,
      })
    }
  }
  tabs.push(...seen.values())
  return tabs
}

function execsForTab(tab: KlineTab, executions: Execution[]): Execution[] {
  if (tab.kind === 'stock') {
    return executions.filter((e) => (e.sec_type ?? '').toUpperCase() === 'STK')
  }
  const tabKey = klineOptionTabKey(tab.expiry, tab.strike, tab.option_right)
  return executions.filter((e) => {
    if ((e.sec_type ?? '').toUpperCase() !== 'OPT') return false
    const fields = resolveOptFields(e)
    if (!fields) return false
    return klineOptionTabKey(fields.expiry, fields.strike, fields.option_right) === tabKey
  })
}

function dayTs(unixSec: number): number {
  const d = new Date(unixSec * 1000)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000
}

function windowBarsAroundExecs(bars: Bar[], tabExecs: Execution[]): Bar[] {
  if (bars.length === 0) return bars
  const execTimes = tabExecs.map((e) => e.time ?? 0).filter((t) => t > 0)
  if (execTimes.length === 0) return bars.slice(-120)
  const minDay = dayTs(Math.min(...execTimes))
  const maxDay = dayTs(Math.max(...execTimes))
  const startIdx = Math.max(0, bars.findIndex((b) => (b.time ?? 0) >= minDay) - 20)
  let lastIdx = bars.length - 1
  for (let i = bars.length - 1; i >= 0; i--) {
    if ((bars[i].time ?? 0) <= maxDay) {
      lastIdx = i
      break
    }
  }
  const endIdx = Math.min(bars.length - 1, lastIdx + 15)
  return bars.slice(startIdx, endIdx + 1)
}

function isBuySide(e: Execution): boolean {
  const s = (e.side ?? '').toUpperCase()
  return s === 'BUY' || s === 'BOT' || s === 'B'
}

interface Props {
  symbol: string
  executions: Execution[]
  strategyInstanceId: number
}

export function InstanceKlineSection({
  symbol,
  executions,
  strategyInstanceId,
}: Props) {
  const tabs = useMemo(() => deriveTabs(executions, symbol), [executions, symbol])
  const [tabIdx, setTabIdx] = useState(0)
  const [bars, setBars] = useState<Bar[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef(0)
  const snapshotAttemptedRef = useRef(new Set<string>())

  const selectedTab = tabs[tabIdx] ?? null

  const load = useCallback(async (tab: KlineTab) => {
    const token = ++cancelRef.current
    setLoading(true)
    setError(null)
    setBars([])
    try {
      let rawBars: Bar[] = []
      if (tab.kind === 'stock') {
        const res = await fetchBars(tab.symbol, '1 D', 250)
        rawBars = (res.bars ?? []) as Bar[]
      } else {
        const pullOptionBars = async () => {
          let optionRes = await fetchOptionBars({
            symbol: tab.symbol,
            expiry: tab.expiry,
            strike: tab.strike,
            option_right: tab.option_right,
            period: '1 D',
            limit: 250,
            source: 'massive',
          })
          if (!optionRes.bars?.length) {
            optionRes = await fetchOptionBars({
              symbol: tab.symbol,
              expiry: tab.expiry,
              strike: tab.strike,
              option_right: tab.option_right,
              period: '1 D',
              limit: 250,
              source: 'ib',
            })
          }
          return optionRes
        }

        let res = await pullOptionBars()
        if (!res.bars?.length) {
          const key = klineOptionTabKey(tab.expiry, tab.strike, tab.option_right)
          if (!snapshotAttemptedRef.current.has(key)) {
            snapshotAttemptedRef.current.add(key)
            const optionContract = buildPolygonOptionsTicker(
              tab.symbol,
              tab.expiry,
              tab.strike,
              tab.option_right,
            )
            await postMassiveSync(
              'feed_option_snapshots',
              {
                mode: 'contract',
                underlying: tab.symbol,
                option_contract: optionContract,
                persist: true,
              },
              { priority: 'high' },
            )
            await fetchOptionSnapshotsPg(tab.symbol, tab.expiry, String(tab.strike), 'massive')
            res = await pullOptionBars()
          }
        }
        rawBars = (res.bars ?? []) as Bar[]
      }
      if (cancelRef.current !== token) return
      const sorted = [...rawBars].sort((a, b) => (a.time ?? 0) - (b.time ?? 0))
      setBars(sorted)
      if (sorted.length === 0) {
        setError('No bar data available for this contract.')
      }
    } catch (e) {
      if (cancelRef.current !== token) return
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (cancelRef.current === token) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedTab) return
    void load(selectedTab)
  }, [selectedTab, load])

  useEffect(() => {
    setTabIdx(0)
  }, [strategyInstanceId])

  const tabExecs = useMemo(
    () => (selectedTab ? execsForTab(selectedTab, executions) : []),
    [selectedTab, executions],
  )

  const windowedBars = useMemo(
    () => windowBarsAroundExecs(bars, tabExecs),
    [bars, tabExecs],
  )

  const buyCount = tabExecs.filter(isBuySide).length
  const sellCount = tabExecs.length - buyCount

  if (tabs.length === 0) return null

  return (
    <div aria-label="K-line chart">
      {tabs.length > 1 ? (
        <div className={cn(instanceExecTabsClass, 'mb-3')} role="tablist" aria-label="K-line contract">
          {tabs.map((tab, i) => (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={i === tabIdx}
              className={cn(instanceExecTabClass, i === tabIdx && instanceExecTabActiveClass)}
              onClick={() => setTabIdx(i)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="mb-2 text-xs text-muted-foreground">{tabs[0].label}</p>
      )}

      {loading ? <DiscoveryHint className="">Loading bars…</DiscoveryHint> : null}
      {error && !loading ? (
        <DiscoveryHint className="text-destructive">{error}</DiscoveryHint>
      ) : null}
      {!loading && !error && windowedBars.length > 0 ? (
        <>
          <BarsCandlestickChart bars={windowedBars} period="1 D" showVwap={false} />
          <p className="mt-2 text-dense-meta text-muted-foreground">
            {windowedBars.length} bars
            {buyCount > 0 ? (
              <span className="ml-2.5 text-side-buy">▲ {buyCount} buy</span>
            ) : null}
            {sellCount > 0 ? (
              <span className="ml-2 text-side-sell">▼ {sellCount} sell</span>
            ) : null}
            {bars.length > windowedBars.length ? (
              <span className="ml-2 opacity-60">(windowed from {bars.length} total)</span>
            ) : null}
          </p>
        </>
      ) : null}
    </div>
  )
}
