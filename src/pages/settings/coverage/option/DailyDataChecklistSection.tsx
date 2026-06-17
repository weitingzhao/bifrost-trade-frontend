/* eslint-disable react-hooks/set-state-in-effect -- legacy DailyDataChecklistSection load on mount/deps */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
} from '@/components/data-display'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { fetchWatchlist } from '@/api/market'
import {
  fetchMassiveDailyChecklist,
  fetchMassiveJob,
  pollMassiveJobUntilDone,
  postMassiveSync,
} from '@/api/research/optionDiscovery'
import type { MassiveDailyChecklistDims, MassiveDailyDimBlock } from '@/types/optionDiscovery'
import type { MassiveJobApiRow } from '@/types/ops'
import { cn } from '@/lib/utils'

const DAILY_DIMS = [
  { key: 'daily-snapshot' as const, label: 'Chain snapshot' },
  { key: 'daily-oi' as const, label: 'EOD OI' },
  { key: 'daily-max-pain' as const, label: 'Max pain' },
  { key: 'daily-corporate' as const, label: 'Corporate' },
  { key: 'daily-ws-alive' as const, label: 'WS ingest' },
]

type DimKey = (typeof DAILY_DIMS)[number]['key']

function nyCalendarDateIso(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const y = parts.find(p => p.type === 'year')?.value
  const m = parts.find(p => p.type === 'month')?.value
  const d = parts.find(p => p.type === 'day')?.value
  if (y && m && d) return `${y}-${m}-${d}`
  return new Date().toISOString().slice(0, 10)
}

function fmtDimTooltip(dimKey: DimKey, block: MassiveDailyDimBlock | undefined): string {
  if (!block) return 'No data'
  const lines: string[] = [`Status: ${block.status ?? '—'}`]
  if (dimKey === 'daily-snapshot') {
    if (block.rows != null) lines.push(`Rows: ${block.rows}`)
    if (block.last_ts) lines.push(`Last snapshot: ${block.last_ts}`)
  }
  if (dimKey === 'daily-oi') {
    if (block.rows != null) lines.push(`Rows: ${block.rows}`)
    if (block.trade_date) lines.push(`Trade date: ${block.trade_date}`)
    if (block.last_trade_date) lines.push(`Last OI trade date: ${block.last_trade_date}`)
  }
  if (dimKey === 'daily-max-pain') {
    if (block.rows != null) lines.push(`Rows: ${block.rows}`)
    if (block.trade_date) lines.push(`Trade date: ${block.trade_date}`)
  }
  if (dimKey === 'daily-corporate' && block.last_sync) lines.push(`Last sync: ${block.last_sync}`)
  if (dimKey === 'daily-ws-alive') {
    lines.push(`Connected: ${block.connected === true ? 'yes' : 'no'}`)
    if (block.last_msg_age_s != null) lines.push(`Last message age (s): ${block.last_msg_age_s.toFixed(0)}`)
  }
  return lines.join('\n')
}

function statusBadgeVariant(s: string | undefined): 'default' | 'secondary' | 'destructive' | 'outline' {
  const x = (s || '').toLowerCase()
  if (x === 'complete') return 'default'
  if (x === 'partial') return 'secondary'
  if (x === 'degraded') return 'outline'
  return 'destructive'
}

function statusLabel(s: string | undefined): string {
  const x = (s || '').toLowerCase()
  if (x === 'complete') return 'Complete'
  if (x === 'partial') return 'Partial'
  if (x === 'degraded') return 'Degraded'
  if (x === 'missing') return 'Missing'
  return s || '—'
}

function summarizeJobResult(job: MassiveJobApiRow | undefined): string {
  const r = job?.result as Record<string, unknown> | undefined
  if (!r || typeof r !== 'object') return '—'
  if (typeof r.error === 'string') return r.error
  if (r.rows_written != null) return `rows ${String(r.rows_written)}`
  if (r.rows_upserted != null) return `upserted ${String(r.rows_upserted)}`
  if (r.bars_upserted != null) return `bars ${String(r.bars_upserted)}`
  if (r.message != null) return String(r.message)
  try {
    return JSON.stringify(r)
  } catch {
    return '—'
  }
}

function canBackfillDim(dimKey: DimKey, block: MassiveDailyDimBlock | undefined): boolean {
  if (dimKey === 'daily-ws-alive') return false
  const st = (block?.status || '').toLowerCase()
  if (st === 'missing') return true
  if (dimKey === 'daily-corporate' && st === 'partial') return true
  return false
}

