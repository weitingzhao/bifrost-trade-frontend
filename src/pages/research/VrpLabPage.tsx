import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Waves } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import {
  DenseDataTable,
  DenseLinkButton,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  EmptyState,
  SegmentControl,
  denseTable,
  denseTableEntityCell,
  denseTableNumCell,
} from '@/components/data-display'
import { Card, CardContent } from '@/components/ui/card'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { ResearchContextBar } from '@/components/research/ResearchContextBar'
import { SymbolContextGuard } from '@/components/research/SymbolContextGuard'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { SaveAsHypothesisButton } from '@/components/research/SaveAsHypothesisButton'
import { SimilarRegimeCard } from '@/components/research/SimilarRegimeCard'
import { CompositeRegimeRibbon } from '@/components/research/CompositeRegimeRibbon'
import { AnalyzeVerdictStrip } from '@/components/research/AnalyzeVerdictStrip'
import { CopilotAutoInsightChip } from '@/components/research/CopilotAutoInsightChip'
import { withWatchlistContractKey } from '@/components/research/watchlistContractKey'
import { PortfolioTag } from '@/components/portfolio/PortfolioTag'
import { VrpTimeSeriesChart } from '@/components/charts/VrpTimeSeriesChart'
import {
  useVrpExtremes,
  useVrpHistory,
  useVrpLatest,
} from '@/hooks/useVrpData'
import {
  PORTFOLIO_UNIVERSE_OPTIONS,
  usePortfolioSymbols,
  type PortfolioUniverse,
} from '@/hooks/usePortfolioSymbols'
import { useResearchContext } from '@/hooks/useResearchContext'
import { askCopilotIntentStore } from '@/store/askCopilotIntentStore'
import { copilotViewStore } from '@/store/copilotViewStore'
import { cn } from '@/lib/utils'
import type { VrpRow } from '@/api/research/vrp'

type Bucket = 'high' | 'low'

function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${(n * 100).toFixed(digits)}%`
}

function fmtSpread(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${(n * 100).toFixed(1)}%`
}

function fmtPercentile(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toFixed(0)
}

function percentileBandTone(
  pct: number | null | undefined,
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (pct == null || !Number.isFinite(pct)) return 'neutral'
  if (pct >= 80) return 'success'
  if (pct <= 20) return 'danger'
  return 'warning'
}

function percentileBandLabel(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return 'No VRP — wait'
  if (pct >= 80) return 'Sell-vol edge'
  if (pct <= 20) return 'Buy-vol edge'
  return 'No VRP edge — flat'
}

function verdictText(row: VrpRow | null | undefined): string {
  if (!row) return 'No VRP yet — wait for 252d history before sizing vol.'
  const pct = row.vrp_pct_252d
  if (pct == null || !Number.isFinite(pct)) {
    return `${row.symbol}: VRP percentile not ready (needs ≥252d) — do not size from this page.`
  }
  const iv = row.atm_iv_30d
  const rv = row.rv_60d
  const spread = row.vrp_60d
  const ivStr = iv != null ? fmtPct(iv) : '—'
  const rvStr = rv != null ? fmtPct(rv) : '—'
  const spreadStr = spread != null ? fmtSpread(spread) : '—'
  if (pct >= 80) {
    return `Prefer short premium in ${row.symbol}: VRP ${fmtPercentile(pct)}th pctl (IV ${ivStr} > RV ${rvStr}, spread ${spreadStr}). Confirm with IV Rank.`
  }
  if (pct <= 20) {
    return `Prefer long premium in ${row.symbol}: VRP ${fmtPercentile(pct)}th pctl (IV ${ivStr} < RV ${rvStr}, spread ${spreadStr}). Confirm with IV Rank.`
  }
  return `${row.symbol} VRP mid-band (${fmtPercentile(pct)}th) — no standalone sell/buy-vol edge (IV ${ivStr}, RV60 ${rvStr}).`
}

