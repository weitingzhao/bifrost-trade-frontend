import { useMemo, useState } from 'react'
// lucide-react icons used only in navConfig; PageHeader has no icon prop
import { useQuery } from '@tanstack/react-query'
import { PageHeader, PageShell } from '@/components/layout'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  EmptyState,
  SegmentControl,
  denseTableNumCell,
} from '@/components/data-display'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { fetchGexIntraday, type GexIntraday } from '@/api/researchEngine'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { SaveAsHypothesisButton } from '@/components/research/SaveAsHypothesisButton'
import { SimilarRegimeCard } from '@/components/research/SimilarRegimeCard'
import { ResearchContextBar } from '@/components/research/ResearchContextBar'
import { SymbolContextGuard } from '@/components/research/SymbolContextGuard'
import { CompositeRegimeRibbon } from '@/components/research/CompositeRegimeRibbon'
import { AnalyzeVerdictStrip } from '@/components/research/AnalyzeVerdictStrip'
import { withWatchlistContractKey } from '@/components/research/watchlistContractKey'
import { PortfolioTag } from '@/components/portfolio/PortfolioTag'
import { useResearchContext } from '@/hooks/useResearchContext'
import {
  PORTFOLIO_UNIVERSE_OPTIONS,
  usePortfolioSymbols,
  type PortfolioUniverse,
} from '@/hooks/usePortfolioSymbols'
import { GexStrikeChart } from '@/components/charts/GexStrikeChart'
import { GexTimelineChart } from '@/components/charts/GexTimelineChart'
import { BarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { cn } from '@/lib/utils'

const GEX_SYMBOL_HINTS = ['SPY', 'QQQ', 'NVDA', 'AAPL'] as const

function InfoCell({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <span>
      <span className="text-muted-foreground">{label}</span>{' '}
      <strong className={cn('font-mono', className)}>{value}</strong>
    </span>
  )
}

function fmtNum(v: number | null | undefined, digits = 1): string {
  if (v == null) return '—'
  return v.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function fmtTime(ts: string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return ts
  }
}

export default function GexIntradayPage() {
  const { symbol, dateInput, setSymbol, setDate } = useResearchContext()
  const date = dateInput
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [universe, setUniverse] = useState<PortfolioUniverse>('all')
  const { filterSymbols } = usePortfolioSymbols()
  const symbolOutOfUniverse =
    universe !== 'all' &&
    Boolean(symbol.trim()) &&
    filterSymbols(universe, [symbol]).length === 0

  const { data, isLoading, error } = useQuery({
    queryKey: ['gex-intraday', symbol, date],
    queryFn: () => fetchGexIntraday(symbol, date || undefined),
    enabled: symbol.length > 0,
  })

  const rows = data?.rows ?? []

  const activeIdx = selectedIdx ?? (rows.length > 0 ? rows.length - 1 : null)
  const active: GexIntraday | null = activeIdx != null ? rows[activeIdx] ?? null : null

  const bars = useMemo(
    () => active?.levels_json ?? [],
    [active],
  )

  return (
    <PageShell padding="compact">
      <PageHeader
        title="GEX Intraday"
        description="OI-GEX (solid) vs Volume-GEX (inner bar) by strike · pick a snapshot row or scroll timeline"
        actions={
          <div className="flex items-center gap-1.5">
            <AskCopilotButton
              originPage="gex-intraday"
              originLabel="GEX Intraday"
              symbol={symbol}
              date={date || undefined}
              snapshot={compactSnapshot({
                spot: active?.spot,
                zero_gamma: active?.zero_gamma,
                major_call_wall: active?.major_call_wall,
                major_put_wall: active?.major_put_wall,
                asof_ts: active?.asof_ts,
              })}
              suggestedPrompt={`Explain the current GEX walls and zero-gamma for ${symbol} and what they imply for the session.`}
            />
            <SaveAsHypothesisButton
              originPage="gex-intraday"
              defaultTitle={`${symbol} GEX walls hypothesis`}
              defaultThesis={
                active
                  ? `${symbol} spot ${fmtNum(active.spot, 2)} between put wall ${fmtNum(active.major_put_wall, 0)} and call wall ${fmtNum(active.major_call_wall, 0)}; zero-γ ${fmtNum(active.zero_gamma, 0)}. Prefer mean-reversion above zero-γ / breakout below.`
                  : undefined
              }
              defaultSymbols={[symbol]}
              defaultTags={['gex', 'walls', 'intraday']}
              originRef={withWatchlistContractKey(
                {
                  symbol,
                  date: date || null,
                  spot: active?.spot ?? null,
                  zero_gamma: active?.zero_gamma ?? null,
                  major_call_wall: active?.major_call_wall ?? null,
                  major_put_wall: active?.major_put_wall ?? null,
                  asof_ts: active?.asof_ts ?? null,
                },
                symbol,
              )}
            />
          </div>
        }
      />

      <ResearchContextBar />

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

      <AnalyzeVerdictStrip
        tone={
          active?.zero_gamma != null && active.spot != null && active.spot < active.zero_gamma
            ? 'warning'
            : 'neutral'
        }
        verdictLabel={
          active?.zero_gamma != null && active.spot != null && active.spot < active.zero_gamma
            ? 'Below zero-γ — trend risk'
            : 'Above zero-γ — mean-revert bias'
        }
        narrative={
          active
            ? `${symbol} spot ${fmtNum(active.spot, 2)} · put wall ${fmtNum(active.major_put_wall, 0)} · call wall ${fmtNum(active.major_call_wall, 0)} · zero-γ ${fmtNum(active.zero_gamma, 0)}. Trade the walls, not the mid.`
            : 'Load a GEX snapshot to decide whether to fade walls or follow a zero-γ break.'
        }
      />

      <SimilarRegimeCard
        lens="gex_notional"
        symbol={symbol}
        value={active?.total_net_gex ?? null}
      />

      {error && <QueryErrorAlert error={error} />}

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[360px] w-full" />
        </div>
      )}

      {active && (
        <>
          {/* Top info bar */}
          <Card variant="elevated" size="sm" className="p-2.5">
            <CardContent className="p-0">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-dense-label">
                <span>
                  <span className="text-muted-foreground">Ticker</span>{' '}
                  <strong className="font-mono">{active.symbol}</strong>
                  <PortfolioTag symbol={active.symbol} variant="row-suffix" />
                </span>
                <InfoCell label="Spot" value={fmtNum(active.spot, 2)} />
                <InfoCell label="As-of" value={fmtTime(active.asof_ts)} />
                <InfoCell
                  label="Call Wall"
                  value={fmtNum(active.major_call_wall, 0)}
                  className="text-profit"
                />
                <InfoCell
                  label="Zero Gamma"
                  value={fmtNum(active.zero_gamma, 0)}
                  className="text-warning"
                />
                <InfoCell
                  label="Put Wall"
                  value={fmtNum(active.major_put_wall, 0)}
                  className="text-loss"
                />
              </div>
            </CardContent>
          </Card>

          {/* Timeline (Case 2) — between info bar and strike chart */}
          <Card variant="elevated" className="mt-3">
            <CardContent className="p-3">
              <p className="mb-2 text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
                Timeline
              </p>
              <GexTimelineChart rows={rows} height={280} />
            </CardContent>
          </Card>

          {/* Main strike chart */}
          <Card variant="elevated" className="mt-3">
            <CardContent className="p-3">
              <p className="mb-2 text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
                Strike GEX (OI solid · Volume inner)
              </p>
              <GexStrikeChart
                bars={bars}
                spot={active.spot}
                zeroGamma={active.zero_gamma}
                callWall={active.major_call_wall}
                putWall={active.major_put_wall}
                height={420}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Snapshot timeline */}
      {rows.length > 0 && (
        <Card variant="elevated" className="mt-3">
          <CardContent className="p-0">
            <DenseDataTable>
              <DenseTableHeader>
                <DenseTableHeadRow>
                  <DenseTableHead className="w-12">#</DenseTableHead>
                  <DenseTableHead>Time</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>Spot</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>Net GEX</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>Call Wall</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>Zero Gamma</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>Put Wall</DenseTableHead>
                </DenseTableHeadRow>
              </DenseTableHeader>
              <DenseTableBody>
                {rows.map((row, i) => (
                  <DenseTableRow
                    key={row.asof_ts}
                    className={cn(
                      'cursor-pointer',
                      i === activeIdx && 'bg-accent',
                    )}
                    onClick={() => setSelectedIdx(i)}
                  >
                    <DenseTableCell className="text-dense-meta text-muted-foreground">
                      {i + 1}
                    </DenseTableCell>
                    <DenseTableCell>
                      <DenseTag variant="neutral">
                        {fmtTime(row.asof_ts)}
                      </DenseTag>
                    </DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>
                      {fmtNum(row.spot, 2)}
                    </DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>
                      {fmtNum(row.total_net_gex)}
                    </DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>
                      {fmtNum(row.major_call_wall, 0)}
                    </DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>
                      {fmtNum(row.zero_gamma, 0)}
                    </DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>
                      {fmtNum(row.major_put_wall, 0)}
                    </DenseTableCell>
                  </DenseTableRow>
                ))}
              </DenseTableBody>
            </DenseDataTable>
          </CardContent>
        </Card>
      )}

      {!isLoading && rows.length === 0 && !error && (
        <EmptyState
          icon={<BarChart2 />}
          title={`No GEX snapshots for ${symbol.trim().toUpperCase() || 'symbol'}`}
          description={
            symbol.trim().toUpperCase() === 'SPX'
              ? 'SPX index options often lack OI in Golden Source — engine skips write. Try SPY/QQQ for the same session, or pick a date when Cron succeeded.'
              : 'GEX intraday Cron (research-gex-intraday) writes features.option_metric_gex_intraday during US session hours. Try another symbol or an explicit trade date.'
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              {GEX_SYMBOL_HINTS.map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-dense-label"
                  onClick={() => {
                    setSymbol(s)
                    setDate('')
                    setSelectedIdx(null)
                  }}
                >
                  Try {s}
                </Button>
              ))}
            </div>
          }
        />
      )}
      </SymbolContextGuard>
    </PageShell>
  )
}
