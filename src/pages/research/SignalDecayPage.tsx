import { useCallback, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Activity } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  EmptyState,
  SegmentControl,
  denseTableNumCell,
} from '@/components/data-display'
import { fmtNum } from '@/lib/format'
import { PortfolioTag } from '@/components/portfolio/PortfolioTag'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { AnalyzeVerdictStrip } from '@/components/research/AnalyzeVerdictStrip'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { SaveAsHypothesisButton } from '@/components/research/SaveAsHypothesisButton'
import {
  fetchSignalDecay,
  fetchSignalDecayIntersect,
  type SignalDecayIntersectResponse,
  type SignalDecayLens,
  type SignalDecayRegime,
  type SignalDecaySideStats,
  type SignalDecayTrendPoint,
} from '@/api/research/signalDecay'
import { QUERY_KEYS } from '@/constants/queryKeys'

const LENS_OPTIONS: { value: SignalDecayLens; label: string }[] = [
  { value: 'iv_rank', label: 'IV Rank' },
  { value: 'vrp', label: 'VRP' },
  { value: 'opex_pin', label: 'OpEx Pin' },
]

const WINDOW_OPTIONS = [
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
  { value: '252', label: '252d' },
]

const REGIME_OPTIONS: { value: SignalDecayRegime; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'bull', label: 'Bull' },
  { value: 'rangy', label: 'Rangy' },
  { value: 'bear', label: 'Bear' },
]

const MATRIX_ROWS: Array<{ side: 'hot' | 'cold'; label: string }> = [
  { side: 'hot', label: 'IV Rank hot' },
  { side: 'cold', label: 'IV Rank cold' },
]

const MATRIX_COLS: Array<{ side: 'hot' | 'cold'; label: string }> = [
  { side: 'hot', label: 'VRP hot' },
  { side: 'cold', label: 'VRP cold' },
]

function parseRegime(raw: string | null): SignalDecayRegime {
  if (raw === 'bull' || raw === 'rangy' || raw === 'bear' || raw === 'any') return raw
  return 'any'
}

function pct(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return '—'
  return `${(rate * 100).toFixed(0)}%`
}

function fmtHit(v: boolean | null | undefined): string {
  if (v == null) return 'pending'
  return v ? 'hit' : 'miss'
}