function DistributionBar({
  rows,
  currentPct,
}: {
  rows: VrpRow[]
  currentPct: number | null | undefined
}) {
  const bins = useMemo(() => {
    const buckets = Array.from({ length: 10 }, () => 0)
    let total = 0
    rows.forEach((r) => {
      const p = r.vrp_pct_252d
      if (p == null || !Number.isFinite(p)) return
      const idx = Math.min(9, Math.max(0, Math.floor(p / 10)))
      buckets[idx] += 1
      total += 1
    })
    const max = Math.max(1, ...buckets)
    return { buckets, max, total }
  }, [rows])

  if (bins.total === 0) {
    return (
      <p className="py-4 text-center text-dense-meta text-muted-foreground">
        Percentile history not populated yet.
      </p>
    )
  }

  const currentBin =
    currentPct != null && Number.isFinite(currentPct)
      ? Math.min(9, Math.max(0, Math.floor(currentPct / 10)))
      : -1

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-24">
        {bins.buckets.map((count, i) => {
          const heightPct = (count / bins.max) * 100
          const highlighted = i === currentBin
          return (
            <div
              key={i}
              className={cn(
                'flex-1 rounded-sm transition-colors',
                highlighted ? 'bg-primary' : 'bg-muted',
              )}
              style={{ height: `${Math.max(heightPct, 2)}%` }}
              title={`${i * 10}-${i * 10 + 10}th percentile · ${count} day${count === 1 ? '' : 's'}`}
            />
          )
        })}
      </div>
      <div className="flex justify-between text-dense-micro text-muted-foreground font-mono">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
      <p className="text-dense-meta text-muted-foreground">
        Distribution of daily <span className="font-medium text-foreground">VRP percentile</span>{' '}
        over trailing history ({bins.total} days). Highlighted bar = today.
      </p>
    </div>
  )
}

/** Wave 16 — dual histogram of ATM IV vs RV levels (10 bins on shared max). */
function IvRvDualHistogram({ rows }: { rows: VrpRow[] }) {
  const { ivBins, rvBins, max, n } = useMemo(() => {
    const ivs: number[] = []
    const rvs: number[] = []
    rows.forEach((r) => {
      if (r.atm_iv_30d != null && Number.isFinite(r.atm_iv_30d)) ivs.push(r.atm_iv_30d)
      if (r.rv_60d != null && Number.isFinite(r.rv_60d)) rvs.push(r.rv_60d)
    })
    const all = [...ivs, ...rvs]
    if (all.length === 0) {
      return { ivBins: [] as number[], rvBins: [] as number[], max: 1, n: 0 }
    }
    const lo = Math.min(...all)
    const hi = Math.max(...all)
    const span = hi - lo || 1
    const empty = () => Array.from({ length: 10 }, () => 0)
    const ivBins = empty()
    const rvBins = empty()
    const place = (v: number, buckets: number[]) => {
      const idx = Math.min(9, Math.max(0, Math.floor(((v - lo) / span) * 10)))
      buckets[idx] += 1
    }
    ivs.forEach((v) => place(v, ivBins))
    rvs.forEach((v) => place(v, rvBins))
    const max = Math.max(1, ...ivBins, ...rvBins)
    return { ivBins, rvBins, max, n: Math.max(ivs.length, rvs.length) }
  }, [rows])

  if (n === 0) {
    return (
      <p className="py-4 text-center text-dense-meta text-muted-foreground">
        IV / RV history not populated yet.
      </p>
    )
  }

  const render = (bins: number[], tone: 'iv' | 'rv') => (
    <div className="flex items-end gap-0.5 h-20 flex-1">
      {bins.map((count, i) => (
        <div
          key={i}
          className={cn(
            'flex-1 rounded-sm',
            tone === 'iv' ? 'bg-sky-500/70' : 'bg-amber-500/70',
          )}
          style={{ height: `${Math.max((count / max) * 100, 2)}%` }}
          title={`${tone.toUpperCase()} bin ${i + 1}: ${count}`}
        />
      ))}
    </div>
  )

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <div className="flex-1 space-y-1">
          <p className="text-dense-micro text-muted-foreground">ATM IV 30d</p>
          {render(ivBins, 'iv')}
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-dense-micro text-muted-foreground">RV 60d</p>
          {render(rvBins, 'rv')}
        </div>
      </div>
      <p className="text-dense-meta text-muted-foreground">
        Dual histogram over trailing history ({n} days). Shared scale — rich IV sits right of RV when
        sell-vol edge is present.
      </p>
    </div>
  )
}

