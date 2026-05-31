/* eslint-disable react-hooks/set-state-in-effect -- snapshot PG watch and auto-reload on chain params */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchOptionSnapshotsPg,
  fetchMassiveJob,
  pollMassiveJobUntilDone,
  postMassiveSync,
  resolveMassiveSyncJobId,
} from '@/api/research/optionDiscovery'
import type { OptionSnapshotRow } from '@/types/optionDiscovery'
import { defaultSnapshotContractKey } from '@/utils/optionDiscovery/optionContractMetrics'

export type SnapshotFeedback = {
  level: 'error' | 'warning' | 'info'
  title?: string
  body: string
}

type Params = {
  selectedSymbol: string
  selectedExpiration: string
  effectiveStrikes: number[]
  strikesWatchKey: string
  stockDayLastPrice: number | null
}

export function useDiscoverySnapshots({
  selectedSymbol,
  selectedExpiration,
  effectiveStrikes,
  strikesWatchKey,
  stockDayLastPrice,
}: Params) {
  const [snapshotRows, setSnapshotRows] = useState<OptionSnapshotRow[]>([])
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [snapshotFeedback, setSnapshotFeedback] = useState<SnapshotFeedback | null>(null)
  const [snapshotLoadAttempted, setSnapshotLoadAttempted] = useState(false)
  const [snapshotPgWatching, setSnapshotPgWatching] = useState(false)
  const [snapshotPgWatchSecondsLeft, setSnapshotPgWatchSecondsLeft] = useState<number | null>(null)
  const [underlyingPrice, setUnderlyingPrice] = useState<number | null>(null)
  const [lastQuotesLoadTs, setLastQuotesLoadTs] = useState<Date | null>(null)
  const [selectedContractKey, setSelectedContractKey] = useState<string | null>(null)
  const [addWatchlistFeedback, setAddWatchlistFeedback] = useState<string | null>(null)

  const snapshotWatchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const snapshotWatchGenRef = useRef(0)

  const stopSnapshotPgWatch = useCallback(() => {
    snapshotWatchGenRef.current += 1
    if (snapshotWatchIntervalRef.current != null) {
      clearInterval(snapshotWatchIntervalRef.current)
      snapshotWatchIntervalRef.current = null
    }
    setSnapshotPgWatching(false)
    setSnapshotPgWatchSecondsLeft(null)
  }, [])

  const startSnapshotPgWatch = useCallback(
    (sym: string, exp: string, strikesCsv: string | undefined) => {
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
            if (up != null) setUnderlyingPrice(up)
            setSnapshotFeedback(null)
            if (snapshotWatchIntervalRef.current != null) {
              clearInterval(snapshotWatchIntervalRef.current)
              snapshotWatchIntervalRef.current = null
            }
            setSnapshotPgWatching(false)
            setSnapshotPgWatchSecondsLeft(null)
          }
        } catch {
          /* transient */
        }
      }

      void runTick()
      snapshotWatchIntervalRef.current = setInterval(() => { void runTick() }, intervalMs)
    },
    [stockDayLastPrice],
  )

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
      const massiveChainPayload: Record<string, unknown> = {
        underlying: sym,
        mode: 'chain',
        expiration_date: exp,
        limit: 250,
      }
      if (strikesToSend && strikesToSend.length > 0) {
        massiveChainPayload.strike_price_gte = Math.min(...strikesToSend)
        massiveChainPayload.strike_price_lte = Math.max(...strikesToSend)
      }
      const sync = await postMassiveSync('feed_option_snapshots', massiveChainPayload)
      const jobId = resolveMassiveSyncJobId(sync)
      if (!sync.ok || !jobId) {
        setSnapshotFeedback({
          level: 'error',
          title: 'Sync failed',
          body: sync.error ?? sync.message ?? 'Massive sync failed',
        })
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

      if (sn.error) {
        setSnapshotFeedback({ level: 'error', body: sn.error })
        return
      }
      if (sn.warning) {
        setSnapshotFeedback({ level: 'warning', title: 'No snapshot rows matched', body: sn.warning })
        startSnapshotPgWatch(sym, exp, strikesCsv)
        return
      }

      const jobRes = await fetchMassiveJob(jobId)
      const result = jobRes.job?.result as Record<string, unknown> | undefined
      const rw = result?.rows_written
      if (typeof rw === 'number' && rw === 0) {
        setSnapshotFeedback({
          level: 'warning',
          title: 'Snapshot wrote 0 rows',
          body: 'Massive chain snapshot completed but wrote 0 rows. Check Massive API key, Celery, and symbol validity.',
        })
      } else if (typeof rw === 'number' && rw > 0) {
        setSnapshotFeedback({
          level: 'warning',
          title: 'Contract key mismatch',
          body: `${rw} rows were written to PostgreSQL but none matched this expiration/strikes.`,
        })
      } else {
        setSnapshotFeedback({
          level: 'warning',
          body: 'No quotes returned. Ensure Celery worker is running and consuming the Massive snapshot queue.',
        })
      }
      startSnapshotPgWatch(sym, exp, strikesCsv)
    } catch (e) {
      setSnapshotFeedback({
        level: 'error',
        body: e instanceof Error ? e.message : 'Failed to load quotes',
      })
      setSnapshotRows([])
      setUnderlyingPrice(null)
    } finally {
      setSnapshotLoading(false)
    }
  }, [
    selectedSymbol,
    selectedExpiration,
    effectiveStrikes,
    stopSnapshotPgWatch,
    startSnapshotPgWatch,
    stockDayLastPrice,
  ])

  useEffect(() => {
    stopSnapshotPgWatch()
  }, [selectedSymbol, selectedExpiration, strikesWatchKey, stopSnapshotPgWatch])

  useEffect(() => () => { stopSnapshotPgWatch() }, [stopSnapshotPgWatch])

  useEffect(() => {
    setSnapshotLoadAttempted(false)
    setSnapshotFeedback(null)
  }, [selectedSymbol, selectedExpiration])

  useEffect(() => {
    const sym = selectedSymbol.trim()
    const exp = selectedExpiration.trim()
    if (!sym || !exp) return
    const timer = window.setTimeout(() => { void loadQuotes() }, 400)
    return () => window.clearTimeout(timer)
  }, [selectedSymbol, selectedExpiration, strikesWatchKey, loadQuotes])

  return {
    snapshotRows,
    snapshotLoading,
    snapshotFeedback,
    snapshotLoadAttempted,
    snapshotPgWatching,
    snapshotPgWatchSecondsLeft,
    underlyingPrice,
    lastQuotesLoadTs,
    selectedContractKey,
    setSelectedContractKey,
    addWatchlistFeedback,
    setAddWatchlistFeedback,
    loadQuotes,
    stopSnapshotPgWatch,
  }
}
