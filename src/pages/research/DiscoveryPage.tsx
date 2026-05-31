/* eslint-disable react-hooks/set-state-in-effect -- Discovery chain workflow: phased hook extraction (see useDiscoverySession) */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import discoveryStyles from './discoveryCharts.module.css'
import { bsComputeDetail } from '@/utils/optionDiscovery/bsCalc'
import {
  fetchOptionExpirations,
  postMassiveSync,
  fetchOptionSnapshotsPg,
  pollMassiveJobUntilDone,
  resolveMassiveSyncJobId,
  fetchMassiveJob,
  fetchIvTermStructure,
  fetchIvVolatilityCone,
} from '@/api/research/optionDiscovery'
import { postWatchlistItem } from '@/api/market'
import type { OptionSnapshotRow } from '@/types/optionDiscovery'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableCell } from '@/components/ui/table'
import { PageShell } from '@/components/layout'
import { cn } from '@/lib/utils'
import { useDiscoveryNav } from '@/hooks/useDiscoveryNav'
import { DiscoveryPageHeader } from '@/components/optionDiscovery/DiscoveryPageHeader'
import { DiscoveryHint } from '@/components/optionDiscovery/DiscoveryHint'
import { DiscoverySection } from '@/components/optionDiscovery/DiscoverySection'
import { fmtUsd } from '@/lib/format'
import { OptionDiscoveryMaxPainPanel } from '@/components/optionDiscovery/OptionDiscoveryMaxPainPanel'
import { OptionDiscoveryAnalyticsPanel } from '@/components/optionDiscovery/OptionDiscoveryAnalytics'
import type { IvTermPoint, IvVolConePoint } from '@/components/optionDiscovery/OptionDiscoveryAnalytics'
import { OdLayerSection } from '@/components/optionDiscovery/OdLayerSection'
import { OdChainExpiryBubblePicker } from '@/components/optionDiscovery/OdChainExpiryBubblePicker'
import { OdSessionBar } from '@/components/optionDiscovery/OdSessionBar'
import { OdStickyToc } from '@/components/optionDiscovery/OdStickyToc'
import { OptionDiscoveryIvTermSection } from '@/components/optionDiscovery/OptionDiscoveryIvTermSection'
import { OptionDiscoveryCompareDrawer } from '@/components/optionDiscovery/OptionDiscoveryCompareDrawer'
import { OptionContractDrawer } from '@/components/optionDiscovery/OptionContractDrawer'
import { OptionContractDetailPanel } from '@/components/optionDiscovery/OptionContractDetailPanel'
import { StrikeLadderPanel, type StrikeOiPair } from '@/components/optionDiscovery/StrikeLadderPanel'
import { OptionChainQuotesSection } from '@/components/optionDiscovery/OptionChainQuotesSection'
import { useOptionContractLiquidity } from '@/components/optionDiscovery/useOptionContractLiquidity'
import { useDiscoverySession } from '@/hooks/useDiscoverySession'
import { useDiscoveryCompare } from '@/hooks/useDiscoveryCompare'
import { useWatchlistStkSymbols } from '@/hooks/useWatchlistStkSymbols'
import { useMassiveDiscoveryStatus, useMassiveDailyChecklist } from '@/hooks/useMassiveDiscoveryStatus'
import { useDiscoverySymbolBenchmark } from '@/hooks/useDiscoverySymbolBenchmark'
import { useDiscoveryGreeksCoverage } from '@/hooks/useDiscoveryGreeksCoverage'
import {
  computeDerivedMetrics,
  defaultSnapshotContractKey,
  effectiveQuotePremium,
  fmtIV,
  fmtOptNum,
  normalizeOptionRight,
  optionContractKey,
  parseDteNumeric,
} from '@/utils/optionDiscovery/optionContractMetrics'
import {
  type ExpirationKind,
  classifyExpiration,
  expirationDaysFromToday,
  isOptionExpirationPastNyClose,
  parseExpirationDateParts,
} from '@/utils/optionDiscovery/expirationMeta'
import {
  computeStrikesFromPreset,
  IV_TERM_DEFAULT_EXPIRATIONS,
  IV_TERM_MAX_EXPIRATIONS,
  CHAIN_COLUMN_LABEL,
} from '@/utils/optionDiscovery/strikePresets'

type ChainColumnId = keyof typeof CHAIN_COLUMN_LABEL