export function DailyDataChecklistSection({
  configured,
  onChecklistRefreshed,
}: {
  configured: boolean
  onChecklistRefreshed?: () => void
}) {
  const [tradeDate, setTradeDate] = useState(() => nyCalendarDateIso())
  const [rows, setRows] = useState<Record<string, MassiveDailyChecklistDims>>({})
  const [resolvedTradeDate, setResolvedTradeDate] = useState<string | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [batchBusy, setBatchBusy] = useState(false)
  const [resultLog, setResultLog] = useState('')

  const [watchlistItems, setWatchlistItems] = useState<
    { symbol?: string; sec_type?: string; optionable?: boolean | null }[]
  >([])

  const stkSymbolsList = useMemo(() => {
    const syms = watchlistItems
      .filter(i => (i.sec_type || '').trim().toUpperCase() !== 'OPT')
      .filter(i => i.optionable === true)
      .map(i => (i.symbol || '').trim().toUpperCase())
      .filter(Boolean)
    return [...new Set(syms)].sort()
  }, [watchlistItems])

  useEffect(() => {
    let cancelled = false
    fetchWatchlist()
      .then(res => {
        if (!cancelled) setWatchlistItems(res.items || [])
      })
      .catch(() => {
        if (!cancelled) setWatchlistItems([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const loadChecklist = useCallback(async () => {
    if (stkSymbolsList.length === 0) {
      setRows({})
      setResolvedTradeDate(null)
      onChecklistRefreshed?.()
      return
    }
    setLoading(true)
    setLoadErr(null)
    try {
      const res = await fetchMassiveDailyChecklist({ symbols: stkSymbolsList, tradeDate })
      if (!res.ok) {
        setLoadErr(res.error ?? 'Failed to load daily checklist')
        setRows({})
        setResolvedTradeDate(null)
        return
      }
      setRows(res.symbols ?? {})
      setResolvedTradeDate(res.trade_date ?? tradeDate)
      onChecklistRefreshed?.()
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Failed to load daily checklist')
      setRows({})
      setResolvedTradeDate(null)
    } finally {
      setLoading(false)
    }
  }, [stkSymbolsList, tradeDate, onChecklistRefreshed])

  useEffect(() => {
    void loadChecklist()
  }, [loadChecklist])

  const appendLog = useCallback((line: string) => {
    setResultLog(prev => (prev ? `${prev}\n${line}` : line))
  }, [])

  const runBackfill = useCallback(
    async (sym: string, dimKey: DimKey) => {
      const k = `${sym}|${dimKey}`
      setBusyKey(k)
      try {
        let post: { ok: boolean; job_id?: string; error?: string } = { ok: false }
        if (dimKey === 'daily-snapshot') {
          post = await postMassiveSync('feed_option_snapshots', { mode: 'chain', underlying: sym })
        } else if (dimKey === 'daily-oi') {
          post = await postMassiveSync('oi', { mode: 'watchlist_eod', symbols: [sym], trade_date: tradeDate })
        } else if (dimKey === 'daily-max-pain') {
          post = await postMassiveSync('report_option_max_pain', { symbols: [sym], trade_date: tradeDate })
        } else if (dimKey === 'daily-corporate') {
          post = await postMassiveSync('feed_stocks_corporate_action', { symbol: sym })
        }
        if (!post.ok) {
          appendLog(`[${sym} ${dimKey}] ${post.error ?? 'enqueue failed'}`)
          return
        }
        const jid = post.job_id
        if (!jid) {
          appendLog(`[${sym} ${dimKey}] No job id returned`)
          return
        }
        const polled = await pollMassiveJobUntilDone(jid, { maxAttempts: 120, intervalMs: 1000 })
        const full = await fetchMassiveJob(jid)
        const job = full.job
          ? ({
              job_id: full.job.job_id,
              kind: full.job.kind,
              status: full.job.status,
              result: full.job.result,
            } as MassiveJobApiRow)
          : undefined
        if (!polled.ok) {
          appendLog(`[${sym} ${dimKey}] job ${jid} ${polled.status ?? ''} ${polled.error ?? ''} ${summarizeJobResult(job)}`)
          return
        }
        appendLog(`[${sym} ${dimKey}] ${summarizeJobResult(job)}`)
      } finally {
        setBusyKey(null)
      }
    },
    [appendLog, tradeDate],
  )

  const onBackfillAll = useCallback(async () => {
    const tasks: { sym: string; dim: DimKey }[] = []
    for (const sym of stkSymbolsList) {
      const row = rows[sym]
      if (!row) continue
      for (const { key } of DAILY_DIMS) {
        if (!canBackfillDim(key, row[key])) continue
        tasks.push({ sym, dim: key })
      }
    }
    if (tasks.length === 0) {
      appendLog('Backfill all: nothing to run (all complete or WS-only).')
      return
    }
    setBatchBusy(true)
    setResultLog('')
    try {
      for (const t of tasks) {
        await runBackfill(t.sym, t.dim)
      }
    } finally {
      setBatchBusy(false)
      await loadChecklist()
    }
  }, [appendLog, loadChecklist, rows, runBackfill, stkSymbolsList])

  const disabled = !configured || stkSymbolsList.length === 0

  return (
    <section id="feed-massive-daily-data" className="space-y-4" aria-label="Daily option data readiness">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-medium">Daily Data Status</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Watchlist optionable STK symbols: snapshot, EOD OI, max pain, corporate actions, and WS ingest.
            <InfoTooltip text="Evaluated against the selected US session calendar date (America/New_York). WS ingest status is global for all rows." />
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="session-date" className="text-xs">
              Session date
            </Label>
            <Input
              id="session-date"
              type="date"
              className="h-8 w-36"
              value={tradeDate}
              disabled={disabled}
              onChange={e => setTradeDate(e.target.value)}
            />
          </div>
          <Button type="button" variant="outline" size="sm" disabled={disabled || loading} onClick={() => void loadChecklist()}>
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || loading || batchBusy || busyKey != null}
            onClick={() => void onBackfillAll()}
          >
            {batchBusy ? 'Backfilling…' : 'Backfill all missing'}
          </Button>
        </div>
      </div>
      {!configured ? (
        <p className="text-sm text-amber-600 dark:text-amber-500">Massive API is not configured. Set API key under Feed → Massive Option.</p>
      ) : null}
      {stkSymbolsList.length === 0 ? (
        <p className="text-sm text-muted-foreground">No optionable STK symbols on the watchlist.</p>
      ) : null}
      {loadErr ? <p className="text-sm text-destructive">{loadErr}</p> : null}
      {resolvedTradeDate ? (
        <p className="text-xs text-muted-foreground">
          Evaluated for <strong>{resolvedTradeDate}</strong> (US calendar).
        </p>
      ) : null}
      {stkSymbolsList.length > 0 ? (
        <DenseDataTable tableClassName="min-w-[640px]">
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead>Symbol</DenseTableHead>
              {DAILY_DIMS.map(d => (
                <DenseTableHead key={d.key}>{d.label}</DenseTableHead>
              ))}
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {stkSymbolsList.map(sym => {
              const row = rows[sym] || {}
              return (
                <DenseTableRow key={sym}>
                  <DenseTableCell className="font-medium">{sym}</DenseTableCell>
                  {DAILY_DIMS.map(({ key }) => {
                    const block = row[key]
                    const k = `${sym}|${key}`
                    const spinning = busyKey === k
                    const can = canBackfillDim(key, block) && !batchBusy && busyKey == null
                    const title = fmtDimTooltip(key, block)
                    return (
                      <DenseTableCell key={key}>
                        <button
                          type="button"
                          className={cn(!can && 'cursor-default')}
                          title={title}
                          disabled={!can || spinning}
                          onClick={() => {
                            if (!can || spinning) return
                            setResultLog('')
                            void runBackfill(sym, key).then(() => loadChecklist())
                          }}
                        >
                          <Badge variant={statusBadgeVariant(block?.status)}>
                            {spinning ? '…' : statusLabel(block?.status)}
                          </Badge>
                        </button>
                      </DenseTableCell>
                    )
                  })}
                </DenseTableRow>
              )
            })}
          </DenseTableBody>
        </DenseDataTable>
      ) : null}
      {resultLog ? (
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Last run output</div>
          <pre className="max-h-48 overflow-auto rounded-md border bg-muted/30 p-2 text-xs">{resultLog}</pre>
        </div>
      ) : null}
    </section>
  )
}