function ExtremesTable({
  rows,
  bucket,
  onPick,
}: {
  rows: VrpRow[]
  bucket: Bucket
  onPick: (symbol: string) => void
}) {
  if (rows.length === 0) {
    return (
      <div className="py-4 text-center text-dense-meta text-muted-foreground">
        No {bucket === 'high' ? 'high' : 'low'} VRP candidates yet.
      </div>
    )
  }
  return (
    <DenseDataTable tableClassName="min-w-[560px]">
      <colgroup>
        <col style={{ width: '18%' }} />
        <col style={{ width: '16%' }} />
        <col style={{ width: '16%' }} />
        <col style={{ width: '16%' }} />
        <col style={{ width: '16%' }} />
        <col style={{ width: '18%' }} />
      </colgroup>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Symbol</DenseTableHead>
          <DenseTableHead className="text-right">VRP %ile</DenseTableHead>
          <DenseTableHead className="text-right">IV 30d</DenseTableHead>
          <DenseTableHead className="text-right">RV 60d</DenseTableHead>
          <DenseTableHead className="text-right">Spread</DenseTableHead>
          <DenseTableHead>As-of</DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {rows.map((row) => (
          <DenseTableRow key={`${bucket}-${row.symbol}`}>
            <DenseTableCell className={denseTableEntityCell}>
              <div className="flex items-center gap-1.5">
                <DenseLinkButton
                  variant="stock"
                  label={row.symbol}
                  ariaLabel={`Load ${row.symbol} in VRP Lab`}
                  onClick={() => onPick(row.symbol)}
                />
                <PortfolioTag symbol={row.symbol} variant="row-suffix" />
                <DenseTag variant={bucket === 'high' ? 'success' : 'danger'}>
                  {bucket === 'high' ? 'Sell-vol' : 'Buy-vol'}
                </DenseTag>
              </div>
            </DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>
              {fmtPercentile(row.vrp_pct_252d)}
            </DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>
              {fmtPct(row.atm_iv_30d)}
            </DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>
              {fmtPct(row.rv_60d)}
            </DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>
              {fmtSpread(row.vrp_60d)}
            </DenseTableCell>
            <DenseTableCell className={denseTable.mutedMeta}>
              {row.trade_date ?? '—'}
            </DenseTableCell>
          </DenseTableRow>
        ))}
      </DenseTableBody>
    </DenseDataTable>
  )
}