export default function DiscoveryPage() {
  const { openMassiveFeed } = useDiscoveryNav()
  const { symbols: stkSymbols } = useWatchlistStkSymbols()
  const { data: massiveStatus } = useMassiveDiscoveryStatus()
  const session = useDiscoverySession()
  const {
    selectedSymbol,
    setSelectedSymbol,
    selectedExpiration,
    setSelectedExpiration,
    underlyingInput,
    setUnderlyingInput,
    applyUnderlyingFromInput,
    strikeCountOption,
    setStrikeCountOption,
    stdDevOption,
    setStdDevOption,
    customStdDev,
    setCustomStdDev,
    strikeSideMode,
    setStrikeSideMode,
    chainColumnVisibility,
    toggleChainColumn,
    greeksSource,
    setGreeksSource,
  } = session
  const dailyChecklistQuery = useMassiveDailyChecklist(
    selectedSymbol,
    massiveStatus?.configured,
  )
  const dailyDims = dailyChecklistQuery.data?.ok && selectedSymbol.trim()
    ? dailyChecklistQuery.data.symbols?.[selectedSymbol.trim().toUpperCase()] ?? null
    : null
  const dailyDimsDate = dailyChecklistQuery.data?.trade_date ?? null
  const dailyDimsLoading = dailyChecklistQuery.isLoading
  const { data: symbolBenchmarkMap } = useDiscoverySymbolBenchmark(selectedSymbol)
  const {
    compareOpen,
    setCompareOpen,
    compareRows,
    setCompareRows,
    addToCompare: handleAddToCompare,
  } = useDiscoveryCompare()
  const [expirations, setExpirations] = useState<string[]>([])
  const [strikes, setStrikes] = useState<number[]>([])
  const [stockDayLastPrice, setStockDayLastPrice] = useState<number | null>(null)
  const [expirationsError, setExpirationsError] = useState<string | null>(null)
  const [expirationsLoading, setExpirationsLoading] = useState(false)
  const [expirationFilterKind, setExpirationFilterKind] = useState<ExpirationKind>('all')
  const [strikesLoading, setStrikesLoading] = useState(false)
  const [snapshotRows, setSnapshotRows] = useState<OptionSnapshotRow[]>([])
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [snapshotFeedback, setSnapshotFeedback] = useState<{
    level: 'error' | 'warning' | 'info'
    title?: string
    body: string
  } | null>(null)
  /** True after user clicked Load quotes at least once (avoids misleading empty hint). */
  const [snapshotLoadAttempted, setSnapshotLoadAttempted] = useState(false)
  /** After a Massive warning, poll PG until rows appear or timeout (no extra Celery enqueue). */
  const [snapshotPgWatching, setSnapshotPgWatching] = useState(false)
  const [snapshotPgWatchSecondsLeft, setSnapshotPgWatchSecondsLeft] = useState<number | null>(null)
  const snapshotWatchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const snapshotWatchGenRef = useRef(0)
  const [underlyingPrice, setUnderlyingPrice] = useState<number | null>(null)
  const [addWatchlistFeedback, setAddWatchlistFeedback] = useState<string | null>(null)
  const [multiSelectStrikes, setMultiSelectStrikes] = useState<number[]>([])
  const symbolDailyPrices = symbolBenchmarkMap ?? {}
  const otmCallWrapRef = useRef<HTMLDivElement>(null)

  // P0–P3: Contract detail panel state (stable `${strike}|C|P` key)
  const [selectedContractKey, setSelectedContractKey] = useState<string | null>(null)
  /** Timestamp of last successful option quotes load */
  const [lastQuotesLoadTs, setLastQuotesLoadTs] = useState<Date | null>(null)

  const { data: greeksCoverage } = useDiscoveryGreeksCoverage(
    selectedSymbol,
    selectedExpiration,
    snapshotRows.length,
  )

  // IV term structure (Phase 2)
  const [termPoints, setTermPoints] = useState<IvTermPoint[]>([])
  const [termLoading, setTermLoading] = useState(false)
  const [termError, setTermError] = useState<string | null>(null)
  const [conePoints, setConePoints] = useState<IvVolConePoint[]>([])
  const [coneError, setConeError] = useState<string | null>(null)
  /** Subset of `expirations` (same order as the expiration list) to send to IV term API */
  const [ivTermExpKeys, setIvTermExpKeys] = useState<string[]>([])
  /** Massive: enqueue chain snapshot jobs for IV-term selection, then reload IV term */
  const [ivTermSyncLoading, setIvTermSyncLoading] = useState(false)
  const [ivTermSyncStatus, setIvTermSyncStatus] = useState<string | null>(null)
  /** Dedupes auto IV term load per symbol + expiration selection */
  const ivTermAutoLoadKeyRef = useRef<string>('')

  /** Expiration table + IV term chart: same All/Std/Wk/Qtr filter */
  const visibleExpirations = useMemo(() => {
    const byKind =
      expirationFilterKind === 'all'
        ? expirations
        : expirations.filter(exp => classifyExpiration(exp) === expirationFilterKind)
    return byKind.filter(exp => !isOptionExpirationPastNyClose(exp))
  }, [expirations, expirationFilterKind])

  const stdDevValue = useMemo(() => {
    if (stdDevOption === 'custom') {
      const v = parseFloat(customStdDev)
      return Number.isFinite(v) && v > 0 ? v : 2
    }
    return Number(stdDevOption)
  }, [stdDevOption, customStdDev])

  const computedStrikes = useMemo(
    () =>
      computeStrikesFromPreset(strikes, stockDayLastPrice, strikeCountOption, stdDevValue),
    [strikes, stockDayLastPrice, strikeCountOption, stdDevValue],
  )

  const effectiveStrikes = useMemo(() => {
    if (multiSelectStrikes.length > 0) return multiSelectStrikes
    return computedStrikes
  }, [multiSelectStrikes, computedStrikes])

  /** Call/Put open interest per strike from last loaded quotes (for ladder energy bars). */
  const strikeOiByStrike = useMemo(() => {
    const m = new Map<number, StrikeOiPair>()
    for (const r of snapshotRows) {
      if (!Number.isFinite(r.strike)) continue
      const k = r.strike
      if (!m.has(k)) m.set(k, { c: null, p: null })
      const e = m.get(k)!
      const nr = normalizeOptionRight(r.right)
      const oi = r.open_interest != null && Number.isFinite(r.open_interest) ? r.open_interest : null
      if (nr === 'C') e.c = oi
      if (nr === 'P') e.p = oi
    }
    return m
  }, [snapshotRows])

  /** Scale OI bars within the current preset strike range. */
  const ladderOiMax = useMemo(() => {
    let max = 1
    for (const k of computedStrikes) {
      const o = strikeOiByStrike.get(k)
      if (!o) continue
      if (o.c != null) max = Math.max(max, o.c)
      if (o.p != null) max = Math.max(max, o.p)
    }
    return max
  }, [computedStrikes, strikeOiByStrike])

  const strikeLadderShowOi = snapshotRows.length > 0

  /** Stable key for PG watch cleanup when strike selection changes. */
  const strikesWatchKey = useMemo(
    () => effectiveStrikes.map(x => String(x)).join(','),
    [effectiveStrikes],
  )

  useEffect(() => {
    const el = otmCallWrapRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [computedStrikes, selectedSymbol])

  const loadExpirations = useCallback(async (symbol: string) => {
    const s = (symbol || '').trim()
    if (!s) {
      setExpirations([])
      setStrikes([])
      setStockDayLastPrice(null)
      setExpirationsError(null)
      setSelectedExpiration('')
      return
    }
    setExpirationsLoading(true)
    setExpirationsError(null)
    try {
      const res = await fetchOptionExpirations(s, 'massive')
      setExpirations(res.expirations || [])
      setStockDayLastPrice(res.last_price ?? null)
      setExpirationsError(res.error ?? null)
      const firstExp = (res.expirations && res.expirations.length > 0 ? res.expirations[0] : '') || ''
      setSelectedExpiration(firstExp)
      setStrikes([])
    } catch {
      setExpirations([])
      setStrikes([])
      setStockDayLastPrice(null)
      setExpirationsError('Failed to load expirations')
      setSelectedExpiration('')
    } finally {
      setExpirationsLoading(false)
    }
  }, [setSelectedExpiration])

  const loadStrikesForExpiration = useCallback(async (symbol: string, expiration: string) => {
    const s = (symbol || '').trim()
    const e = (expiration || '').trim()
    if (!s || !e) {
      setStrikes([])
      return
    }
    setStrikesLoading(true)
    try {
      const res = await fetchOptionExpirations(s, 'massive', { expiration: e })
      setStrikes(res.strikes ?? [])
      if (res.last_price != null) setStockDayLastPrice(res.last_price)
    } catch {
      setStrikes([])
    } finally {
      setStrikesLoading(false)
    }
  }, [])

  useEffect(() => {
    setMultiSelectStrikes([])
    setStrikes([])
    setStockDayLastPrice(null)
    if (selectedSymbol.trim()) {
      setExpirations([])
      setSelectedExpiration('')
      setExpirationsError(null)
      loadExpirations(selectedSymbol)
    } else {
      setExpirations([])
      setExpirationsError(null)
      setSelectedExpiration('')
    }
  }, [selectedSymbol, loadExpirations, setSelectedExpiration])

  useEffect(() => {
    setSnapshotLoadAttempted(false)
    setSnapshotFeedback(null)
  }, [selectedSymbol, selectedExpiration])

  useEffect(() => {
    setMultiSelectStrikes([])
    const sym = selectedSymbol.trim()
    const exp = selectedExpiration.trim()
    if (sym && exp) {
      loadStrikesForExpiration(sym, exp)
    } else {
      setStrikes([])
    }
  }, [selectedExpiration, selectedSymbol, loadStrikesForExpiration])

  const stopSnapshotPgWatch = useCallback(() => {
    snapshotWatchGenRef.current += 1
    if (snapshotWatchIntervalRef.current != null) {
      clearInterval(snapshotWatchIntervalRef.current)
      snapshotWatchIntervalRef.current = null
    }
    setSnapshotPgWatching(false)
    setSnapshotPgWatchSecondsLeft(null)
  }, [])

  /** Poll PostgreSQL only (no new Celery job) until rows exist or timeout. */
  const startSnapshotPgWatch = useCallback((sym: string, exp: string, strikesCsv: string | undefined) => {
    if (snapshotWatchIntervalRef.current != null) {
      clearInterval(snapshotWatchIntervalRef.current)
      snapshotWatchIntervalRef.current = null
    }
    const gen = ++snapshotWatchGenRef.current
    const intervalMs = 3000
    const maxMs = 120_000
    const deadline = Date.now() + maxMs
    setSnapshotPgWatching(true)
    setSnapshotPgWatchSecondsLeft(Math.ceil(maxMs / 1000))

    const runTick = async () => {
      if (snapshotWatchGenRef.current !== gen) return
      const leftSec = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setSnapshotPgWatchSecondsLeft(leftSec)
      if (leftSec <= 0) {
        if (snapshotWatchGenRef.current === gen) {
          if (snapshotWatchIntervalRef.current != null) {
            clearInterval(snapshotWatchIntervalRef.current)
            snapshotWatchIntervalRef.current = null
          }
          setSnapshotPgWatching(false)
          setSnapshotPgWatchSecondsLeft(null)
        }
        return
      }
      try {
        const sn = await fetchOptionSnapshotsPg(sym, exp, strikesCsv, 'massive')
        if (snapshotWatchGenRef.current !== gen) return
        const rows = sn.rows ?? []
        if (rows.length > 0) {
          setSnapshotRows(rows)
          const up =
            sn.underlying_price != null && Number.isFinite(Number(sn.underlying_price))
              ? Number(sn.underlying_price)
              : null
          setSelectedContractKey(defaultSnapshotContractKey(rows, up, stockDayLastPrice))
          if (up != null) {
            setUnderlyingPrice(up)
          }
          setSnapshotFeedback(null)
          if (snapshotWatchIntervalRef.current != null) {
            clearInterval(snapshotWatchIntervalRef.current)
            snapshotWatchIntervalRef.current = null
          }
          setSnapshotPgWatching(false)
          setSnapshotPgWatchSecondsLeft(null)
        }
      } catch {
        /* ignore transient errors while watching */
      }
    }

    void runTick()
    snapshotWatchIntervalRef.current = setInterval(() => { void runTick() }, intervalMs)
  }, [stockDayLastPrice])

  useEffect(() => {
    stopSnapshotPgWatch()
  }, [selectedSymbol, selectedExpiration, strikesWatchKey, stopSnapshotPgWatch])

  useEffect(() => () => { stopSnapshotPgWatch() }, [stopSnapshotPgWatch])

  const loadIvTermStructure = useCallback(async () => {
    const sym = selectedSymbol.trim()
    const ordered = expirations.filter(e => ivTermExpKeys.includes(e))
    if (!sym || ordered.length < 2) return
    setTermLoading(true)
    setTermError(null)
    setConeError(null)
    setTermPoints([])
    setConePoints([])
    try {
      const expSlice = ordered.slice(0, IV_TERM_MAX_EXPIRATIONS)
      const [res, coneRes] = await Promise.all([
        fetchIvTermStructure(sym, expSlice, 'massive'),
        fetchIvVolatilityCone(sym, expSlice, 'massive', 90),
      ])
      if (!res.ok) {
        setTermError(res.error ?? 'Failed to load IV term structure')
      } else {
        const pts = res.points ?? []
        if (pts.length < 2) {
          setTermError(
            'Not enough ATM IV in PostgreSQL for the checked expirations (need ≥2 with IV). Use Backfill snapshots (Massive) to enqueue chain jobs for the selection, or Load quotes in section 4 per expiration. You can check any expirations (up to 12), not only the first eight.',
          )
        } else {
          setTermError(null)
        }
        setTermPoints(pts)
      }
      if (!coneRes.ok) {
        setConeError(coneRes.error ?? 'Failed to load IV volatility cone')
        setConePoints([])
      } else {
        setConeError(null)
        setConePoints(coneRes.points ?? [])
      }
    } catch (e) {
      setTermError(e instanceof Error ? e.message : 'Failed to load IV term structure')
      setConeError(e instanceof Error ? e.message : 'Failed to load IV volatility cone')
    } finally {
      setTermLoading(false)
    }
  }, [selectedSymbol, expirations, ivTermExpKeys])

  useEffect(() => {
    if (!massiveStatus?.configured) return
    const sym = selectedSymbol.trim()
    if (!sym || expirationsLoading || expirationsError) return
    if (ivTermExpKeys.length < 2) return
    if (ivTermSyncLoading) return
    const key = `${sym}|${ivTermExpKeys.join(',')}`
    if (ivTermAutoLoadKeyRef.current === key) return
    const tid = window.setTimeout(() => {
      ivTermAutoLoadKeyRef.current = key
      void loadIvTermStructure()
    }, 400)
    return () => window.clearTimeout(tid)
  }, [
    massiveStatus?.configured,
    selectedSymbol,
    ivTermExpKeys,
    expirationsLoading,
    expirationsError,
    ivTermSyncLoading,
    loadIvTermStructure,
  ])

  const syncIvTermMassiveSnapshots = useCallback(async () => {
    const sym = selectedSymbol.trim()
    const ordered = expirations.filter(e => ivTermExpKeys.includes(e)).slice(0, IV_TERM_MAX_EXPIRATIONS)
    if (!sym || ordered.length < 2) return
    setIvTermSyncLoading(true)
    setTermError(null)
    setIvTermSyncStatus(null)
    try {
      for (let i = 0; i < ordered.length; i++) {
        const exp = ordered[i]
        setIvTermSyncStatus(`Massive chain snapshot ${i + 1}/${ordered.length} (${exp})…`)
        const massiveChainPayload: Record<string, unknown> = {
          underlying: sym,
          mode: 'chain',
          expiration_date: exp,
          limit: 250,
        }
        if (effectiveStrikes.length > 0) {
          massiveChainPayload.strike_price_gte = Math.min(...effectiveStrikes)
          massiveChainPayload.strike_price_lte = Math.max(...effectiveStrikes)
        }
        const sync = await postMassiveSync('feed_option_snapshots', massiveChainPayload)
        const jobId = resolveMassiveSyncJobId(sync)
        if (!sync.ok || !jobId) {
          setTermError(sync.error ?? sync.message ?? `Massive sync failed for ${exp}`)
          return
        }
        const polled = await pollMassiveJobUntilDone(jobId, { maxAttempts: 120, intervalMs: 1000 })
        if (!polled.ok) {
          setTermError(polled.error ?? `Massive job failed for ${exp}`)
          return
        }
      }
      setIvTermSyncStatus('Loading IV term structure…')
      await loadIvTermStructure()
    } catch (e) {
      setTermError(e instanceof Error ? e.message : 'Backfill failed')
    } finally {
      setIvTermSyncLoading(false)
      setIvTermSyncStatus(null)
    }
  }, [selectedSymbol, expirations, ivTermExpKeys, effectiveStrikes, loadIvTermStructure])

  const toggleIvTermExpiration = useCallback(
    (exp: string, checked: boolean) => {
      setIvTermExpKeys(prev => {
        const set = new Set(prev)
        if (checked) {
          if (set.size >= IV_TERM_MAX_EXPIRATIONS) return prev
          set.add(exp)
        } else {
          if (set.size <= 2 && set.has(exp)) return prev
          set.delete(exp)
        }
        return expirations.filter(e => set.has(e) && visibleExpirations.includes(e))
      })
    },
    [expirations, visibleExpirations],
  )

  const resetIvTermExpirationsToDefault = useCallback(() => {
    setIvTermExpKeys(visibleExpirations.slice(0, IV_TERM_DEFAULT_EXPIRATIONS).slice(0, IV_TERM_MAX_EXPIRATIONS))
  }, [visibleExpirations])

  const selectAllIvTermExpirations = useCallback(() => {
    setIvTermExpKeys(visibleExpirations.slice(0, IV_TERM_MAX_EXPIRATIONS))
  }, [visibleExpirations])

  /** Clears extra checks; keeps the first two expirations (minimum required for IV term). */
  const uncheckAllIvTermExpirations = useCallback(() => {
    if (visibleExpirations.length < 2) return
    setIvTermExpKeys(visibleExpirations.slice(0, 2))
  }, [visibleExpirations])

  useEffect(() => {
    setTermPoints([])
    setTermError(null)
    setConePoints([])
    setConeError(null)
    setIvTermExpKeys([])
    setIvTermSyncLoading(false)
    setIvTermSyncStatus(null)
    ivTermAutoLoadKeyRef.current = ''
  }, [selectedSymbol])

  useEffect(() => {
    if (visibleExpirations.length < 2) {
      setIvTermExpKeys([])
      return
    }
    setIvTermExpKeys(prev => {
      const def = visibleExpirations.slice(0, IV_TERM_DEFAULT_EXPIRATIONS).slice(0, IV_TERM_MAX_EXPIRATIONS)
      if (prev.length === 0) return def
      const kept = visibleExpirations.filter(e => prev.includes(e))
      if (kept.length >= 2) return kept.slice(0, IV_TERM_MAX_EXPIRATIONS)
      return def
    })
  }, [visibleExpirations])

  /** Full chain / strikes / quotes: stay on a valid row; default to first expiration after All/Std/Wk/Qtr filter. */
  useEffect(() => {
    if (visibleExpirations.length === 0) {
      setSelectedExpiration('')
      return
    }
    setSelectedExpiration(prev => (visibleExpirations.includes(prev) ? prev : visibleExpirations[0]))
  }, [visibleExpirations, setSelectedExpiration])

  const loadQuotes = useCallback(async () => {
    const sym = selectedSymbol.trim()
    const exp = selectedExpiration.trim()
    if (!sym || !exp) return
    const strikesToSend = effectiveStrikes.length > 0 ? effectiveStrikes : undefined
    stopSnapshotPgWatch()
    setSnapshotLoading(true)
    setSnapshotFeedback(null)
    setAddWatchlistFeedback(null)
    setSelectedContractKey(null)
    setSnapshotLoadAttempted(true)
    try {
      // ── Massive path ──
      // Chain snapshot must match UI expiry/strikes: default API is ~10 rows with no filters (wrong contracts).
      const massiveChainPayload: Record<string, unknown> = {
        underlying: sym,
        mode: 'chain',
        expiration_date: exp,
        limit: 250,
      }
      if (strikesToSend && strikesToSend.length > 0) {
        const mn = Math.min(...strikesToSend)
        const mx = Math.max(...strikesToSend)
        massiveChainPayload.strike_price_gte = mn
        massiveChainPayload.strike_price_lte = mx
      }
      const sync = await postMassiveSync('feed_option_snapshots', massiveChainPayload)
      const jobId = resolveMassiveSyncJobId(sync)
      if (!sync.ok || !jobId) {
        setSnapshotFeedback({ level: 'error', title: 'Sync failed', body: sync.error ?? sync.message ?? 'Massive sync failed' })
        setSnapshotRows([])
        setUnderlyingPrice(null)
        return
      }
      const polled = await pollMassiveJobUntilDone(jobId, { maxAttempts: 120, intervalMs: 1000 })
      if (!polled.ok) {
        setSnapshotFeedback({ level: 'error', title: 'Job failed', body: polled.error ?? 'Massive job failed' })
        setSnapshotRows([])
        setUnderlyingPrice(null)
        return
      }
      const strikesCsv =
        strikesToSend && strikesToSend.length > 0 ? strikesToSend.map(x => String(x)).join(',') : undefined
      const sn = await fetchOptionSnapshotsPg(sym, exp, strikesCsv, 'massive')
      const rows = sn.rows ?? []
      setSnapshotRows(rows)
      setLastQuotesLoadTs(new Date())
      const up =
        sn.underlying_price != null && Number.isFinite(Number(sn.underlying_price))
          ? Number(sn.underlying_price)
          : null
      setUnderlyingPrice(up)

      if (rows.length > 0) {
        setSelectedContractKey(defaultSnapshotContractKey(rows, up, stockDayLastPrice))
        setSnapshotFeedback(null)
        return
      }

      // rows empty — determine the right feedback level
      if (sn.error) {
        setSnapshotFeedback({ level: 'error', body: sn.error })
        return
      }
      if (sn.warning) {
        setSnapshotFeedback({ level: 'warning', title: 'No snapshot rows matched', body: sn.warning })
        startSnapshotPgWatch(sym, exp, strikesCsv)
        return
      }

      // Neither error nor warning from backend — inspect job result
      const jobRes = await fetchMassiveJob(jobId)
      const result = jobRes.job?.result as Record<string, unknown> | undefined
      const rw = result?.rows_written
      if (typeof rw === 'number' && rw === 0) {
        setSnapshotFeedback({
          level: 'warning',
          title: 'Snapshot wrote 0 rows',
          body: 'Massive chain snapshot completed but wrote 0 rows. The API may have returned empty data, or the Celery worker skipped inserts. Check Massive API key, symbol validity, and Celery logs.',
        })
      } else if (typeof rw === 'number' && rw > 0) {
        setSnapshotFeedback({
          level: 'warning',
          title: 'Contract key mismatch',
          body: `${rw} rows were written to PostgreSQL but none matched this expiration/strikes. Verify that the selected expiry and strikes exist in the Massive chain data.`,
        })
      } else {
        setSnapshotFeedback({
          level: 'warning',
          body: 'No quotes returned. Ensure Celery worker is running and consuming the Massive snapshot queue.',
        })
      }
      startSnapshotPgWatch(sym, exp, strikesCsv)
    } catch (e) {
      setSnapshotFeedback({ level: 'error', body: e instanceof Error ? e.message : 'Failed to load quotes' })
      setSnapshotRows([])
      setUnderlyingPrice(null)
    } finally {
      setSnapshotLoading(false)
    }
  }, [selectedSymbol, selectedExpiration, effectiveStrikes, stopSnapshotPgWatch, startSnapshotPgWatch, stockDayLastPrice])

  useEffect(() => {
    const sym = selectedSymbol.trim()
    const exp = selectedExpiration.trim()
    if (!sym || !exp) return
    const timer = window.setTimeout(() => { void loadQuotes() }, 400)
    return () => window.clearTimeout(timer)
  }, [selectedSymbol, selectedExpiration, strikesWatchKey, loadQuotes])

  const handleAddToWatchlist = useCallback(
    async (row: OptionSnapshotRow) => {
      const sym = selectedSymbol.trim()
      const exp = selectedExpiration.trim()
      if (!sym || !exp) return
      const contract_key = `${sym}|OPT|${exp}|${row.strike}|${row.right}`
      setAddWatchlistFeedback(null)
      const res = await postWatchlistItem({
        contract_key,
        symbol: sym,
        sec_type: 'OPT',
        expiry: exp,
        strike: row.strike,
        option_right: row.right,
        source: 'option_discovery',
      })
      if (res.ok) setAddWatchlistFeedback(contract_key)
      else setAddWatchlistFeedback(res.error ?? 'Add failed')
    },
    [selectedSymbol, selectedExpiration],
  )

  const eventContextWarnings = useMemo(() => {
    const warnings: string[] = []
    const dte = parseDteNumeric(selectedExpiration)
    if (dte != null && dte <= 3) warnings.push(`DTE is ${dte} — high theta decay, exercise/assignment risk.`)
    if (dte != null && dte === 0) warnings.push('Expiration day — avoid market orders, liquidity may vanish.')
    if (greeksCoverage?.freshness?.stale_rows != null && greeksCoverage.freshness.stale_rows > 0) {
      warnings.push(`${greeksCoverage.freshness.stale_rows} stale snapshot row(s) older than 24h.`)
    }
    return warnings
  }, [selectedExpiration, greeksCoverage])

  // Derived: selected row and its metrics
  const selectedRow = useMemo(() => {
    if (!selectedContractKey) return null
    return snapshotRows.find(r => optionContractKey(r) === selectedContractKey) ?? null
  }, [snapshotRows, selectedContractKey])

  const selectedDerived = useMemo(() => {
    if (!selectedRow) return null
    return computeDerivedMetrics(selectedRow, underlyingPrice)
  }, [selectedRow, underlyingPrice])

  const {
    liquidityLastTrade,
    liquidityQuoteCount,
    liquidityLoading,
    serverLiquidity,
    serverRelativeValue,
  } = useOptionContractLiquidity(selectedSymbol, selectedExpiration, selectedRow)

  // overviewMidDisplay removed — Price card now shows day OHLC instead of bid/ask/mid

  const canLoadQuotes = selectedSymbol.trim() !== '' && selectedExpiration.trim() !== '' && !snapshotLoading

  const showCallSide = strikeSideMode === 'all' || strikeSideMode === 'call'
  const showPutSide = strikeSideMode === 'all' || strikeSideMode === 'put'

  const chainColumnList = useMemo((): ChainColumnId[] => {
    const order: ChainColumnId[] = [
      'day_open',
      'day_high',
      'day_low',
      'day_close',
      'day_vol',
      ...(['iv', 'delta', 'gamma', 'theta', 'vega', 'oi'] as const satisfies readonly ChainColumnId[]),
    ]
    return order.filter(id => chainColumnVisibility[id] !== false)
  }, [chainColumnVisibility])

  const chainStrikesSorted = useMemo(() => {
    const set = new Set<number>()
    for (const r of snapshotRows) {
      if (Number.isFinite(r.strike)) set.add(r.strike)
    }
    return [...set].sort((a, b) => a - b)
  }, [snapshotRows])

  const rowIndexByStrikeRight = useMemo(() => {
    const m = new Map<string, number>()
    snapshotRows.forEach((row, idx) => {
      const nr = normalizeOptionRight(row.right)
      if (nr != null) m.set(`${row.strike}|${nr}`, idx)
    })
    return m
  }, [snapshotRows])

  /** BS-computed Greeks for every snapshot row (used when greeksSource === 'bs'). */
  const bsRowValues = useMemo(() => {
    if (snapshotRows.length === 0 || underlyingPrice == null) return [] as (ReturnType<typeof bsComputeDetail> | null)[]
    const parts = parseExpirationDateParts(selectedExpiration)
    if (!parts) return [] as (ReturnType<typeof bsComputeDetail> | null)[]
    const { y, m, d } = parts
    const expDate = new Date(y, m, d)
    expDate.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dteDays = Math.max(0, Math.round((expDate.getTime() - today.getTime()) / 86400000))
    if (dteDays === 0) return [] as (ReturnType<typeof bsComputeDetail> | null)[]
    const tYears = dteDays / 365
    return snapshotRows.map(row => {
      const mktPrice = effectiveQuotePremium(row)
      if (mktPrice == null) return null
      return bsComputeDetail({ marketPrice: mktPrice, S: underlyingPrice, K: row.strike, tYears, r: 0.045, right: row.right })
    })
  }, [snapshotRows, underlyingPrice, selectedExpiration])

  const renderChainSideCells = useCallback(
    (
      side: 'call' | 'put',
      row: OptionSnapshotRow | undefined,
      rowIdx: number | null,
      sideSelected: boolean,
    ) =>
      chainColumnList.map(col => {
        const key = `${side}-${col}`
        let cell: string = '—'
        if (row) {
          switch (col) {
            case 'day_open':
              cell = row.day_open != null ? fmtUsd(row.day_open) : '—'
              break
            case 'day_high':
              cell = row.day_high != null ? fmtUsd(row.day_high) : '—'
              break
            case 'day_low':
              cell = row.day_low != null ? fmtUsd(row.day_low) : '—'
              break
            case 'day_close':
              cell = row.day_close != null ? fmtUsd(row.day_close) : '—'
              break
            case 'day_vol':
              cell = row.day_volume != null ? String(row.day_volume) : '—'
              break
            case 'iv': {
              const bsRow = greeksSource === 'bs' && rowIdx != null ? bsRowValues[rowIdx] : null
              cell = bsRow != null ? fmtIV(bsRow.iv) : fmtIV(row.iv)
              break
            }
            case 'delta': {
              const bsRow = greeksSource === 'bs' && rowIdx != null ? bsRowValues[rowIdx] : null
              cell = bsRow != null ? (bsRow.delta != null ? bsRow.delta.toFixed(4) : '—') : fmtOptNum(row.delta, 4)
              break
            }
            case 'gamma': {
              const bsRow = greeksSource === 'bs' && rowIdx != null ? bsRowValues[rowIdx] : null
              cell = bsRow != null ? (bsRow.gamma != null ? bsRow.gamma.toFixed(4) : '—') : fmtOptNum(row.gamma, 4)
              break
            }
            case 'theta': {
              const bsRow = greeksSource === 'bs' && rowIdx != null ? bsRowValues[rowIdx] : null
              cell = bsRow != null ? (bsRow.thetaPerDay != null ? bsRow.thetaPerDay.toFixed(4) : '—') : fmtOptNum(row.theta, 4)
              break
            }
            case 'vega': {
              const bsRow = greeksSource === 'bs' && rowIdx != null ? bsRowValues[rowIdx] : null
              cell = bsRow != null ? (bsRow.vegaPer1Pct != null ? bsRow.vegaPer1Pct.toFixed(4) : '—') : fmtOptNum(row.vega, 4)
              break
            }
            case 'oi':
              cell = row.open_interest != null ? String(row.open_interest) : '—'
              break
            default:
              break
          }
        }
        return (
          <TableCell
            key={key}
            className={cn(
              'cursor-pointer py-1 text-right font-mono text-xs tabular-nums',
              sideSelected && 'bg-accent/20',
            )}
            onClick={e => {
              e.stopPropagation()
              if (rowIdx != null) {
                const row = snapshotRows[rowIdx]
                const k = row ? optionContractKey(row) : null
                if (k) setSelectedContractKey(selectedContractKey === k ? null : k)
              }
            }}
          >
            {cell}
          </TableCell>
        )
      }),
    [chainColumnList, selectedContractKey, greeksSource, bsRowValues, snapshotRows],
  )


  return (
    <PageShell padding="default" className={discoveryStyles.discoveryRoot}>
      <DiscoveryPageHeader massiveStatus={massiveStatus ?? null} />

      <OdSessionBar
        massiveStatus={massiveStatus ?? null}
        selectedSymbol={selectedSymbol}
        dailyDims={dailyDims}
        dailyDimsDate={dailyDimsDate}
        dailyDimsLoading={dailyDimsLoading}
        onOpenMassiveFeed={openMassiveFeed}
      />

      {/* ── Full-width main: controls + layers ── */}
      <div className="mt-3">
        <div className="w-full min-w-0">
          <div className="flex flex-col gap-4 min-w-0">
            <div className="sticky top-2 z-[3] -mx-1 rounded-lg border border-border bg-card shadow-sm overflow-visible">
              <div
                className="grid min-w-0 grid-cols-1 items-stretch gap-3 border-b border-border p-2 px-3"
                aria-label="Underlying selection"
              >
                <DiscoverySection first className="flex min-h-0 min-w-0 flex-col" aria-label="Underlying">
                  <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col items-stretch">
                    <div className="flex w-full min-w-0 flex-wrap items-center gap-x-2.5 gap-y-2">
                      <label
                        className="shrink-0 text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground"
                        htmlFor="od-underlying-manual-input"
                      >
                        Symbol
                      </label>
                      <Input
                        id="od-underlying-manual-input"
                        className="min-w-0 max-w-48 flex-[1_1_140px] font-mono font-semibold tabular-nums"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="e.g. NVDA"
                        value={underlyingInput}
                        onChange={e => setUnderlyingInput(e.target.value.toUpperCase())}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            applyUnderlyingFromInput()
                          }
                        }}
                        aria-label="Underlying symbol"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="shrink-0"
                        onClick={() => applyUnderlyingFromInput()}
                      >
                        Apply
                      </Button>
                    </div>
                    {stkSymbols.length > 0 ? (
                      <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-2">
                        <span
                          className="shrink-0 text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground"
                          id="od-underlying-bubbles-label"
                        >
                          Wishlist
                        </span>
                        <div
                          className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5"
                          role="group"
                          aria-labelledby="od-underlying-bubbles-label"
                        >
                          {stkSymbols.map(sym => {
                            const symU = sym.toUpperCase()
                            const px = symbolDailyPrices[symU] ?? symbolDailyPrices[sym]
                            const priceLabel = px != null ? fmtUsd(px) : '—'
                            const active = selectedSymbol.trim().toUpperCase() === symU
                            return (
                              <button
                                key={sym}
                                type="button"
                                className={cn(
                                  'inline-flex cursor-pointer items-center justify-center gap-1 rounded-full border px-2.5 py-0.5',
                                  'border-border/80 bg-secondary text-foreground transition-colors',
                                  'hover:border-primary/35 hover:bg-accent/10',
                                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                                  active && 'border-primary/55 bg-accent/15 shadow-inner',
                                )}
                                onClick={() => setSelectedSymbol(symU)}
                                aria-pressed={active}
                                aria-label={`${symU}, daily price ${priceLabel}`}
                                title={`${symU} · ${priceLabel} (daily)`}
                              >
                                <span className="inline-flex max-w-full min-w-0 flex-nowrap items-baseline whitespace-nowrap">
                                  <span className="text-[0.78rem] font-bold tabular-nums tracking-wide">
                                    {symU}
                                  </span>
                                  <span className="text-muted-foreground text-[0.7rem] font-medium" aria-hidden>
                                    {' '}
                                    ·{' '}
                                  </span>
                                  <span className="text-[0.65rem] font-semibold tabular-nums text-muted-foreground">
                                    {priceLabel}
                                  </span>
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <DiscoveryHint className="mt-2" role="status">
                        Add optionable STK symbols to Watchlist for quick picks, or type a symbol above and Apply.
                      </DiscoveryHint>
                    )}
                  </div>
                </DiscoverySection>
              </div>

              <OdStickyToc
                selectedSymbol={selectedSymbol}
                selectedExpiration={selectedExpiration}
                underlyingPrice={underlyingPrice}
                compareCount={compareRows.length}
                onOpenCompare={() => setCompareOpen(true)}
              />
            </div>

            <OdLayerSection
              id="od-layer-1"
              step={1}
              title="Underlying & IV term structure"
              subtitle="ATM IV across listed expirations (not limited to the selected expiry)."
              enabled={selectedSymbol.trim() !== ''}
              lockedHint="Select an underlying symbol above."
            >
              <OptionDiscoveryIvTermSection
                symbol={selectedSymbol}
                filteredExpirations={visibleExpirations}
                expirationFilterKind={expirationFilterKind}
                onExpirationFilterKindChange={setExpirationFilterKind}
                selectedExpirations={ivTermExpKeys}
                onToggleExpiration={toggleIvTermExpiration}
                onResetExpirationsToDefault={resetIvTermExpirationsToDefault}
                onSelectAllExpirations={selectAllIvTermExpirations}
                onUncheckAllExpirations={uncheckAllIvTermExpirations}
                maxExpirations={IV_TERM_MAX_EXPIRATIONS}
                defaultExpirationCount={IV_TERM_DEFAULT_EXPIRATIONS}
                massiveBackfillAvailable={Boolean(massiveStatus?.configured)}
                onBackfillMassiveSnapshots={syncIvTermMassiveSnapshots}
                snapshotSyncLoading={ivTermSyncLoading}
                snapshotSyncStatus={ivTermSyncStatus}
                onLoad={loadIvTermStructure}
                termPoints={termPoints}
                termLoading={termLoading}
                termError={termError}
                conePoints={conePoints}
                coneError={coneError}
                expirationsLoading={expirationsLoading}
                expirationsError={expirationsError}
              />
            </OdLayerSection>

            <OdLayerSection
              id="od-layer-2"
              step={2}
              title="Expiration · full chain"
              subtitle="Choose chain and quotes expiry below. Max pain and OI use that expiration (EOD-style). Defaults to the first expiry under the current filter when valid."
              enabled={selectedSymbol.trim() !== '' && visibleExpirations.length > 0}
              lockedHint="Select an underlying and wait for expirations (section 1), or widen All/Std/Wk/Qtr."
            >
              {selectedSymbol.trim() !== '' && (
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <label
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground shrink-0"
                    htmlFor="od-chain-expiry-select"
                  >
                    Chain / quotes expiry
                  </label>
                  <OdChainExpiryBubblePicker
                    stripId="od-chain-expiry-select"
                    options={visibleExpirations}
                    value={selectedExpiration}
                    onChange={setSelectedExpiration}
                    disabled={visibleExpirations.length === 0}
                    aria-label="Chain and quotes expiration date"
                  />
                  {visibleExpirations.length === 0 && (
                    <DiscoveryHint as="span" className="mt-0" role="status">
                      No expirations for this symbol or filter.
                    </DiscoveryHint>
                  )}
                </div>
              )}
              {selectedSymbol.trim() !== '' && selectedExpiration.trim() !== '' && (
                <div
                  className="option-discovery-full-chain"
                  data-analytics-scope="full-chain"
                  aria-label="Full chain"
                >
                  <OptionDiscoveryMaxPainPanel
                    symbol={selectedSymbol}
                    expiration={selectedExpiration}
                    massiveConfigured={Boolean(massiveStatus?.configured)}
                  />
                </div>
              )}
            </OdLayerSection>

            <OdLayerSection
              id="od-layer-3"
              step={3}
              title="Strike window & option analytics"
              subtitle="Adjust the strike ladder, then review IV smile, OI, and gamma exposure for the loaded snapshot."
              enabled={selectedSymbol.trim() !== '' && selectedExpiration.trim() !== ''}
              lockedHint="Select symbol and chain expiry in section 2."
            >
          {/* Strike window (collapsible) */}
          <details className="group rounded-lg border border-border bg-card/50 open:pb-2" open aria-label="Strike window">
            <summary className="cursor-pointer list-none px-3 py-2 font-medium [&::-webkit-details-marker]:hidden">
              <span className="inline-flex flex-wrap items-baseline gap-2">
                Strike window
                <DiscoveryHint as="span" className="mt-0 text-xs font-normal">
                  {effectiveStrikes.length} selected · {computedStrikes.length} in range
                </DiscoveryHint>
              </span>
            </summary>
            <div className="px-3 pb-2">
              <DiscoveryHint className="mb-2">
                Select strikes for the option chain table and window-scoped charts below.
              </DiscoveryHint>
              <StrikeLadderPanel
                strikesLoading={strikesLoading}
                computedStrikes={computedStrikes}
                effectiveStrikes={effectiveStrikes}
                multiSelectStrikes={multiSelectStrikes}
                setMultiSelectStrikes={setMultiSelectStrikes}
                stockDayLastPrice={stockDayLastPrice}
                strikeCountOption={strikeCountOption}
                setStrikeCountOption={setStrikeCountOption}
                stdDevOption={stdDevOption}
                setStdDevOption={setStdDevOption}
                customStdDev={customStdDev}
                setCustomStdDev={setCustomStdDev}
                strikeSideMode={strikeSideMode}
                setStrikeSideMode={setStrikeSideMode}
                strikeLadderShowOi={strikeLadderShowOi}
                ladderOiMax={ladderOiMax}
                strikeOiByStrike={strikeOiByStrike}
                strikesAvailable={strikes.length > 0}
                otmCallWrapRef={otmCallWrapRef}
              />
            </div>
          </details>

          {/* Strike-window scope: snapshotRows / effectiveStrikes — not EOD full chain. */}
          <div
            className="option-discovery-view-scope"
            data-analytics-scope="strike-window"
            aria-label="Strike window scope"
          >
            <DiscoveryHint className=" option-discovery-view-scope-hint" id="option-discovery-view-scope-hint">
              Scoped to the selected strike window.
            </DiscoveryHint>

          {/* Option Analytics — uses snapshotRows (strike selection) */}
          {selectedSymbol.trim() !== '' && selectedExpiration.trim() !== '' &&
            snapshotRows.length > 0 && !snapshotLoading && (
            <div
              className="od-option-structure-stack"
              aria-label="Option analytics"
              aria-describedby="option-discovery-view-scope-hint"
            >
              <OptionDiscoveryAnalyticsPanel
                rows={snapshotRows}
                underlying={underlyingPrice}
              />
            </div>
          )}
          </div>

            </OdLayerSection>

            <OdLayerSection
              id="od-layer-4"
              step={4}
              title="Option quotes & contract"
              subtitle="Refresh Massive snapshots, browse the chain, then open a contract for liquidity, risk, and K-line."
              enabled={selectedSymbol.trim() !== '' && selectedExpiration.trim() !== ''}
              lockedHint="Select symbol and chain expiry in section 2."
            >
          <OptionChainQuotesSection
            lastQuotesLoadTs={lastQuotesLoadTs}
            greeksSource={greeksSource}
            onGreeksSourceChange={setGreeksSource}
            onRefreshQuotes={() => void loadQuotes()}
            canLoadQuotes={canLoadQuotes}
            snapshotLoading={snapshotLoading}
            underlyingPrice={underlyingPrice}
            addWatchlistFeedback={addWatchlistFeedback}
            snapshotFeedback={snapshotFeedback}
            snapshotPgWatching={snapshotPgWatching}
            snapshotPgWatchSecondsLeft={snapshotPgWatchSecondsLeft}
            onPullNow={() => void loadQuotes()}
            openMassiveFeed={openMassiveFeed}
            chainColumnVisibility={chainColumnVisibility}
            onToggleChainColumn={toggleChainColumn}
            chainColumnList={chainColumnList}
            strikeSideMode={strikeSideMode}
            showCallSide={showCallSide}
            showPutSide={showPutSide}
            chainStrikesSorted={chainStrikesSorted}
            rowIndexByStrikeRight={rowIndexByStrikeRight}
            snapshotRows={snapshotRows}
            selectedContractKey={selectedContractKey}
            onSelectContractKey={setSelectedContractKey}
            snapshotLoadAttempted={snapshotLoadAttempted}
            renderChainSideCells={renderChainSideCells}
          />

            </OdLayerSection>

          <OptionContractDrawer open={Boolean(selectedRow && selectedDerived)}>
            {selectedRow && selectedDerived ? (
              <OptionContractDetailPanel
                symbol={selectedSymbol}
                expiration={selectedExpiration}
                underlyingPrice={underlyingPrice}
                selectedRow={selectedRow}
                selectedDerived={selectedDerived}
                snapshotRows={snapshotRows}
                greeksCoverage={greeksCoverage ?? null}
                eventContextWarnings={eventContextWarnings}
                greeksSource={greeksSource}
                onGreeksSourceChange={setGreeksSource}
                liquidityLastTrade={liquidityLastTrade}
                liquidityQuoteCount={liquidityQuoteCount}
                liquidityLoading={liquidityLoading}
                serverLiquidity={serverLiquidity}
                serverRelativeValue={serverRelativeValue}
                onClose={() => setSelectedContractKey(null)}
                onAddToWatchlist={() => void handleAddToWatchlist(selectedRow)}
                onAddToCompare={() => {
                  handleAddToCompare(selectedRow)
                  setCompareOpen(true)
                }}
              />
            ) : null}
          </OptionContractDrawer>

          <OptionDiscoveryCompareDrawer
            open={compareOpen}
            onClose={() => setCompareOpen(false)}
            rows={compareRows}
            symbol={selectedSymbol}
            expiration={selectedExpiration}
            dteLabel={expirationDaysFromToday(selectedExpiration)}
            onRemove={i => setCompareRows(prev => prev.filter((_, j) => j !== i))}
            onClear={() => setCompareRows([])}
          />
        </div>{/* end option-discovery-main-inner */}
        </div>{/* end option-discovery-main */}
      </div>{/* end option-discovery-layout */}
    </PageShell>
  )
}
