/**
 * Signal Decay — walked against `Research Signal Decay.dc.html`
 * (Rev 2026-09-17.1) on 2026-09-22.
 *
 * ## The design asks a question this page could not answer
 *
 * The page was a per-lens instrument: pick a lens, a window and a regime, and
 * read that one signal's hot/cold matrix, its intersections and its symbols.
 * The design's page asks *which of them is slipping* — a roster of every
 * signal, worst drift first, with an amber panel over it. No amount of
 * picking one at a time answers that, so the roster leads and the instrument
 * stays below it.
 *
 * ## The rule, and where its two numbers come from
 *
 * The design's footer is the whole argument: **decay is judged against each
 * signal's own 1-year average, not against other signals.** The endpoint
 * takes a `window_days`, so "now" and "its own year" are the same call asked
 * twice — 90 against 252. Measured on DEV 2026-09-22 for `vrp hot`: 40.1% on
 * 152 settled at 90 days against 43.7% on 245 at 252. That is the drift, in
 * the design's terms.
 *
 * ## What is owed, and why
 *
 * **Profit factor** is read since research 0.132.0 (the page drew it as owed
 * until 2026-09-28): the settled rows' returns, each signed by its side's own
 * direction, gains over losses — null for Gamma, a magnitude lens. The
 * trend bars are the engine's weekly **5-day** rolling rate, which is the only
 * series it keeps — the header says `5d` rather than letting a 20-day column
 * sit over a 5-day chart. And the design's alert *"zeroes the conviction cap
 * in Compare"*: Compare exists since 2026-09-23 but reads its conviction off the
 * structure's closed record, not off a lens's decay, so nothing on this side
 * acts on an alert yet and the panel says so instead of implying it does.
 */
import { useCallback, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import { PageHead, PageHeadLink, PageShell, SectionHead } from '@/components/layout'
import { ViewState } from '@bifrost/ui'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  SegmentControl,
  denseTableNumCell,
} from '@/components/data-display'
import { fmtNum, fmtPctWholeFromFraction } from '@/lib/format'
import { PortfolioTag } from '@/components/portfolio/PortfolioTag'
import { Card, CardContent } from '@/components/ui/card'
import { SignalWinRatePanel } from './SignalWinRatePanel'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePreviewState } from '@/hooks/usePreviewState'
import { failedDetail } from '@/lib/viewState'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import { AnalyzeVerdictStrip } from '@/components/research/AnalyzeVerdictStrip'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { SaveAsHypothesisButton } from '@/components/research/SaveAsHypothesisButton'
import {
  fetchSignalDecay,
  fetchSignalDecayIntersect,
  type SignalDecayIntersectResponse,
  SIGNAL_DECAY_LENSES,
  isSignalDecayLens,
  type SignalDecayLens,
  type SignalDecayRegime,
  type SignalDecaySideStats,
  type SignalDecayTrendPoint,
} from '@/api/research/signalDecay'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { DecayRoster } from './DecayRoster'
import { useDecayRoster } from '@/hooks/useDecayRoster'
import { fmtProfitFactor } from '@/utils/decayRosterModel'

/**
 * The page's selector, and what `?lens=` may name — one list, in the module
 * that owns the vocabulary (`api/research/signalDecay`), because the alert
 * rows link here by lens and a link may only name a lens this page can show.
 */
