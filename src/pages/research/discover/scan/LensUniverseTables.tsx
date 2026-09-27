/**
 * Lens tables on Vol ratings — the universe-wide readings the retired Analyze
 * sections (IV Radar, VRP, Skew) ranked and the ratings list does not show
 * (S5, 2026-09-26; DESIGN_CONTRACTS §15.7 — the stronger surface first, the
 * hierarchy after):
 *
 * - IV rank: the IV Radar table whole — IV, rank, percentile, lookback, each
 *   name's own record on the lens, source and date — with the Benchmarks /
 *   Watchlist / Holdings source, the book's universe, |Rank−50| sorting, the
 *   High / Neutral / Low counts, and the gauge grid with a 90-day rank line.
 * - VRP: both ends of the spread's own-year percentile (sell-vol and
 *   buy-vol), IV30 · RV60 · spread in the row.
 * - Skew: the steepest ATM slopes across names, ungraded — a slope is judged
 *   against the name's own year on the Symbol face, not against one absolute
 *   cut here.
 *
 * Every row opens the name's Symbol page on its Volatility face.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeadRow,
  DenseTableHeader,
  DenseTableRow,
  DenseTag,
  SegmentControl,
  denseTableNumCell,
} from '@/components/data-display'
import { SectionPanel } from '@/components/layout'
import { IvGauge } from '@/components/charts/IvGauge'
import { DenseSparkline } from '@/components/charts/DenseSparkline'
import { PortfolioTag } from '@/components/portfolio/PortfolioTag'
import { fetchIvRankHistory } from '@/api/research/ivRadar'
import { fetchSignalDecayBySymbol } from '@/api/research/signalDecay'
import { useIvRadarData } from '@/hooks/useIvRadarData'
import { PORTFOLIO_UNIVERSE_OPTIONS, usePortfolioSymbols, type PortfolioUniverse } from '@/hooks/usePortfolioSymbols'
import { useSkewExtremes } from '@/hooks/useVolSurfaceData'
import { useVrpExtremes } from '@/hooks/useVrpData'
import { bandFromScore, hitCellText, ordinal } from '@/lib/analyzeDepth'
import { fmtPctFromFraction } from '@/lib/format'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH, TAB_PARAM } from '@/lib/symbolTabs'
import { cn } from '@/lib/utils'
import type { IvRadarRow, IvRadarUniverseFilter } from '@/types/ivRadar'
import { IV_RADAR_BUCKET_HINTS, formatIvRadarSource, ivRankDistanceFrom50 } from '@/utils/ivRadar/universe'

type LensTab = 'iv_rank' | 'vrp' | 'skew'
type RankSort = 'rank' | 'extremes' | 'symbol'

const cap = 'whitespace-nowrap text-dense-meta font-semibold text-muted-foreground'
const volFace = (sym: string) => withSymbolParam(`${SYMBOL_PATH}?${TAB_PARAM}=volatility`, sym)

/** The radar stores IV as a fraction or as percent; show it as percent either way. */
const radarIvText = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? '—' : `${(n > 0 && n < 3 ? n * 100 : n).toFixed(1)}%`
const oneDecimal = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? '—' : n.toFixed(1))

function orderRadarRows(rows: IvRadarRow[], mode: RankSort): IvRadarRow[] {
  const out = [...rows]
  const byNull = (a: number | null, b: number | null, sym: number) =>
    a == null && b == null ? sym : a == null ? 1 : b == null ? -1 : b - a
  if (mode === 'symbol') return out.sort((a, b) => a.symbol.localeCompare(b.symbol))
  if (mode === 'rank') {
    return out.sort((a, b) =>
      byNull(a.data?.iv_rank_1y ?? null, b.data?.iv_rank_1y ?? null, a.symbol.localeCompare(b.symbol)),
    )
  }
  return out.sort((a, b) => {
    const da = ivRankDistanceFrom50(a.data?.iv_rank_1y)
    const db = ivRankDistanceFrom50(b.data?.iv_rank_1y)
    return byNull(da < 0 ? null : da, db < 0 ? null : db, a.symbol.localeCompare(b.symbol))
  })
}

