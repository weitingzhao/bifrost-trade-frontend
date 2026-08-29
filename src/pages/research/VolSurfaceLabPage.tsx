import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart } from 'lucide-react'
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
import { CompositeRegimeRibbon } from '@/components/research/CompositeRegimeRibbon'
import { AnalyzeVerdictStrip } from '@/components/research/AnalyzeVerdictStrip'
import { TermStructureChart } from '@/components/charts/TermStructureChart'
import { VolSurfaceHeatmap } from '@/components/charts/VolSurface3DChart'
import { VolSurface2DChart } from '@/components/charts/VolSurface2DChart'
import { VolSurfaceResidualScatter } from '@/components/charts/VolSurfaceResidualScatter'
import { SimilarRegimeCard } from '@/components/research/SimilarRegimeCard'
import {
  useResiduals,
  useSkewExtremes,
  useTermStructure,
  useVolSurfaceFit,
} from '@/hooks/useVolSurfaceData'
import { useResearchContext } from '@/hooks/useResearchContext'
import { cn } from '@/lib/utils'
import type { VolSurfaceFitRow } from '@/api/research/volSurface'

type HeatmapMode = 'iv' | 'residual_z'

function fmtSlope(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(3)}`
}

function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${(v * 100).toFixed(1)}%`
}

function slopeSeverityTone(
  absSlope: number | null | undefined,
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (absSlope == null || !Number.isFinite(absSlope)) return 'neutral'
  if (absSlope >= 0.25) return 'danger'
  if (absSlope >= 0.12) return 'warning'
  return 'success'
}

function slopeSeverityLabel(absSlope: number | null | undefined): string {
  if (absSlope == null || !Number.isFinite(absSlope)) return 'No fit — wait'
  if (absSlope >= 0.25) return 'Skew extreme — size carefully'
  if (absSlope >= 0.12) return 'Skew elevated — prefer defined risk'
  return 'Skew calm — structure freer'
}

function pickAnchor(rows: VolSurfaceFitRow[]): VolSurfaceFitRow | null {
  if (rows.length === 0) return null
  const withDte = rows.filter((r) => r.dte != null)
  if (withDte.length === 0) return rows[0]
  return withDte.reduce((best, r) => {
    const d = Math.abs((r.dte ?? 999) - 30)
    const bd = Math.abs((best.dte ?? 999) - 30)
    return d < bd ? r : best
  })
}

function verdictText(anchor: VolSurfaceFitRow | null): string {
  if (!anchor) return 'No SVI fit yet — wait before pricing wings or ratio spreads.'
  const slope = anchor.atm_slope
  if (slope == null) {
    return `${anchor.symbol}: SVI converged (RMSE ${fmtSlope(anchor.fit_rmse)}) but ATM slope missing — do not size skew trades.`
  }
  const dir = slope < 0 ? 'call skew' : 'put skew'
  const abs = Math.abs(slope)
  const sev = slopeSeverityLabel(abs)
  const dte = anchor.dte != null ? `${anchor.dte}d` : '30d'
  if (abs >= 0.25) {
    return `${sev} on ${anchor.symbol} (${dte}): ATM slope ${fmtSlope(slope)} (${dir}). Prefer defined-risk; avoid naked wings.`
  }
  if (abs >= 0.12) {
    return `${sev} on ${anchor.symbol} (${dte}): ATM slope ${fmtSlope(slope)} (${dir}), ATM vol ${fmtPct(anchor.atm_vol)}. Prefer defined-risk skew expressions.`
  }
  return `${sev} on ${anchor.symbol} (${dte}): ATM slope ${fmtSlope(slope)} (${dir}), ATM vol ${fmtPct(anchor.atm_vol)}. Structure freer if VRP agrees.`
}

