import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchGreeksCoverage,
  fetchOptionSnapshotsPg,
  pollMassiveJobUntilDone,
  postMassiveSync,
  resolveMassiveSyncJobId,
} from '@/api/research/optionDiscovery'
import type { GreeksCoverageResponse, OptionSnapshotRow } from '@/types/optionDiscovery'

const QUOTES_DEBOUNCE_MS = 400
const PG_WATCH_SECONDS = 120

export interface SnapshotFeedback {
  level: 'error' | 'warning' | 'info'
  title?: string
  body: string
}

export function useOptionChainQuotes() {
  const [snapshotRows, setSnapshotRows] = useState<OptionSnapshotRow[]>([])
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [snapshotFeedback, setSnapshotFeedback] = useState<SnapshotFeedback | null>(null)
  const [snapshotLoadAttempted, setSnapshotLoadAttempted] = useState(false)
  const [snapshotPgWatching, setSnapshotPgWatching] = useState(false)
  const [snapshotPgWatchSecondsLeft, setSnapshotPgWatchSecondsLeft] = useState<number | null>(null)
  const [underlyingPrice, setUnderlyingPrice] = useState<number | null>(null)
  const [lastQuotesLoadTs, setLastQuotesLoadTs] = useState<Date | null>(null)
  const [greeksCoverage, setGreeksCoverage] = useState<GreeksCoverageResponse | null>(null)

  const snapshotWatchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const snapshotWatchGenRef = useRef(0)
  const loadGenRef = useRef(0)

  const stopPgWatch = useCallback(() => {
    snapshotWatchGenRef.current += 1
    if (snapshotWatchIntervalRef.current) {
      clearInterval(snapshotWatchIntervalRef.current)
      snapshotWatchIntervalRef.current = null
    }
    setSnapshotPgWatching(false)
    setSnapshotPgWatchSecondsLeft(null)
  }, [])

  const readPgSnapshots = useCallback(
    async (symbol: string, expiration: string, strikes: number[]) => {
      const strikesCsv =
        strikes.length > 0 ? strikes.map(x => String(x)).join(',') : undefined
      const res = await fetchOptionSnapshotsPg(
        symbol.trim().toUpperCase(),
        expiration.trim(),
        strikesCsv,
        'massive',
      )
      if (res.underlying_price != null && Number.isFinite(res.underlying_price)) {
        setUnderlyingPrice(res.underlying_price)
      }
      setSnapshotRows(res.rows ?? [])
      return res
    },
    [],
  )

  const startPgWatch = useCallback(
    (symbol: string, expiration: string, strikes: number[]) => {
      stopPgWatch()
      const gen = snapshotWatchGenRef.current
      let secondsLeft = PG_WATCH_SECONDS
      setSnapshotPgWatching(true)
      setSnapshotPgWatchSecondsLeft(secondsLeft)
      snapshotWatchIntervalRef.current = setInterval(async () => {
        if (gen !== snapshotWatchGenRef.current) return
        secondsLeft -= 2
        setSnapshotPgWatchSecondsLeft(Math.max(0, secondsLeft))
        try {
          const res = await readPgSnapshots(symbol, expiration, strikes)
          if ((res.rows?.length ?? 0) > 0) {
            stopPgWatch()
            setSnapshotFeedback(null)
            setLastQuotesLoadTs(new Date())
          }
        } catch {
          /* keep polling */
        }
        if (secondsLeft <= 0) stopPgWatch()
      }, 2000)
    },
    [readPgSnapshots, stopPgWatch],
  )

  const loadQuotes = useCallback(
    async (params: {
      symbol: string
      expiration: string
      strikes: number[]
      manual?: boolean
    }) => {
      const sym = params.symbol.trim().toUpperCase()
      const exp = params.expiration.trim()
      if (!sym || !exp) return

      const gen = ++loadGenRef.current
      stopPgWatch()
      setSnapshotLoadAttempted(true)
      setSnapshotLoading(true)
      setSnapshotFeedback(null)

      try {
        const sync = await postMassiveSync('feed_option_snapshots', {
          underlying: sym,
          mode: 'chain',
          expiration_date: exp,
          limit: 250,
          ...(params.strikes.length > 0
            ? {
                strike_price_gte: Math.min(...params.strikes),
                strike_price_lte: Math.max(...params.strikes),
              }
            : {}),
        })

        if (gen !== loadGenRef.current) return

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

        const poll = await pollMassiveJobUntilDone(jobId, { maxAttempts: 120, intervalMs: 1000 })
        if (gen !== loadGenRef.current) return
        if (!poll.ok) {
          setSnapshotFeedback({
            level: 'error',
            title: 'Job failed',
            body: poll.error ?? 'Massive job failed',
          })
          setSnapshotRows([])
          setUnderlyingPrice(null)
          return
        }

        const pg = await readPgSnapshots(sym, exp, params.strikes)
        if (gen !== loadGenRef.current) return

        if ((pg.rows?.length ?? 0) === 0) {
          setSnapshotFeedback({
            level: 'warning',
            title: 'Waiting for PostgreSQL',
            body: params.manual
              ? 'Sync finished but no rows yet. Watching PG for up to 2 minutes…'
              : 'No snapshot rows yet. Watching PG…',
          })
          startPgWatch(sym, exp, params.strikes)
        } else {
          setLastQuotesLoadTs(new Date())
          if (pg.warning) {
            setSnapshotFeedback({ level: 'info', body: pg.warning })
          }
        }

        try {
          const cov = await fetchGreeksCoverage(sym, exp, 'massive')
          if (gen === loadGenRef.current) setGreeksCoverage(cov)
        } catch {
          if (gen === loadGenRef.current) setGreeksCoverage(null)
        }
      } catch (err) {
        if (gen !== loadGenRef.current) return
        setSnapshotFeedback({
          level: 'error',
          title: 'Quotes load failed',
          body: err instanceof Error ? err.message : 'Unknown error',
        })
      } finally {
        if (gen === loadGenRef.current) setSnapshotLoading(false)
      }
    },
    [readPgSnapshots, startPgWatch, stopPgWatch],
  )

  const loadQuotesRef = useRef(loadQuotes)
  useEffect(() => {
    loadQuotesRef.current = loadQuotes
  }, [loadQuotes])

  const scheduleLoadQuotes = useCallback(
    (params: { symbol: string; expiration: string; strikes: number[] }) => {
      window.setTimeout(() => {
        void loadQuotesRef.current({ ...params, manual: false })
      }, QUOTES_DEBOUNCE_MS)
    },
    [],
  )

  const resetSnapshots = useCallback(() => {
    loadGenRef.current += 1
    stopPgWatch()
    setSnapshotRows([])
    setSnapshotFeedback(null)
    setSnapshotLoadAttempted(false)
    setUnderlyingPrice(null)
    setGreeksCoverage(null)
  }, [stopPgWatch])

  return {
    snapshotRows,
    setSnapshotRows,
    snapshotLoading,
    snapshotFeedback,
    setSnapshotFeedback,
    snapshotLoadAttempted,
    snapshotPgWatching,
    snapshotPgWatchSecondsLeft,
    underlyingPrice,
    lastQuotesLoadTs,
    greeksCoverage,
    loadQuotes,
    scheduleLoadQuotes,
    resetSnapshots,
    stopPgWatch,
  }
}
