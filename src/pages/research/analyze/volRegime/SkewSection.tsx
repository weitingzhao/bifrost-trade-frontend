import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart } from 'lucide-react'
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
import { SymbolContextGuard } from '@/components/research/SymbolContextGuard'
import { LabToolbar } from '@/pages/research/analyze/hub/LabToolbar'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { SaveAsHypothesisButton } from '@/components/research/SaveAsHypothesisButton'
import { CompositeRegimeRibbon } from '@/components/research/CompositeRegimeRibbon'
import { AnalyzeVerdictStrip } from '@/components/research/AnalyzeVerdictStrip'
import { CopilotAutoInsightChip } from '@/components/research/CopilotAutoInsightChip'
import { useExhibit, useLensSpec } from '@/hooks/useLensRegistry'
import { bandForSeverity, chipTone, labelForBand, similarLine, toneForBand, trackRecordLine, verdictView } from '@/lib/lensVerdict'
import type { LensBand, LensBands } from '@/api/research/lenses'
import { askCopilotIntentStore } from '@/store/askCopilotIntentStore'
import { copilotViewStore } from '@/store/copilotViewStore'
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
import { fmtPctFromFraction } from '@/lib/format'

type HeatmapMode = 'iv' | 'residual_z'

function fmtSlope(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(3)}`
}

/** The reading in words; severity comes from the exhibit's band, not a threshold here. */
function skewSummary(anchor: VolSurfaceFitRow | null, band: LensBand | null, means: string | null): string {
  if (!anchor) return 'No SVI fit yet — wait before pricing wings or ratio spreads.'
  const slope = anchor.atm_slope
  if (slope == null || !band) {
    return `${anchor.symbol}: SVI converged (RMSE ${fmtSlope(anchor.fit_rmse)}) but ATM slope missing — do not size skew trades.`
  }
  const dir = slope < 0 ? 'call skew' : 'put skew'
  const dte = anchor.dte != null ? `${anchor.dte}d` : '30d'
  return `${anchor.symbol} (${dte}): ATM slope ${fmtSlope(slope)} (${dir}), ATM vol ${fmtPctFromFraction(anchor.atm_vol)} — ${means ?? 'no registry reading'}`
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

function SkewExtremesTable({
  rows,
  onPick,
  asOf,
  bands,
}: {
  rows: VolSurfaceFitRow[]
  onPick: (symbol: string) => void
  asOf: string | null
  /** The skew lens' severity bands from the registry; rows are graded against them. */
  bands: LensBands | undefined
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
            const tone = toneForBand('skew', bandForSeverity(bands, Math.abs(row.atm_slope ?? 0)))
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
                      {labelForBand('skew', bandForSeverity(bands, Math.abs(row.atm_slope ?? 0)), 'No fit — wait')}
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
                  {fmtPctFromFraction(row.atm_vol)}
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

export function SkewSection() {
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

  const exhibitQ = useExhibit('skew', symbol)
  const skewBands = useLensSpec('skew')?.bands
  const verdict = verdictView('skew', exhibitQ.data, { missing: 'No fit — wait' })
  const verdictTone = verdict.tone
  const verdictLabel = verdict.label
  const verdictLine = skewSummary(anchor, verdict.band, verdict.means)

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
    <div className="space-y-3">
      <LabToolbar>
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
      </LabToolbar>

      <SymbolContextGuard symbol={symbol}>

      <CompositeRegimeRibbon symbol={symbol} />

      {verdict.band === 'hot' && anchor ? (
        <CopilotAutoInsightChip
          message={`${symbol} skew is extreme (ATM slope ${fmtSlope(anchor.atm_slope)}).`}
          tone={chipTone(verdictTone)}
          onAsk={() => {
            copilotViewStore.unsuppress()
            askCopilotIntentStore.open({
              originPage: 'vol-surface-lab',
              originLabel: 'Vol Surface Lab',
              symbol,
              suggestedPrompt: `Explain ${symbol} skew extreme and what it did to forward returns in similar readings.`,
              snapshot: compactSnapshot({ atm_slope: anchor.atm_slope, atm_vol: anchor.atm_vol }),
            })
          }}
        />
      ) : null}

      <AnalyzeVerdictStrip
        tone={verdictTone}
        verdictLabel={verdictLabel}
        narrative={verdictLine}
        trackRecord={trackRecordLine(exhibitQ.data?.track_record, verdict.band)}
        similar={similarLine(exhibitQ.data?.similar)}
        signals={
          anchor
            ? [
                { label: 'ATM', value: fmtPctFromFraction(anchor.atm_vol) },
                { label: 'Slope', value: fmtSlope(anchor.atm_slope) },
                { label: 'RMSE', value: fmtSlope(anchor.fit_rmse) },
              ]
            : []
        }
        nextMoves={[
          {
            label: 'IV Radar',
            href: `/research/vol-regime?view=iv-rank&symbol=${encodeURIComponent(symbol)}`,
          },
          {
            label: 'VRP Lab',
            href: `/research/vol-regime?view=vrp&symbol=${encodeURIComponent(symbol)}`,
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
              bands={skewBands}
              rows={skewQ.data?.rows ?? []}
              asOf={skewQ.data?.as_of ?? null}
              onPick={(sym) => {
                setSymbol(sym)
                navigate(`/research/vol-regime?view=skew&symbol=${encodeURIComponent(sym)}`)
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
    </div>
  )
}