function SkewExtremesTable({
  rows,
  onPick,
  asOf,
}: {
  rows: VolSurfaceFitRow[]
  onPick: (symbol: string) => void
  asOf: string | null
}) {
  if (rows.length === 0) {
    return (
      <div className="py-4 text-center text-dense-meta text-muted-foreground">
        No skew extremes yet.
      </div>
    )
  }
  return (
    <>
      {asOf ? (
        <span className="text-dense-meta text-muted-foreground">
          As-of <span className="font-mono">{asOf}</span>
        </span>
      ) : null}
      <DenseDataTable tableClassName="min-w-[640px]">
        <colgroup>
          <col style={{ width: '18%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '14%' }} />
        </colgroup>
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead>Symbol</DenseTableHead>
            <DenseTableHead className="text-right">DTE</DenseTableHead>
            <DenseTableHead className="text-right">ATM Slope</DenseTableHead>
            <DenseTableHead className="text-right">ATM Vol</DenseTableHead>
            <DenseTableHead className="text-right">RMSE</DenseTableHead>
            <DenseTableHead className="text-right">N</DenseTableHead>
            <DenseTableHead>As-of</DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {rows.map((row) => {
            const tone = slopeSeverityTone(Math.abs(row.atm_slope ?? 0))
            return (
              <DenseTableRow key={`${row.symbol}-${row.expiry}`}>
                <DenseTableCell className={denseTableEntityCell}>
                  <div className="flex items-center gap-1.5">
                    <DenseLinkButton
                      variant="stock"
                      label={row.symbol}
                      ariaLabel={`Load ${row.symbol} in Vol Surface Lab`}
                      onClick={() => onPick(row.symbol)}
                    />
                    <DenseTag
                      variant={
                        tone === 'danger'
                          ? 'danger'
                          : tone === 'warning'
                            ? 'warning'
                            : 'success'
                      }
                    >
                      {slopeSeverityLabel(Math.abs(row.atm_slope ?? 0))}
                    </DenseTag>
                  </div>
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  {row.dte ?? '—'}
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  {fmtSlope(row.atm_slope)}
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  {fmtPct(row.atm_vol)}
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  {row.fit_rmse != null ? row.fit_rmse.toFixed(4) : '—'}
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  {row.n_points ?? '—'}
                </DenseTableCell>
                <DenseTableCell className={denseTable.mutedMeta}>
                  {row.trade_date ?? '—'}
                </DenseTableCell>
              </DenseTableRow>
            )
          })}
        </DenseTableBody>
      </DenseDataTable>
    </>
  )
}

export default function VolSurfaceLabPage() {
  const navigate = useNavigate()
  const { symbol, apiDate, setSymbol } = useResearchContext()
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('residual_z')

  const fitQ = useVolSurfaceFit(symbol, apiDate)
  const termQ = useTermStructure(symbol, apiDate)
  const skewQ = useSkewExtremes(20)

  const fits = useMemo(() => fitQ.data ?? [], [fitQ.data])
  const anchor = useMemo(() => pickAnchor(fits), [fits])

  const [userExpiry, setUserExpiry] = useState<string | null>(null)
  const effectiveExpiry = useMemo(() => {
    if (fits.length === 0) return null
    if (userExpiry && fits.some((r) => r.expiry === userExpiry)) return userExpiry
    return anchor?.expiry ?? fits[0].expiry ?? null
  }, [fits, anchor, userExpiry])

  const residualQ = useResiduals(symbol, effectiveExpiry ?? '', apiDate)

  const verdictTone = slopeSeverityTone(anchor?.atm_slope != null ? Math.abs(anchor.atm_slope) : null)
  const verdictLabel = slopeSeverityLabel(anchor?.atm_slope != null ? Math.abs(anchor.atm_slope) : null)
  const verdictLine = verdictText(anchor)

  const verdictBorderClass =
    verdictTone === 'danger'
      ? 'border-destructive/40'
      : verdictTone === 'warning'
        ? 'border-warning/40'
        : verdictTone === 'success'
          ? 'border-success/40'
          : 'border-border'

  const anyError = fitQ.isError || termQ.isError
  const anyLoading = fitQ.isLoading || termQ.isLoading

  const expiryOptions = useMemo(
    () =>
      fits
        .filter((r) => r.expiry)
        .map((r) => ({ value: r.expiry as string, label: `${r.expiry?.slice(5) ?? ''} (${r.dte ?? '?'}d)` })),
    [fits],
  )

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Vol Surface Lab (SVI)"
        description="Gatheral raw SVI fit per expiry. Surface term structure, per-strike residuals, and cross-symbol skew extremes. Observe-only (D10)."
        actions={
          <div className="flex items-center gap-1.5">
            <AskCopilotButton
              originPage="vol-surface-lab"
              originLabel="Vol Surface Lab"
              symbol={symbol}
              date={anchor?.trade_date ?? apiDate}
              snapshot={compactSnapshot({
                expiry: anchor?.expiry,
                atm_vol: anchor?.atm_vol,
                atm_slope: anchor?.atm_slope,
                fit_rmse: anchor?.fit_rmse,
              })}
              suggestedPrompt={`Interpret unusual points on the ${symbol} volatility surface.`}
            />
            <SaveAsHypothesisButton
              originPage="vol-surface-lab"
              defaultTitle={`${symbol} SVI hypothesis`}
              defaultSymbols={[symbol]}
              defaultTags={['vol-surface', 'svi']}
              originRef={{
                symbol,
                trade_date: anchor?.trade_date ?? null,
                expiry: anchor?.expiry ?? null,
                atm_vol: anchor?.atm_vol ?? null,
                atm_slope: anchor?.atm_slope ?? null,
                fit_rmse: anchor?.fit_rmse ?? null,
              }}
            />
          </div>
        }
      />

      <ResearchContextBar />

      <SymbolContextGuard symbol={symbol}>

      <CompositeRegimeRibbon symbol={symbol} />

      <AnalyzeVerdictStrip
        tone={verdictTone}
        verdictLabel={verdictLabel}
        narrative={verdictLine}
        signals={
          anchor
            ? [
                { label: 'ATM', value: fmtPct(anchor.atm_vol) },
                { label: 'Slope', value: fmtSlope(anchor.atm_slope) },
                { label: 'RMSE', value: fmtSlope(anchor.fit_rmse) },
              ]
            : []
        }
        nextMoves={[
          {
            label: 'IV Radar',
            href: `/research/iv-radar?symbol=${encodeURIComponent(symbol)}`,
          },
          {
            label: 'VRP Lab',
            href: `/research/vrp-lab?symbol=${encodeURIComponent(symbol)}`,
          },
        ]}
      />

      {anchor ? (
        <Card variant="elevated" className={cn('border', verdictBorderClass)}>
          <CardContent className="px-3 py-2">
            <p className="text-dense-caption text-muted-foreground">
              Anchor expiry{' '}
              <span className="font-mono">{anchor.expiry ?? '—'}</span> ·
              a={anchor.svi_a?.toFixed(4) ?? '—'} · b={anchor.svi_b?.toFixed(3) ?? '—'} ·
              rho={anchor.svi_rho?.toFixed(3) ?? '—'} · m={anchor.svi_m?.toFixed(3) ?? '—'} ·
              sigma={anchor.svi_sigma?.toFixed(3) ?? '—'}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {anyError ? (
        <QueryErrorAlert
          error={fitQ.error ?? termQ.error}
          onRetry={() => {
            void fitQ.refetch()
            void termQ.refetch()
          }}
        />
      ) : null}

      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <p className="text-dense-label font-medium text-foreground">
            Term structure · ATM vol vs DTE
          </p>
          {termQ.isLoading ? (
            <Skeleton className="h-[200px] w-full rounded-md" />
          ) : (termQ.data ?? []).length === 0 ? (
            <EmptyState
              icon={<LineChart />}
              title="No term structure yet"
              description={`No SVI fits in features.option_surface_fit_daily for ${symbol}. Wait for the Vol Surface CronJob to populate.`}
            />
          ) : (
            <TermStructureChart rows={termQ.data ?? []} />
          )}
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-dense-label font-medium text-foreground">
              SVI smile · log-moneyness vs IV
            </p>
            {expiryOptions.length > 0 ? (
              <>
                <span className="text-xs font-medium text-muted-foreground">Expiry:</span>
                <SegmentControl
                  ariaLabel="Vol Surface smile expiry"
                  size="sm"
                  value={effectiveExpiry ?? expiryOptions[0]?.value ?? ''}
                  onChange={(v) => setUserExpiry(v)}
                  options={expiryOptions.slice(0, 6)}
                />
              </>
            ) : null}
          </div>
          {residualQ.isLoading ? (
            <Skeleton className="h-[220px] w-full rounded-md" />
          ) : (
            <VolSurface2DChart rows={residualQ.data ?? []} />
          )}
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <p className="text-dense-label font-medium text-foreground">
            Residual scatter · fit error by moneyness
          </p>
          {residualQ.isLoading ? (
            <Skeleton className="h-[180px] w-full rounded-md" />
          ) : (
            <VolSurfaceResidualScatter rows={residualQ.data ?? []} mode="residual_z" />
          )}
        </CardContent>
      </Card>

      {anchor?.atm_slope != null ? (
        <SimilarRegimeCard lens="term_slope" symbol={symbol} value={anchor.atm_slope} />
      ) : null}

      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-dense-label font-medium text-foreground">
              Residual heatmap · strike × expiry
            </p>
            <SegmentControl
              ariaLabel="Vol Surface heatmap mode"
              size="sm"
              value={heatmapMode}
              onChange={(v) => setHeatmapMode(v as HeatmapMode)}
              options={[
                { value: 'residual_z', label: 'Residual z' },
                { value: 'iv', label: 'IV market' },
              ]}
            />
            {expiryOptions.length > 0 ? (
              <>
                <span className="text-xs font-medium text-muted-foreground">Expiry:</span>
                <SegmentControl
                  ariaLabel="Vol Surface residual expiry"
                  size="sm"
                  value={effectiveExpiry ?? expiryOptions[0]?.value ?? ''}
                  onChange={(v) => setUserExpiry(v)}
                  options={expiryOptions.slice(0, 6)}
                />
              </>
            ) : null}
          </div>
          {anyLoading ? (
            <Skeleton className="h-[180px] w-full rounded-md" />
          ) : residualQ.isLoading ? (
            <Skeleton className="h-[180px] w-full rounded-md" />
          ) : (
            <VolSurfaceHeatmap rows={residualQ.data ?? []} mode={heatmapMode} />
          )}
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardContent className="space-y-2 px-3 py-2">
          <p className="text-dense-label font-medium text-foreground">Skew extremes (cross-symbol)</p>
          {skewQ.isLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <SkewExtremesTable
              rows={skewQ.data?.rows ?? []}
              asOf={skewQ.data?.as_of ?? null}
              onPick={(sym) => {
                setSymbol(sym)
                navigate(`/research/vol-surface-lab?symbol=${encodeURIComponent(sym)}`)
              }}
            />
          )}
        </CardContent>
      </Card>

      <p className="text-dense-caption text-muted-foreground">
        SVI raw (Gatheral): w(k) = a + b·(ρ(k−m) + √((k−m)² + σ²)). Fit reads
        option chain IV per contract, only fits smiles with DTE 7–90 and ≥10 points.
        D10: no live order execution from this page.
      </p>
      </SymbolContextGuard>
    </PageShell>
  )
}