function SymbolCell({ symbol, tag }: { symbol: string; tag?: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <Link to={volFace(symbol)} className="font-mono font-semibold text-entity-symbol hover:underline">
        {symbol}
      </Link>
      <PortfolioTag symbol={symbol} variant="row-suffix" />
      {tag}
    </span>
  )
}

function IvRankTable() {
  const [source, setSource] = useState<IvRadarUniverseFilter>('all')
  const [universe, setUniverse] = useState<PortfolioUniverse>('all')
  const [sort, setSort] = useState<RankSort>('rank')
  const [view, setView] = useState<'table' | 'gauge'>('table')
  const { filterSymbols } = usePortfolioSymbols()
  const { rows, counts, isLoading, isError, error } = useIvRadarData(source)
  const shown = useMemo(() => {
    const ordered = orderRadarRows(rows, sort)
    if (universe === 'all') return ordered
    const allowed = new Set(filterSymbols(universe, ordered.map((r) => r.symbol)))
    return ordered.filter((r) => allowed.has(r.symbol))
  }, [rows, sort, universe, filterSymbols])
  const measured = useMemo(() => shown.filter((r) => r.bucket !== 'no_data').map((r) => r.symbol), [shown])
  const recordsQ = useQuery({
    queryKey: ['signal-decay-by-symbol', 'iv_rank', 365, measured.join(',')],
    queryFn: () => fetchSignalDecayBySymbol({ lens: 'iv_rank', symbols: measured, windowDays: 365 }),
    enabled: measured.length > 0,
    staleTime: 5 * 60_000,
  })
  const gaugeSyms = view === 'gauge' ? measured.slice(0, 12) : []
  const sparkQs = useQueries({
    queries: gaugeSyms.map((sym) => ({
      queryKey: ['iv-rank-history', sym, 90],
      queryFn: () => fetchIvRankHistory(sym, 90),
      staleTime: 5 * 60_000,
    })),
  })

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
        <span className={cap}>Source</span>
        <SegmentControl
          ariaLabel="IV rank source"
          size="xs"
          value={source}
          onChange={(v) => setSource(v as IvRadarUniverseFilter)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'benchmarks', label: 'Benchmarks' },
            { value: 'watchlist', label: 'Watchlist' },
            { value: 'holdings', label: 'Holdings' },
          ]}
        />
        <span className={cap}>Book</span>
        <SegmentControl
          ariaLabel="Book universe"
          size="xs"
          value={universe}
          onChange={(v) => setUniverse(v as PortfolioUniverse)}
          options={[...PORTFOLIO_UNIVERSE_OPTIONS]}
        />
        <span className={cap}>Sort</span>
        <SegmentControl
          ariaLabel="IV rank sort"
          size="xs"
          value={sort}
          onChange={(v) => setSort(v as RankSort)}
          options={[
            { value: 'rank', label: 'Rank' },
            { value: 'extremes', label: '|Rank−50|' },
            { value: 'symbol', label: 'Symbol' },
          ]}
        />
        <SegmentControl
          ariaLabel="IV rank view"
          size="xs"
          value={view}
          onChange={(v) => setView(v as 'table' | 'gauge')}
          options={[
            { value: 'table', label: 'Table' },
            { value: 'gauge', label: 'Gauges' },
          ]}
        />
      </div>
      <div className="grid grid-cols-3 gap-2.5 border-b border-border/60 px-3 py-2">
        {(
          [
            ['High', counts.high, IV_RADAR_BUCKET_HINTS.high, 'text-destructive'],
            ['Neutral', counts.neutral, IV_RADAR_BUCKET_HINTS.neutral, 'text-warning'],
            ['Low', counts.low, IV_RADAR_BUCKET_HINTS.low, 'text-success'],
          ] as const
        ).map(([label, n, hint, cls]) => (
          <div key={label} className="flex min-w-0 flex-col gap-0.5" title={hint}>
            <span className={cap}>{label}</span>
            <span className={cn('font-mono text-dense-body font-semibold tabular-nums', cls)}>{n}</span>
          </div>
        ))}
      </div>
      {isLoading ? (
        <p className="m-0 px-3 py-4 text-dense-meta text-muted-foreground">Loading the radar…</p>
      ) : isError ? (
        <p className="m-0 px-3 py-4 text-dense-meta text-destructive">
          {error instanceof Error ? error.message : 'The radar failed to load.'}
        </p>
      ) : shown.length === 0 ? (
        <p className="m-0 px-3 py-4 text-dense-meta text-muted-foreground">No name in this source and book.</p>
      ) : view === 'gauge' ? (
        <div className="grid grid-cols-2 gap-3 px-3 py-3 sm:grid-cols-4 xl:grid-cols-6">
          {gaugeSyms.map((sym, i) => {
            const row = shown.find((r) => r.symbol === sym)
            const line = (sparkQs[i]?.data ?? [])
              .map((h) => h.iv_rank_1y ?? h.iv_percentile_1y ?? null)
              .filter((v): v is number => v != null)
            return (
              <Link
                key={sym}
                to={volFace(sym)}
                className="flex flex-col items-center gap-1 rounded-md px-2 py-2 no-underline mat-card hover:bg-[var(--sk-surface)]"
              >
                <IvGauge value={row?.data?.iv_rank_1y ?? 0} size={84} />
                <span className="font-mono text-dense-body font-semibold text-entity-symbol">{sym}</span>
                {line.length >= 2 ? <DenseSparkline values={line} width={64} height={16} /> : null}
                <span className="font-mono text-dense-micro text-muted-foreground tabular-nums">
                  IV {radarIvText(row?.data?.iv_current)} · pctl {oneDecimal(row?.data?.iv_percentile_1y)}
                </span>
              </Link>
            )
          })}
          {measured.length > gaugeSyms.length ? (
            <p className="col-span-full m-0 text-dense-micro text-muted-foreground">
              The first 12 of {measured.length} measured names, in the table&rsquo;s order.
            </p>
          ) : null}
        </div>
      ) : (
        <DenseDataTable wrapClassName="rounded-none border-0 overflow-x-auto" tableClassName="min-w-[52rem]">
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead>Symbol</DenseTableHead>
              <DenseTableHead className="text-right">IV</DenseTableHead>
              <DenseTableHead className="text-right">IV rank</DenseTableHead>
              <DenseTableHead className="text-right">IV pctl</DenseTableHead>
              <DenseTableHead className="text-right">Lookback</DenseTableHead>
              <DenseTableHead
                className="text-right"
                title="This name's own hit rate on the iv_rank lens, 5d / 20d, last 365 days. Only hot (≥ 80) and cold (≤ 20) readings trigger, so rows between show no record."
              >
                Own hit 5d / 20d
              </DenseTableHead>
              <DenseTableHead>Source</DenseTableHead>
              <DenseTableHead>As of</DenseTableHead>
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {shown.map((r) => (
              <DenseTableRow key={r.symbol}>
                <DenseTableCell>
                  <SymbolCell
                    symbol={r.symbol}
                    tag={
                      r.bucket === 'no_data' ? (
                        <span className="text-dense-micro text-muted-foreground">no data</span>
                      ) : (
                        <DenseTag variant={r.bucket === 'high' ? 'danger' : r.bucket === 'low' ? 'success' : 'warning'}>
                          {r.bucket === 'high' ? 'High' : r.bucket === 'low' ? 'Low' : 'Neutral'}
                        </DenseTag>
                      )
                    }
                  />
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{radarIvText(r.data?.iv_current)}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{oneDecimal(r.data?.iv_rank_1y)}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{oneDecimal(r.data?.iv_percentile_1y)}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  {r.data?.lookback_days != null ? String(r.data.lookback_days) : '—'}
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  {recordsQ.isLoading ? '…' : hitCellText(recordsQ.data?.rows, r.symbol, bandFromScore(r.data?.iv_rank_1y))}
                </DenseTableCell>
                <DenseTableCell className="text-dense-meta">{formatIvRadarSource(r.sources)}</DenseTableCell>
                <DenseTableCell className="text-dense-meta text-muted-foreground">{r.data?.trade_date ?? '—'}</DenseTableCell>
              </DenseTableRow>
            ))}
          </DenseTableBody>
        </DenseDataTable>
      )}
    </>
  )
}