function MiniSpark({ points }: { points: SignalDecayTrendPoint[] }) {
  if (!points.length) {
    return <span className="text-dense-meta text-muted-foreground">No trend</span>
  }
  const vals = points.map((p) => p.rolling_hit_rate_5d).filter((v): v is number => v != null)
  if (!vals.length) {
    return <span className="text-dense-meta text-muted-foreground">No trend</span>
  }
  const w = 160
  const h = 28
  const min = Math.min(...vals, 0)
  const max = Math.max(...vals, 1)
  const span = max - min || 1
  const coords = vals
    .map((v, i) => {
      const x = (i / Math.max(vals.length - 1, 1)) * w
      const y = h - ((v - min) / span) * (h - 2) - 1
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={coords} className="text-foreground" />
    </svg>
  )
}

function SideRow({
  side,
  stats,
  windows,
}: {
  side: string
  stats: Record<string, SignalDecaySideStats | undefined>
  windows: number[]
}) {
  return (
    <DenseTableRow>
      <DenseTableCell className="font-medium capitalize">{side}</DenseTableCell>
      {windows.map((w) => {
        const s = stats[String(w)]
        if (!s) {
          return (
            <DenseTableCell key={w} className={denseTableNumCell}>
              —
            </DenseTableCell>
          )
        }
        const pending = s.pending_5d ?? Math.max(0, s.n - s.evaluated_5d)
        return (
          <DenseTableCell key={w} className={denseTableNumCell}>
            <div>{`${pct(s.hit_rate_5d)} / ${pct(s.hit_rate_20d)} (n=${s.n})`}</div>
            {pending > 0 ? (
              <div className="text-dense-caption text-muted-foreground">pending {pending}</div>
            ) : null}
          </DenseTableCell>
        )
      })}
    </DenseTableRow>
  )
}

function CombinedLensesMatrix({
  windowDays,
  symbol,
  regime,
}: {
  windowDays: number
  symbol?: string
  regime: SignalDecayRegime
}) {
  const cells = useMemo(
    () =>
      MATRIX_ROWS.flatMap((row) =>
        MATRIX_COLS.map((col) => ({
          key: `iv_rank:${row.side},vrp:${col.side}`,
          rowSide: row.side,
          colSide: col.side,
          label: `${row.label} × ${col.label}`,
        })),
      ),
    [],
  )

  const queries = useQueries({
    queries: cells.map((cell) => ({
      queryKey: [
        ...QUERY_KEYS.research.signalDecayIntersect,
        cell.key,
        windowDays,
        symbol ?? null,
        regime,
      ],
      queryFn: () =>
        fetchSignalDecayIntersect({
          lensPairs: cell.key,
          windowDays,
          symbol,
          regime,
        }),
      staleTime: 60_000,
    })),
  })

  const [detail, setDetail] = useState<{
    label: string
    data: SignalDecayIntersectResponse
  } | null>(null)

  const byKey = useMemo(() => {
    const map = new Map<string, { data?: SignalDecayIntersectResponse; isLoading: boolean; isError: boolean }>()
    cells.forEach((cell, i) => {
      const q = queries[i]
      map.set(cell.key, {
        data: q?.data,
        isLoading: q?.isLoading ?? false,
        isError: q?.isError ?? false,
      })
    })
    return map
  }, [cells, queries])

  return (
    <>
      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
            Combined lenses
          </p>
          <DenseDataTable>
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead>IV Rank \ VRP</DenseTableHead>
                {MATRIX_COLS.map((col) => (
                  <DenseTableHead key={col.side} className="text-right">
                    {col.label}
                  </DenseTableHead>
                ))}
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {MATRIX_ROWS.map((row) => (
                <DenseTableRow key={row.side}>
                  <DenseTableCell className="font-medium">{row.label}</DenseTableCell>
                  {MATRIX_COLS.map((col) => {
                    const key = `iv_rank:${row.side},vrp:${col.side}`
                    const cell = byKey.get(key)
                    const label = `${row.label} × ${col.label}`
                    if (cell?.isLoading) {
                      return (
                        <DenseTableCell key={key} className={denseTableNumCell}>
                          …
                        </DenseTableCell>
                      )
                    }
                    if (cell?.isError || !cell?.data) {
                      return (
                        <DenseTableCell key={key} className={denseTableNumCell}>
                          —
                        </DenseTableCell>
                      )
                    }
                    const data = cell.data
                    return (
                      <DenseTableCell key={key} className={denseTableNumCell}>
                        <button
                          type="button"
                          className="text-dense-body tabular-nums underline-offset-2 hover:underline text-foreground"
                          onClick={() => setDetail({ label, data })}
                        >
                          {`${pct(data.hit_rate_5d)} (n=${data.n})`}
                        </button>
                      </DenseTableCell>
                    )
                  })}
                </DenseTableRow>
              ))}
            </DenseTableBody>
          </DenseDataTable>
        </CardContent>
      </Card>

      <Dialog open={detail != null} onOpenChange={(open) => (!open ? setDetail(null) : undefined)}>
        <DialogContent className="sm:max-w-lg">
          {detail ? (
            <>
              <DialogHeader>
                <DialogTitle>{detail.label}</DialogTitle>
                <DialogDescription>
                  Intersection hit-rate vs single-lens baselines ({detail.data.window_days}d
                  {detail.data.regime !== 'any' ? ` · ${detail.data.regime}` : ''}).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-dense-body">
                  Combined 5d {pct(detail.data.hit_rate_5d)} / 20d {pct(detail.data.hit_rate_20d)}{' '}
                  (n={detail.data.n})
                </p>
                <div className="space-y-1">
                  <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
                    Single-lens baseline
                  </p>
                  <DenseDataTable>
                    <DenseTableHeader>
                      <DenseTableHeadRow>
                        <DenseTableHead>Lens</DenseTableHead>
                        <DenseTableHead className="text-right">5d hit</DenseTableHead>
                        <DenseTableHead className="text-right">n</DenseTableHead>
                      </DenseTableHeadRow>
                    </DenseTableHeader>
                    <DenseTableBody>
                      {Object.entries(detail.data.single_lens_baseline).map(([k, v]) => (
                        <DenseTableRow key={k}>
                          <DenseTableCell className="font-mono text-dense-meta">{k}</DenseTableCell>
                          <DenseTableCell className={denseTableNumCell}>{pct(v.hit_rate_5d)}</DenseTableCell>
                          <DenseTableCell className={denseTableNumCell}>{v.n}</DenseTableCell>
                        </DenseTableRow>
                      ))}
                    </DenseTableBody>
                  </DenseDataTable>
                </div>
                {detail.data.sample.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
                      Sample
                    </p>
                    <DenseDataTable>
                      <DenseTableHeader>
                        <DenseTableHeadRow>
                          <DenseTableHead>Date</DenseTableHead>
                          <DenseTableHead>Symbol</DenseTableHead>
                          <DenseTableHead className="text-right">Hit 5d</DenseTableHead>
                          <DenseTableHead className="text-right">Fwd 5d</DenseTableHead>
                        </DenseTableHeadRow>
                      </DenseTableHeader>
                      <DenseTableBody>
                        {detail.data.sample.slice(0, 12).map((row, i) => (
                          <DenseTableRow key={`${row.trade_date}-${row.symbol}-${i}`}>
                            <DenseTableCell className="font-mono text-dense-meta">
                              {row.trade_date}
                            </DenseTableCell>
                            <DenseTableCell className="font-semibold text-entity-symbol">
                              {row.symbol ?? '—'}
                            </DenseTableCell>
                            <DenseTableCell className={denseTableNumCell}>{fmtHit(row.hit_5d)}</DenseTableCell>
                            <DenseTableCell className={denseTableNumCell}>
                              {fmtNum(row.fwd_return_5d, 3)}
                            </DenseTableCell>
                          </DenseTableRow>
                        ))}
                      </DenseTableBody>
                    </DenseDataTable>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function SignalDecayPage() {
  const { symbol: symbolParam } = useParams<{ symbol?: string }>()
  const symbol = symbolParam?.trim().toUpperCase() || undefined
  const [searchParams, setSearchParams] = useSearchParams()
  const [lens, setLens] = useState<SignalDecayLens>('iv_rank')
  const [windowDays, setWindowDays] = useState(30)
  const regime = parseRegime(searchParams.get('regime'))

  const setRegime = useCallback(
    (next: SignalDecayRegime) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          if (next === 'any') p.delete('regime')
          else p.set('regime', next)
          return p
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const q30 = useQuery({
    queryKey: [...QUERY_KEYS.research.signalDecay, lens, 30, symbol ?? null, regime],
    queryFn: () => fetchSignalDecay({ lens, windowDays: 30, symbol, regime }),
    staleTime: 60_000,
  })
  const q90 = useQuery({
    queryKey: [...QUERY_KEYS.research.signalDecay, lens, 90, symbol ?? null, regime],
    queryFn: () => fetchSignalDecay({ lens, windowDays: 90, symbol, regime }),
    staleTime: 60_000,
  })
  const q252 = useQuery({
    queryKey: [...QUERY_KEYS.research.signalDecay, lens, 252, symbol ?? null, regime],
    queryFn: () => fetchSignalDecay({ lens, windowDays: 252, symbol, regime }),
    staleTime: 60_000,
  })

  const active = windowDays === 90 ? q90 : windowDays === 252 ? q252 : q30
  const data = active.data
  const recentTriggers = data?.recent_triggers?.slice(0, 20) ?? []

  const hotStats = useMemo(
    () => ({
      '30': q30.data?.by_side.hot,
      '90': q90.data?.by_side.hot,
      '252': q252.data?.by_side.hot,
    }),
    [q30.data, q90.data, q252.data],
  )
  const coldStats = useMemo(
    () => ({
      '30': q30.data?.by_side.cold,
      '90': q90.data?.by_side.cold,
      '252': q252.data?.by_side.cold,
    }),
    [q30.data, q90.data, q252.data],
  )

  const verdict = useMemo(() => {
    const rate = data?.hit_rate_5d
    const hot = data?.by_side.hot.hit_rate_5d
    const scope = symbol ? `${symbol} ` : ''
    const regimeNote = regime !== 'any' ? ` · ${regime}` : ''
    if (rate == null) {
      return {
        tone: 'neutral' as const,
        label: 'No evaluated triggers',
        narrative: `No ${scope}${lens} hit rows in the last ${windowDays}d${regimeNote}. Wait for research-signal-hit Cron.`,
      }
    }
    if ((hot ?? 0) >= 0.55) {
      return {
        tone: 'success' as const,
        label: `${lens} hot 5d ${pct(hot)}`,
        narrative: `Mean-revert hypothesis looks viable on ${scope}${lens} hot triggers (${windowDays}d window${regimeNote}, n=${data?.by_side.hot.n ?? 0}).`,
      }
    }
    if ((hot ?? 1) < 0.45) {
      return {
        tone: 'warning' as const,
        label: `${lens} hot 5d ${pct(hot)}`,
        narrative: `Hot-side hit-rate below coin-flip — treat ${scope}${lens} extremes cautiously.`,
      }
    }
    return {
      tone: 'neutral' as const,
      label: `${lens} 5d ${pct(rate)}`,
      narrative: `Mixed edge on ${scope}${lens} (${windowDays}d${regimeNote}). Compare hot vs cold columns below.`,
    }
  }, [data, lens, windowDays, symbol, regime])

  const loading = q30.isLoading || q90.isLoading || q252.isLoading
  const err = q30.error || q90.error || q252.error

  return (
    <PageShell padding="compact">
      <PageHeader
        title="Signal Decay"
        titleSize="default"
        description="Lens trigger → forward return hit-rate (IV Rank / VRP / OpEx Pin)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AskCopilotButton
              originPage="analyze-signal-decay"
              originLabel="Signal Decay"
              symbol={symbol}
              snapshot={compactSnapshot({
                lens,
                window_days: windowDays,
                regime,
                by_side: data?.by_side,
                hit_rate_5d: data?.hit_rate_5d,
                ...(symbol ? { symbol } : {}),
              })}
              suggestedPrompt={
                symbol
                  ? `Interpret ${symbol} ${lens} signal decay (regime=${regime}): hot 5d hit-rate ${pct(data?.by_side.hot.hit_rate_5d)} over ${windowDays}d. Is mean-revert still valid?`
                  : `Interpret ${lens} signal decay (regime=${regime}): hot 5d hit-rate ${pct(data?.by_side.hot.hit_rate_5d)} over ${windowDays}d. Is mean-revert still valid?`
              }
            />
            <SaveAsHypothesisButton
              originPage="analyze-signal-decay"
              defaultTitle={
                symbol
                  ? `${symbol} ${lens} decay ${windowDays}d`
                  : `${lens} decay ${windowDays}d`
              }
              defaultThesis={verdict.narrative}
              defaultSymbols={symbol ? [symbol] : undefined}
              defaultTags={['signal-decay', lens, regime].filter((t) => t !== 'any')}
            />
          </div>
        }
      />

      <div className="space-y-3">
        {symbol ? (
          <div className="flex flex-wrap items-center gap-2 px-1">
            <Link
              to={`/research/signal-decay${regime !== 'any' ? `?regime=${regime}` : ''}`}
              className="text-dense-meta text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              Signal Decay
            </Link>
            <span className="text-dense-meta text-muted-foreground">/</span>
            <span className="text-dense-label font-semibold text-entity-symbol">{symbol}</span>
            <PortfolioTag symbol={symbol} variant="inline" />
          </div>
        ) : (
          <p className="text-dense-micro text-muted-foreground px-1">
            Open{' '}
            <Link
              to="/research/signal-decay/SPY"
              className="underline-offset-2 hover:underline text-foreground"
            >
              /research/signal-decay/SPY
            </Link>{' '}
            for per-symbol recent triggers.
          </p>
        )}

        <AnalyzeVerdictStrip
          tone={verdict.tone}
          verdictLabel={verdict.label}
          narrative={verdict.narrative}
          signals={[
            { label: 'Lens', value: lens },
            { label: 'Window', value: `${windowDays}d` },
            { label: 'Regime', value: regime },
            { label: 'Triggers', value: String(data?.trigger_count ?? 0) },
            { label: '5d hit', value: pct(data?.hit_rate_5d) },
          ]}
        />

        <Card variant="elevated">
          <CardContent className="flex flex-wrap items-center gap-2 px-3 py-2">
            <span className="text-dense-meta font-medium text-muted-foreground">Lens:</span>
            <SegmentControl
              value={lens}
              onChange={(v) => setLens(v as SignalDecayLens)}
              options={LENS_OPTIONS}
            />
            <span className="text-dense-meta font-medium text-muted-foreground ml-2">Window:</span>
            <SegmentControl
              value={String(windowDays)}
              onChange={(v) => setWindowDays(Number(v))}
              options={WINDOW_OPTIONS}
            />
            <span className="text-dense-meta font-medium text-muted-foreground ml-2">Regime:</span>
            <SegmentControl
              value={regime}
              onChange={(v) => setRegime(v as SignalDecayRegime)}
              options={REGIME_OPTIONS}
            />
          </CardContent>
        </Card>

        {err ? (
          <QueryErrorAlert error={err} />
        ) : loading ? (
          <Skeleton className="h-48 w-full rounded-md" />
        ) : !data || data.trigger_count === 0 ? (
          <EmptyState
            icon={<Activity />}
            title="No lens hits yet"
            description="Run research-signal-hit Cron / backfill to populate stock_signal_lens_hit_daily."
          />
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <Card variant="elevated">
                <CardContent className="space-y-1 px-3 py-2">
                  <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
                    Hot rolling 5d hit-rate
                  </p>
                  <MiniSpark points={data.trend_hot ?? []} />
                </CardContent>
              </Card>
              <Card variant="elevated">
                <CardContent className="space-y-1 px-3 py-2">
                  <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
                    Cold rolling 5d hit-rate
                  </p>
                  <MiniSpark points={data.trend_cold ?? []} />
                </CardContent>
              </Card>
            </div>

            <DenseDataTable>
              <DenseTableHeader>
                <DenseTableHeadRow>
                  <DenseTableHead>Side</DenseTableHead>
                  <DenseTableHead className="text-right">30d 5d/20d</DenseTableHead>
                  <DenseTableHead className="text-right">90d 5d/20d</DenseTableHead>
                  <DenseTableHead className="text-right">252d 5d/20d</DenseTableHead>
                </DenseTableHeadRow>
              </DenseTableHeader>
              <DenseTableBody>
                <SideRow side="hot" stats={hotStats} windows={[30, 90, 252]} />
                <SideRow side="cold" stats={coldStats} windows={[30, 90, 252]} />
              </DenseTableBody>
            </DenseDataTable>

            {symbol && recentTriggers.length > 0 ? (
              <Card variant="elevated">
                <CardContent className="space-y-2 px-3 py-2">
                  <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
                    Recent triggers (last {recentTriggers.length})
                  </p>
                  <DenseDataTable>
                    <DenseTableHeader>
                      <DenseTableHeadRow>
                        <DenseTableHead>Date</DenseTableHead>
                        <DenseTableHead>Side</DenseTableHead>
                        <DenseTableHead className="text-right">Trigger</DenseTableHead>
                        <DenseTableHead className="text-right">Hit 5d</DenseTableHead>
                        <DenseTableHead className="text-right">Fwd 5d</DenseTableHead>
                      </DenseTableHeadRow>
                    </DenseTableHeader>
                    <DenseTableBody>
                      {recentTriggers.map((row, i) => (
                        <DenseTableRow key={`${row.trade_date}-${row.trigger_side}-${i}`}>
                          <DenseTableCell className="font-mono text-dense-meta">
                            {row.trade_date}
                          </DenseTableCell>
                          <DenseTableCell className="capitalize">{row.trigger_side}</DenseTableCell>
                          <DenseTableCell className={denseTableNumCell}>
                            {fmtNum(row.trigger_value)}
                          </DenseTableCell>
                          <DenseTableCell className={denseTableNumCell}>{fmtHit(row.hit_5d)}</DenseTableCell>
                          <DenseTableCell className={denseTableNumCell}>
                            {fmtNum(row.fwd_return_5d, 3)}
                          </DenseTableCell>
                        </DenseTableRow>
                      ))}
                    </DenseTableBody>
                  </DenseDataTable>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}

        <CombinedLensesMatrix windowDays={windowDays} symbol={symbol} regime={regime} />
      </div>
    </PageShell>
  )
}