export default function VrpLabPage() {
  const navigate = useNavigate()
  const { symbol, setSymbol } = useResearchContext()
  const [bucket, setBucket] = useState<Bucket>('high')
  const [universe, setUniverse] = useState<PortfolioUniverse>('all')
  const { filterSymbols } = usePortfolioSymbols()

  const latestQ = useVrpLatest(symbol)
  const historyQ = useVrpHistory(symbol, 252)
  const extremesQ = useVrpExtremes(bucket, 20)

  const latest = latestQ.data ?? null
  const history = historyQ.data ?? []
  const extremes = useMemo(() => {
    const rows = extremesQ.data?.rows ?? []
    if (universe === 'all') return rows
    const allowed = new Set(filterSymbols(universe, rows.map((r) => r.symbol)))
    return rows.filter((r) => allowed.has(r.symbol))
  }, [extremesQ.data?.rows, universe, filterSymbols])

  const verdictTone = percentileBandTone(latest?.vrp_pct_252d)
  const verdictLabel = percentileBandLabel(latest?.vrp_pct_252d)
  const verdictTextValue = verdictText(latest)
  const symbolOutOfUniverse =
    universe !== 'all' &&
    Boolean(symbol.trim()) &&
    filterSymbols(universe, [symbol]).length === 0

  const anyLoading = latestQ.isLoading || historyQ.isLoading
  const anyError = latestQ.isError || historyQ.isError

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="IV-RV Spread Lab"
        description="Volatility Risk Premium (IV − RV) percentile regime. Sell-vol edge when VRP high, buy-vol edge when VRP low. Observe-only (D10)."
        actions={
          <div className="flex items-center gap-1.5">
            <AskCopilotButton
              originPage="vrp-lab"
              originLabel="VRP Lab"
              symbol={symbol}
              date={latest?.trade_date ?? undefined}
              snapshot={compactSnapshot({
                vrp_pct: latest?.vrp_pct_252d,
                vrp_60d: latest?.vrp_60d,
                atm_iv_30d: latest?.atm_iv_30d,
                rv_60d: latest?.rv_60d,
              })}
              suggestedPrompt={`Explain ${symbol} current VRP / IV rank and comparable historical regimes.`}
            />
            <SaveAsHypothesisButton
              originPage="vrp-lab"
              defaultTitle={`${symbol} VRP hypothesis`}
              defaultSymbols={[symbol]}
              defaultTags={['vrp', 'iv-rv']}
              originRef={withWatchlistContractKey(
                {
                  symbol,
                  date: latest?.trade_date ?? null,
                  vrp_pct: latest?.vrp_pct_252d ?? null,
                  vrp_60d: latest?.vrp_60d ?? null,
                  atm_iv_30d: latest?.atm_iv_30d ?? null,
                  rv_60d: latest?.rv_60d ?? null,
                },
                symbol,
              )}
            />
          </div>
        }
      />

      <ResearchContextBar showDate={false} />

      <SymbolContextGuard symbol={symbol}>

      {symbol.trim() ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-dense-label font-semibold text-entity-symbol">
            {symbol.trim().toUpperCase()}
          </span>
          <PortfolioTag symbol={symbol} variant="inline" />
          {symbolOutOfUniverse ? (
            <span className="text-dense-meta text-muted-foreground">Not in holdings/watchlist</span>
          ) : null}
        </div>
      ) : null}

      <Card variant="elevated">
        <CardContent className="flex flex-wrap items-center gap-2 px-3 py-2">
          <span className="text-dense-meta font-medium text-muted-foreground shrink-0">Universe:</span>
          <SegmentControl
            ariaLabel="Portfolio universe filter"
            size="sm"
            value={universe}
            onChange={(v) => setUniverse(v as PortfolioUniverse)}
            options={[...PORTFOLIO_UNIVERSE_OPTIONS]}
          />
        </CardContent>
      </Card>

      <CompositeRegimeRibbon symbol={symbol} />

      {(verdictTone === 'success' || verdictTone === 'danger') && latest ? (
        <CopilotAutoInsightChip
          message={`${symbol} VRP percentile ${fmtPercentile(latest.vrp_pct_252d)} looks ${verdictLabel.toLowerCase()}.`}
          tone={verdictTone}
          onAsk={() => {
            copilotViewStore.unsuppress()
            askCopilotIntentStore.open({
              originPage: 'vrp-lab',
              originLabel: 'VRP Lab',
              symbol,
              suggestedPrompt: `Explain ${symbol} current VRP regime and similar historical outcomes.`,
              snapshot: compactSnapshot({
                vrp_pct: latest.vrp_pct_252d,
                vrp_60d: latest.vrp_60d,
              }),
            })
          }}
        />
      ) : null}

      <AnalyzeVerdictStrip
        tone={verdictTone}
        verdictLabel={verdictLabel}
        narrative={verdictTextValue}
        signals={[
          { label: 'VRP60', value: fmtSpread(latest?.vrp_60d) },
          { label: 'ATM IV', value: fmtPct(latest?.atm_iv_30d) },
          { label: 'RV60', value: fmtPct(latest?.rv_60d) },
          { label: 'Pctl', value: fmtPercentile(latest?.vrp_pct_252d) },
        ]}
        nextMoves={[
          {
            label: 'Option Discovery',
            href: `/research/discovery?symbol=${encodeURIComponent(symbol)}`,
          },
          {
            label: 'Watchlist',
            href: `/research/watchlist`,
          },
          {
            label: 'IV Radar',
            href: `/research/iv-radar`,
          },
        ]}
      />

      <SimilarRegimeCard
        lens="vrp"
        symbol={symbol}
        value={latest?.vrp_pct_252d}
      />

      {anyError ? (
        <QueryErrorAlert
          error={latestQ.error ?? historyQ.error}
          onRetry={() => {
            void latestQ.refetch()
            void historyQ.refetch()
          }}
        />
      ) : null}

      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <p className="text-dense-label font-medium text-foreground">
            ATM IV vs Realized Vol · trailing 252 days
          </p>
          {anyLoading ? (
            <Skeleton className="h-[220px] w-full rounded-md" />
          ) : history.length === 0 ? (
            <EmptyState
              icon={<Waves />}
              title="No VRP history yet"
              description={`No rows in features.stock_signal_vrp_daily for ${symbol}. Wait for the VRP CronJob to populate, or check Ops Console → Subcontractors → Research.`}
            />
          ) : (
            <VrpTimeSeriesChart rows={history} />
          )}
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <p className="text-dense-label font-medium text-foreground">
            IV vs RV dual histogram (industry strip)
          </p>
          {anyLoading ? (
            <Skeleton className="h-24 w-full rounded-md" />
          ) : (
            <IvRvDualHistogram rows={history} />
          )}
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <p className="text-dense-label font-medium text-foreground">
            VRP percentile distribution ({symbol})
          </p>
          {anyLoading ? (
            <Skeleton className="h-24 w-full rounded-md" />
          ) : (
            <DistributionBar rows={history} currentPct={latest?.vrp_pct_252d} />
          )}
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <p className="text-dense-label font-medium text-foreground">
            IV vs RV distribution ({symbol})
          </p>
          {anyLoading ? (
            <Skeleton className="h-24 w-full rounded-md" />
          ) : (
            <IvRvDualHistogram rows={history} />
          )}
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-dense-label font-medium text-foreground">VRP Extremes</p>
            <SegmentControl
              ariaLabel="VRP extremes bucket"
              size="sm"
              value={bucket}
              onChange={(v) => setBucket(v as Bucket)}
              options={[
                { value: 'high', label: 'High (sell-vol)' },
                { value: 'low', label: 'Low (buy-vol)' },
              ]}
            />
            {extremesQ.data?.as_of ? (
              <span className="text-dense-meta text-muted-foreground">
                As-of{' '}
                <span className="font-mono">{extremesQ.data.as_of}</span>
              </span>
            ) : null}
          </div>
          {extremesQ.isLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <ExtremesTable
              rows={extremes}
              bucket={bucket}
              onPick={(sym) => {
                setSymbol(sym)
                navigate(`/research/vrp-lab?symbol=${encodeURIComponent(sym)}`)
              }}
            />
          )}
        </CardContent>
      </Card>

      <p className="text-dense-caption text-muted-foreground">
        VRP = ATM IV(30d) − RV(60d). Percentile rank over trailing 252 sessions. Historical
        edge only — not investment advice. D10: no live order execution from this page.
      </p>
      </SymbolContextGuard>
    </PageShell>
  )
}