function VrpEndsTable() {
  const [end, setEnd] = useState<'high' | 'low'>('high')
  const q = useVrpExtremes(end, 20)
  const rows = q.data?.rows ?? []
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b border-border/60 px-3 py-2">
        <span className={cap}>End</span>
        <SegmentControl
          ariaLabel="VRP end"
          size="xs"
          value={end}
          onChange={(v) => setEnd(v as 'high' | 'low')}
          options={[
            { value: 'high', label: 'High · sell-vol' },
            { value: 'low', label: 'Low · buy-vol' },
          ]}
        />
        <span className="ml-auto text-dense-micro text-muted-foreground">
          the spread&rsquo;s percentile in each name&rsquo;s own year · {q.data?.as_of ?? '—'}
        </span>
      </div>
      {q.isLoading ? (
        <p className="m-0 px-3 py-4 text-dense-meta text-muted-foreground">Loading the VRP ends…</p>
      ) : rows.length === 0 ? (
        <p className="m-0 px-3 py-4 text-dense-meta text-muted-foreground">No {end} VRP names today.</p>
      ) : (
        <DenseDataTable wrapClassName="rounded-none border-0 overflow-x-auto" tableClassName="min-w-[36rem]">
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead>Symbol</DenseTableHead>
              <DenseTableHead className="text-right">VRP pctl</DenseTableHead>
              <DenseTableHead className="text-right">IV30</DenseTableHead>
              <DenseTableHead className="text-right">RV60</DenseTableHead>
              <DenseTableHead className="text-right" title="IV30 − RV60, in vol points.">
                Spread
              </DenseTableHead>
              <DenseTableHead>As of</DenseTableHead>
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {rows.map((r) => (
              <DenseTableRow key={`${end}-${r.symbol}`}>
                <DenseTableCell>
                  <SymbolCell
                    symbol={r.symbol}
                    tag={<DenseTag variant={end === 'high' ? 'success' : 'danger'}>{end === 'high' ? 'Sell-vol' : 'Buy-vol'}</DenseTag>}
                  />
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  {r.vrp_pct_252d != null ? ordinal(r.vrp_pct_252d) : '—'}
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{fmtPctFromFraction(r.atm_iv_30d)}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{fmtPctFromFraction(r.rv_60d)}</DenseTableCell>
                <DenseTableCell className={cn(denseTableNumCell, r.vrp_60d != null && r.vrp_60d < 0 ? 'text-loss' : undefined)}>
                  {r.vrp_60d != null ? `${r.vrp_60d >= 0 ? '+' : '−'}${Math.abs(r.vrp_60d * 100).toFixed(1)} pp` : '—'}
                </DenseTableCell>
                <DenseTableCell className="text-dense-meta text-muted-foreground">{r.trade_date ?? '—'}</DenseTableCell>
              </DenseTableRow>
            ))}
          </DenseTableBody>
        </DenseDataTable>
      )}
    </>
  )
}