const LENS_OPTIONS = [...SIGNAL_DECAY_LENSES]

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
            <div>{`${fmtPctWholeFromFraction(s.hit_rate_5d)} / ${fmtPctWholeFromFraction(s.hit_rate_20d)} (n=${s.n})`}</div>
            <div
              className="text-dense-caption text-muted-foreground"
              title="Profit factor 5d / 20d — this side's settled returns on its own direction, gains over losses"
            >
              PF {fmtProfitFactor(s.profit_factor_5d)} / {fmtProfitFactor(s.profit_factor_20d)}
            </div>
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
        ...QUERY_KEYS.researchEngine.signalDecayIntersect,
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
      <SectionHead note="Two lenses firing on the same name and day, against each lens alone.">
        Combined lenses
      </SectionHead>
      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
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
                          {`${fmtPctWholeFromFraction(data.hit_rate_5d)} (n=${data.n})`}
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
                  Combined 5d {fmtPctWholeFromFraction(detail.data.hit_rate_5d)} / 20d {fmtPctWholeFromFraction(detail.data.hit_rate_20d)}{' '}
                  (n={detail.data.n})
                </p>
                <div className="space-y-1">
                  <p className="text-dense-meta font-semibold text-muted-foreground">
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
                          <DenseTableCell className={denseTableNumCell}>{fmtPctWholeFromFraction(v.hit_rate_5d)}</DenseTableCell>
                          <DenseTableCell className={denseTableNumCell}>{v.n}</DenseTableCell>
                        </DenseTableRow>
                      ))}
                    </DenseTableBody>
                  </DenseDataTable>
                </div>
                {detail.data.sample.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-dense-meta font-semibold text-muted-foreground">
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
  // An alert names the lens it is about, so the link that opens this page
  // carries it. Reading it here is what makes that link mean what it says —
  // it was attached and dropped, which lands on IV Rank whatever it named.
  const urlLens = searchParams.get('lens')
  const [lens, setLens] = useState<SignalDecayLens>(
    isSignalDecayLens(urlLens) ? urlLens : 'iv_rank',
  )
  // 90d by default: the 20-session horizon has settled rows to show, 30d never did.
  const [windowDays, setWindowDays] = useState(90)
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
    queryKey: [...QUERY_KEYS.researchEngine.signalDecay, lens, 30, symbol ?? null, regime],
    queryFn: () => fetchSignalDecay({ lens, windowDays: 30, symbol, regime }),
    staleTime: 60_000,
  })
  const q90 = useQuery({
    queryKey: [...QUERY_KEYS.researchEngine.signalDecay, lens, 90, symbol ?? null, regime],
    queryFn: () => fetchSignalDecay({ lens, windowDays: 90, symbol, regime }),
    staleTime: 60_000,
  })
  const q252 = useQuery({
    queryKey: [...QUERY_KEYS.researchEngine.signalDecay, lens, 252, symbol ?? null, regime],
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
        label: `${lens} hot 5d ${fmtPctWholeFromFraction(hot)}`,
        narrative: `Mean-revert hypothesis looks viable on ${scope}${lens} hot triggers (${windowDays}d window${regimeNote}, n=${data?.by_side.hot.n ?? 0}).`,
      }
    }
    if ((hot ?? 1) < 0.45) {
      return {
        tone: 'warning' as const,
        label: `${lens} hot 5d ${fmtPctWholeFromFraction(hot)}`,
        narrative: `Hot-side hit-rate below coin-flip — treat ${scope}${lens} extremes cautiously.`,
      }
    }
    return {
      tone: 'neutral' as const,
      label: `${lens} 5d ${fmtPctWholeFromFraction(rate)}`,
      narrative: `Mixed edge on ${scope}${lens} (${windowDays}d${regimeNote}). Compare hot vs cold columns below.`,
    }
  }, [data, lens, windowDays, symbol, regime])

  const loading = q30.isLoading || q90.isLoading || q252.isLoading
  const err = q30.error || q90.error || q252.error
  const roster = useDecayRoster()

  const preview = usePreviewState()
  // §17.1: the roster is the page's reading; the instrument below keeps its
  // own states, because it is one lens asked on purpose.
  const pageState =
    preview === 'loading' || preview === 'failed' || preview === 'stale'
      ? preview
      : roster.loading && roster.rows.length === 0
        ? 'loading'
        : roster.allFailed
          ? 'failed'
          : 'ready'
  const rosterFailedQ = { data: null, isPending: false, isError: true, error: roster.error }
  const instrumentState = err ? 'failed' : loading ? 'loading' : !data || data.trigger_count === 0 ? 'empty' : 'ready'

  return (
    <PageShell padding="compact" className="space-y-3">
      {/* §16.10 · Rev .88: the lead behind ⓘ, Playbook stats as the head's door. */}
      <PageHead
        title="Signal Decay"
        info="Is each signal still earning its keep — rolling hit rates, drift against its own year, and the alerts that cut conviction credit."
        actions={
          <>
            <PageHeadLink to="/review/playbook?tab=record" title="The settled evidence behind each signal">
              Playbook record →
            </PageHeadLink>
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
                  ? `Interpret ${symbol} ${lens} signal decay (regime=${regime}): hot 5d hit-rate ${fmtPctWholeFromFraction(data?.by_side.hot.hit_rate_5d)} over ${windowDays}d. Is mean-revert still valid?`
                  : `Interpret ${lens} signal decay (regime=${regime}): hot 5d hit-rate ${fmtPctWholeFromFraction(data?.by_side.hot.hit_rate_5d)} over ${windowDays}d. Is mean-revert still valid?`
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
          </>
        }
      />

      {pageState === 'stale' ? (
        <ViewState
          kind="stale"
          title="Couldn’t refresh signal decay"
          detail="Showing the last copy — decay may be a session old."
          onAction={roster.retry}
        />
      ) : null}
      {pageState === 'loading' ? (
        <section className="overflow-hidden mat-card">
          <ViewState kind="loading" title="Loading signal decay" rows={8} cols={6} />
        </section>
      ) : pageState === 'failed' ? (
        <section className="overflow-hidden mat-card">
          <ViewState
            kind="failed"
            title="Couldn’t load signal decay"
            detail={failedDetail(
              rosterFailedQ,
              'No decay curve was read — no alert shown is not the same as healthy signals.',
            )}
            onAction={roster.retry}
          />
        </section>
      ) : (
        <>
          {/* The design's lead, and the question the picker below cannot ask:
              which of the signals is slipping. */}
          <DecayRoster rows={roster.rows} alerts={roster.alerts} loading={roster.loading} />
          {roster.failed.length > 0 ? (
            <ViewState
              kind="stale"
              layout="strip"
              title={`No reading arrived for ${roster.failed.join(', ')}`}
              detail="Those rows are absent rather than zero."
              onAction={roster.retry}
            />
          ) : null}
        </>
      )}

      {/* Under the lens table (Rev .158 B4): a signal's edge across a basket —
          a cross-section, not a decay curve, so it carries no alert. */}
      <SignalWinRatePanel />

      {/* Below them: the per-lens instrument this page already was. */}
      <SectionHead
        note="The per-lens instrument: hot against cold, three windows, one regime."
        meta={
          symbol ? (
            <span className="inline-flex items-center gap-2">
              <Link
                to={withSymbolParam(SYMBOL_PATH, symbol)}
                className="font-semibold text-entity-symbol hover:underline"
              >
                {symbol}
              </Link>
              <PortfolioTag symbol={symbol} variant="inline" />
              <Link
                to={`/research/signal-decay${regime !== 'any' ? `?regime=${regime}` : ''}`}
                className="text-primary hover:underline"
              >
                All symbols
              </Link>
            </span>
          ) : (
            <Link
              to={`/research/signal-decay/SPY${regime !== 'any' ? `?regime=${regime}` : ''}`}
              className="text-primary hover:underline"
              title="A symbol's page adds its recent triggers"
            >
              One symbol&rsquo;s triggers →
            </Link>
          )
        }
      >
        One lens, up close
      </SectionHead>

      <div data-sr-toolbar="">
        <span data-sr-tb="label">Lens</span>
        <SegmentControl
          size="xs"
          ariaLabel="Lens"
          value={lens}
          onChange={(v) => setLens(v as SignalDecayLens)}
          options={LENS_OPTIONS}
        />
        <span data-sr-tb="sep" />
        <span data-sr-tb="label">Window</span>
        <SegmentControl
          size="xs"
          ariaLabel="Window"
          value={String(windowDays)}
          onChange={(v) => setWindowDays(Number(v))}
          options={WINDOW_OPTIONS}
        />
        <span data-sr-tb="sep" />
        <span data-sr-tb="label">Regime</span>
        <SegmentControl
          size="xs"
          ariaLabel="Regime"
          value={regime}
          onChange={(v) => setRegime(v as SignalDecayRegime)}
          options={REGIME_OPTIONS}
        />
      </div>

      <AnalyzeVerdictStrip
        tone={verdict.tone}
        verdictLabel={verdict.label}
        narrative={verdict.narrative}
        signals={[
          { label: 'Lens', value: lens },
          { label: 'Window', value: `${windowDays}d` },
          { label: 'Regime', value: regime },
          { label: 'Triggers', value: String(data?.trigger_count ?? 0) },
          { label: '5d hit', value: fmtPctWholeFromFraction(data?.hit_rate_5d) },
          { label: '5d PF', value: fmtProfitFactor(data?.profit_factor_5d) },
        ]}
      />

      {instrumentState === 'failed' ? (
        <section className="overflow-hidden mat-card">
          <ViewState
            kind="failed"
            title={`Couldn’t load ${lens}`}
            detail={failedDetail(
              { data: null, isPending: false, isError: true, error: err },
              'This lens was not evaluated — the roster above is unaffected.',
            )}
            onAction={() => void active.refetch()}
          />
        </section>
      ) : instrumentState === 'loading' ? (
        <section className="overflow-hidden mat-card">
          <ViewState kind="loading" title={`Loading ${lens}`} rows={4} cols={4} />
        </section>
      ) : instrumentState === 'empty' ? (
        <section className="overflow-hidden mat-card">
          <ViewState
            kind="empty"
            title="No lens hits yet"
            detail="Nothing settled in this window and regime — the research-signal-hit job fills stock_signal_lens_hit_daily."
          />
        </section>
      ) : data ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <Card variant="elevated">
              <CardContent className="space-y-1 px-3 py-2">
                <p className="text-dense-meta font-semibold text-muted-foreground">
                  Hot rolling 5d hit-rate
                </p>
                <MiniSpark points={data.trend_hot ?? []} />
              </CardContent>
            </Card>
            <Card variant="elevated">
              <CardContent className="space-y-1 px-3 py-2">
                <p className="text-dense-meta font-semibold text-muted-foreground">
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
                <p className="text-dense-meta font-semibold text-muted-foreground">
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
                      <DenseTableHead className="text-right">Hit 20d</DenseTableHead>
                      <DenseTableHead className="text-right">Fwd 20d</DenseTableHead>
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
                        <DenseTableCell className={denseTableNumCell}>{fmtHit(row.hit_20d)}</DenseTableCell>
                        <DenseTableCell className={denseTableNumCell}>
                          {fmtNum(row.fwd_return_20d, 3)}
                        </DenseTableCell>
                      </DenseTableRow>
                    ))}
                  </DenseTableBody>
                </DenseDataTable>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}

      <CombinedLensesMatrix windowDays={windowDays} symbol={symbol} regime={regime} />
    </PageShell>
  )
}