const GOOD_FIT_PTS = 10
const SKEW_ROWS = 20

function SkewSteepTable() {
  // A deep-wing fit fails and its slope with it: on 2026-09-25 the five steepest
  // slopes all came off fits 28–157 IV points wide. Ask for more than the page
  // shows so the good-fit filter still has twenty to show.
  const q = useSkewExtremes(100)
  const [goodOnly, setGoodOnly] = useState(false)
  const all = q.data?.rows ?? []
  const rows = (goodOnly ? all.filter((r) => r.fit_rmse != null && r.fit_rmse * 100 <= GOOD_FIT_PTS) : all).slice(0, SKEW_ROWS)
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b border-border/60 px-3 py-2">
        <SegmentControl
          ariaLabel="Skew fit filter"
          size="xs"
          value={goodOnly ? 'good' : 'all'}
          onChange={(v) => setGoodOnly(v === 'good')}
          options={[
            { value: 'all', label: 'All fits' },
            { value: 'good', label: `RMSE ≤ ${GOOD_FIT_PTS} pts` },
          ]}
        />
        <span className="text-dense-micro text-muted-foreground text-pretty">
          The steepest ATM slopes of the SVI fits at each name&rsquo;s ~30-day expiry, ungraded: a slope is judged
          against the name&rsquo;s own year on its Volatility face, not against one cut across names.
        </span>
        <span className="ml-auto text-dense-micro text-muted-foreground">{q.data?.as_of ?? '—'}</span>
      </div>
      {q.isLoading ? (
        <p className="m-0 px-3 py-4 text-dense-meta text-muted-foreground">Loading the slopes…</p>
      ) : rows.length === 0 ? (
        <p className="m-0 px-3 py-4 text-dense-meta text-muted-foreground">
          {goodOnly ? `None of the ${all.length} steepest fits is within ${GOOD_FIT_PTS} IV points.` : 'No SVI fits with a slope today.'}
        </p>
      ) : (
        <DenseDataTable wrapClassName="rounded-none border-0 overflow-x-auto" tableClassName="min-w-[36rem]">
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead>Symbol</DenseTableHead>
              <DenseTableHead className="text-right">DTE</DenseTableHead>
              <DenseTableHead className="text-right">ATM slope</DenseTableHead>
              <DenseTableHead className="text-right">ATM vol</DenseTableHead>
              <DenseTableHead className="text-right" title="The fit's RMSE in IV points (0.20 = 20 pts) — a poor fit's slope is the wings talking.">
                RMSE
              </DenseTableHead>
              <DenseTableHead className="text-right">Points</DenseTableHead>
              <DenseTableHead>As of</DenseTableHead>
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {rows.map((r) => (
              <DenseTableRow key={`${r.symbol}-${r.expiry}`}>
                <DenseTableCell>
                  <SymbolCell
                    symbol={r.symbol}
                    tag={
                      r.atm_slope != null && Math.abs(r.atm_slope) >= 0.001 ? (
                        <DenseTag variant={r.atm_slope < 0 ? 'success' : 'neutral'}>
                          {r.atm_slope < 0 ? 'Call skew' : 'Put skew'}
                        </DenseTag>
                      ) : (
                        <span className="text-dense-micro text-muted-foreground">flat</span>
                      )
                    }
                  />
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{r.dte ?? '—'}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{r.atm_slope != null ? r.atm_slope.toFixed(4) : '—'}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{fmtPctFromFraction(r.atm_vol)}</DenseTableCell>
                <DenseTableCell className={cn(denseTableNumCell, r.fit_rmse != null && r.fit_rmse * 100 > GOOD_FIT_PTS ? 'text-warning' : undefined)}>
                  {r.fit_rmse != null ? `${(r.fit_rmse * 100).toFixed(1)} pts` : '—'}
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{r.n_points ?? '—'}</DenseTableCell>
                <DenseTableCell className="text-dense-meta text-muted-foreground">{r.trade_date ?? '—'}</DenseTableCell>
              </DenseTableRow>
            ))}
          </DenseTableBody>
        </DenseDataTable>
      )}
    </>
  )
}

export function LensUniverseTables() {
  const [tab, setTab] = useState<LensTab>('iv_rank')
  return (
    <SectionPanel
      cap="Lens tables"
      title="each vol lens across names"
      note="the readings the composite is built from, one lens at a time · a row opens the name's Volatility face"
      action={
        <SegmentControl
          ariaLabel="Lens table"
          size="xs"
          value={tab}
          onChange={(v) => setTab(v as LensTab)}
          options={[
            { value: 'iv_rank', label: 'IV rank' },
            { value: 'vrp', label: 'VRP' },
            { value: 'skew', label: 'Skew' },
          ]}
        />
      }
    >
      {tab === 'iv_rank' ? <IvRankTable /> : tab === 'vrp' ? <VrpEndsTable /> : <SkewSteepTable />}
    </SectionPanel>
  )
}
