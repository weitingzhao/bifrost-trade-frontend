import { Fragment, useCallback, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ScanSearch } from 'lucide-react'
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
  ExpandToggleCell,
  SegmentControl,
  denseTable,
  denseTableEntityCell,
  denseTableNumCell,
} from '@/components/data-display'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { SaveAsHypothesisButton } from '@/components/research/SaveAsHypothesisButton'
import { AddToPoolButton } from '@/components/research/AddToPoolButton'
import { SimilarRegimeCard } from '@/components/research/SimilarRegimeCard'
import { AnalyzeVerdictStrip } from '@/components/research/AnalyzeVerdictStrip'
import { CompositeRegimeRibbon } from '@/components/research/CompositeRegimeRibbon'
import type {
  ScanFlagFilterValue,
  ScanLensFlag,
  ScanLensFilters,
  ScanPreset,
  ScanRow,
  ScanSortBy,
} from '@/api/research/scan'
import { SCAN_PRESET_WEIGHTS } from '@/api/research/scan'
import {
  useScanData,
  type ScanUniverseFilter,
} from '@/hooks/useScanUniverse'
import { cn } from '@/lib/utils'
import type { SimilarRegimeLens } from '@/api/research/similarRegime'
import { fmtPctFromFraction } from '@/lib/format'

const SORT_OPTIONS: { value: ScanSortBy; label: string }[] = [
  { value: 'composite_score', label: 'Composite' },
  { value: 'iv_rank_1y', label: 'IV Rank' },
  { value: 'vrp_pct_252d', label: 'VRP' },
  { value: 'atm_slope_30d', label: 'Slope' },
  { value: 'pin_pct_distance', label: 'Pin' },
]

const LENS_FILTERS: { key: keyof ScanLensFilters; label: string }[] = [
  { key: 'iv_rank', label: 'IV' },
  { key: 'vrp', label: 'VRP' },
  { key: 'atm_slope', label: 'Slope' },
  { key: 'pin', label: 'Pin' },
  { key: 'terrain', label: 'Terrain' },
]

const FLAG_OPTIONS: { value: ScanFlagFilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'hot', label: 'Hot' },
  { value: 'cold', label: 'Cold' },
]

const PRESET_OPTIONS: { value: ScanPreset; label: string }[] = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'momentum', label: 'Momentum' },
  { value: 'mean_revert', label: 'Mean-revert' },
  { value: 'adaptive_30d', label: 'Adaptive-30d' },
]

const LAB_LINKS: { key: string; label: string; path: (sym: string) => string }[] = [
  { key: 'iv', label: 'IV Radar', path: () => '/research/iv-radar' },
  { key: 'vrp', label: 'VRP', path: (s) => `/research/vrp-lab?symbol=${s}` },
  { key: 'surface', label: 'Surface', path: (s) => `/research/vol-surface-lab?symbol=${s}` },
  { key: 'opex', label: 'OpEx', path: (s) => `/research/opex-cycle-lab?symbol=${s}` },
  { key: 'gex', label: 'GEX', path: (s) => `/research/gex-intraday?symbol=${s}` },
]

type RegimePicker = 'auto' | SimilarRegimeLens

const REGIME_PICKER_OPTIONS: { value: RegimePicker; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'iv_rank', label: 'IV' },
  { value: 'vrp', label: 'VRP' },
  { value: 'term_slope', label: 'Slope' },
  { value: 'pin_distance', label: 'Pin' },
  { value: 'regime', label: 'Regime' },
]

function fmtNum(n: number | null | undefined, d = 1): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toFixed(d)
}

function flagVariant(flag: string | undefined): 'danger' | 'success' | 'warning' | 'neutral' {
  if (flag === 'hot') return 'danger'
  if (flag === 'cold') return 'success'
  if (flag === 'neutral') return 'warning'
  return 'neutral'
}

function strongestLens(
  row: ScanRow,
): { lens: SimilarRegimeLens; value: number | string } | null {
  const candidates: { lens: SimilarRegimeLens; value: number | string; score: number }[] = []
  if (row.iv_rank_1y != null) {
    candidates.push({ lens: 'iv_rank', value: row.iv_rank_1y, score: Math.abs(row.iv_rank_1y - 50) })
  }
  if (row.vrp_pct_252d != null) {
    candidates.push({ lens: 'vrp', value: row.vrp_pct_252d, score: Math.abs(row.vrp_pct_252d - 50) })
  }
  if (row.atm_slope_30d != null) {
    candidates.push({
      lens: 'term_slope',
      value: row.atm_slope_30d,
      score: Math.abs(row.atm_slope_30d) * 100,
    })
  }
  if (row.pin_pct_distance != null) {
    candidates.push({
      lens: 'pin_distance',
      value: row.pin_pct_distance,
      score: Math.abs(row.pin_pct_distance) * 100,
    })
  }
  if (row.terrain_regime) {
    candidates.push({ lens: 'regime', value: row.terrain_regime, score: 40 })
  }
  if (!candidates.length) return null
  candidates.sort((a, b) => b.score - a.score)
  return { lens: candidates[0].lens, value: candidates[0].value }
}

function resolveRegime(
  row: ScanRow,
  picker: RegimePicker,
): { lens: SimilarRegimeLens; value: number | string } | null {
  if (picker === 'auto') return strongestLens(row)
  if (picker === 'iv_rank' && row.iv_rank_1y != null) return { lens: 'iv_rank', value: row.iv_rank_1y }
  if (picker === 'vrp' && row.vrp_pct_252d != null) return { lens: 'vrp', value: row.vrp_pct_252d }
  if (picker === 'term_slope' && row.atm_slope_30d != null) {
    return { lens: 'term_slope', value: row.atm_slope_30d }
  }
  if (picker === 'pin_distance' && row.pin_pct_distance != null) {
    return { lens: 'pin_distance', value: row.pin_pct_distance }
  }
  if (picker === 'regime' && row.terrain_regime) return { lens: 'regime', value: row.terrain_regime }
  return null
}

function FlagCell({ flag }: { flag?: string }) {
  if (!flag) return <span className="text-muted-foreground">—</span>
  return <DenseTag variant={flagVariant(flag)}>{flag}</DenseTag>
}

function parseFlagParam(raw: string | null): ScanFlagFilterValue {
  if (raw === 'hot' || raw === 'cold' || raw === 'neutral') return raw
  return 'all'
}

function parsePreset(raw: string | null): ScanPreset {
  if (raw === 'momentum' || raw === 'mean_revert' || raw === 'adaptive_30d') return raw
  return 'neutral'
}

function parseUniverse(raw: string | null): ScanUniverseFilter {
  if (raw === 'watchlist' || raw === 'holdings' || raw === 'both') return raw
  return 'both'
}

function parseSort(raw: string | null): ScanSortBy {
  const allowed = SORT_OPTIONS.map((o) => o.value)
  if (raw && (allowed as string[]).includes(raw)) return raw as ScanSortBy
  return 'composite_score'
}

function formatWeights(weights: Record<string, number> | null | undefined, preset: ScanPreset): string {
  const w =
    weights ??
    (preset === 'adaptive_30d' ? SCAN_PRESET_WEIGHTS.neutral : SCAN_PRESET_WEIGHTS[preset])
  return `iv:${w.iv_rank ?? '—'} vrp:${w.vrp ?? '—'} slope:${w.atm_slope ?? '—'} pin:${w.pin ?? '—'} terrain:${w.terrain ?? '—'}`
}

export default function ScanPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const universe = parseUniverse(searchParams.get('universe'))
  const sortBy = parseSort(searchParams.get('sort'))
  const preset = parsePreset(searchParams.get('preset'))
  const symbolSearch = searchParams.get('q') ?? ''
  const lensFilters: ScanLensFilters = {
    iv_rank: parseFlagParam(searchParams.get('iv_rank')),
    vrp: parseFlagParam(searchParams.get('vrp')),
    atm_slope: parseFlagParam(searchParams.get('atm_slope')),
    pin: parseFlagParam(searchParams.get('pin')),
    terrain: parseFlagParam(searchParams.get('terrain')),
  }

  const [expanded, setExpanded] = useState<string | null>(null)
  const [regimePicker, setRegimePicker] = useState<Record<string, RegimePicker>>({})

  const patchParams = useCallback(
    (patch: Record<string, string | null>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch)) {
            if (v == null || v === '' || v === 'all' || (k === 'preset' && v === 'neutral') || (k === 'universe' && v === 'both') || (k === 'sort' && v === 'composite_score')) {
              if (k === 'q' && (v == null || v === '')) next.delete(k)
              else if (k !== 'q') next.delete(k)
              else next.delete(k)
            } else {
              next.set(k, v)
            }
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const {
    rows,
    asOf,
    universeSize,
    flagCounts,
    isLoading,
    isError,
    error,
    symbols,
    holdingsSet,
    watchlistSet,
    weights,
  } = useScanData({
    filter: universe,
    sortBy,
    lensFilters,
    preset,
    symbolSearch,
  })

  const verdict = useMemo(() => {
    const { hot, cold, total } = flagCounts
    if (total === 0) {
      return {
        tone: 'neutral' as const,
        label: 'No scan rows',
        narrative: 'Wait for stock_signal_scan_daily Cron or expand universe.',
      }
    }
    if (hot >= Math.max(3, Math.floor(total * 0.25))) {
      return {
        tone: 'warning' as const,
        label: `${hot}/${total} hot`,
        narrative: `${hot} of ${total} symbols show hot lens flags (as of ${asOf ?? '—'}). Drill IV Radar / VRP on hot names; ${cold} cold.`,
      }
    }
    if (cold >= Math.max(3, Math.floor(total * 0.25))) {
      return {
        tone: 'success' as const,
        label: `${cold}/${total} cold`,
        narrative: `Premium looks cheap on ${cold} names — confirm with VRP before buying vol.`,
      }
    }
    return {
      tone: 'neutral' as const,
      label: 'Mixed tape',
      narrative: `${total} symbols · ${hot} hot · ${cold} cold (universe ${universeSize}). Preset ${preset}.`,
    }
  }, [flagCounts, asOf, universeSize, preset])

  return (
    <PageShell padding="compact">
      <PageHeader
        title="Scan"
        titleSize="default"
        description="Watchlist ∪ holdings cross-lens scanner (materialized daily)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AskCopilotButton
              originPage="analyze-scan"
              originLabel="Scan"
              snapshot={compactSnapshot({
                as_of: asOf,
                hot: flagCounts.hot,
                cold: flagCounts.cold,
                total: flagCounts.total,
                preset,
                weights,
                flagCounts,
                top: rows.slice(0, 8).map((r) => ({
                  symbol: r.symbol,
                  composite: r.composite_score,
                  flags: r.lens_flags,
                })),
              })}
              suggestedPrompt={`Summarize today's Analyze scan (${preset}): ${flagCounts.hot} hot / ${flagCounts.cold} cold of ${flagCounts.total}. Which symbols deserve follow-up?`}
            />
            <SaveAsHypothesisButton
              originPage="analyze-scan"
              defaultTitle={`Scan ${asOf ?? 'today'} — ${flagCounts.hot} hot`}
              defaultThesis={verdict.narrative}
              defaultSymbols={rows.slice(0, 12).map((r) => r.symbol)}
              defaultTags={['scan', 'analyze', preset]}
            />
          </div>
        }
      />

      <div className="space-y-3">
        <AnalyzeVerdictStrip
          tone={verdict.tone}
          verdictLabel={verdict.label}
          narrative={verdict.narrative}
          signals={[
            { label: 'Hot', value: String(flagCounts.hot) },
            { label: 'Cold', value: String(flagCounts.cold) },
            { label: 'As of', value: asOf ?? '—' },
            { label: 'Preset', value: preset },
          ]}
        />
        <CompositeRegimeRibbon symbol={rows[0]?.symbol ?? 'SPY'} />
        <p className="text-dense-micro text-muted-foreground px-1">
          Composite weights ({preset}): {formatWeights(weights, preset)}
        </p>

        <Card variant="elevated">
          <CardContent className="flex flex-col gap-2 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-dense-meta font-medium text-muted-foreground shrink-0">Universe:</span>
              <SegmentControl
                value={universe}
                onChange={(v) => patchParams({ universe: v })}
                options={[
                  { value: 'both', label: 'Both' },
                  { value: 'watchlist', label: 'Watchlist' },
                  { value: 'holdings', label: 'Holdings' },
                ]}
              />
              <span className="text-dense-meta font-medium text-muted-foreground shrink-0 ml-2">Preset:</span>
              <SegmentControl
                value={preset}
                onChange={(v) => patchParams({ preset: v })}
                options={PRESET_OPTIONS}
              />
              <span className="text-dense-meta font-medium text-muted-foreground shrink-0 ml-2">Sort:</span>
              <SegmentControl
                value={sortBy}
                onChange={(v) => patchParams({ sort: v })}
                options={SORT_OPTIONS}
              />
              <Input
                className="h-8 w-36 text-dense-meta"
                placeholder="Symbol search"
                value={symbolSearch}
                onChange={(e) => patchParams({ q: e.target.value || null })}
              />
              <span className="text-dense-meta text-muted-foreground ml-auto">
                {symbols.length} selected · {rows.length} rows
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {LENS_FILTERS.map((lens) => (
                <div key={lens.key} className="flex items-center gap-1.5">
                  <span className="text-dense-meta font-medium text-muted-foreground shrink-0">
                    {lens.label}:
                  </span>
                  <SegmentControl
                    value={lensFilters[lens.key] ?? 'all'}
                    onChange={(v) => patchParams({ [lens.key]: v })}
                    options={FLAG_OPTIONS}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {isError ? (
          <QueryErrorAlert error={error} />
        ) : isLoading ? (
          <Skeleton className="h-64 w-full rounded-md" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<ScanSearch />}
            title="No scan rows"
            description="Run research-scan Cron or widen universe / clear lens filters."
          />
        ) : (
          <DenseDataTable tableClassName="min-w-[1040px]">
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead className="w-8" />
                <DenseTableHead>Symbol</DenseTableHead>
                <DenseTableHead>Book</DenseTableHead>
                <DenseTableHead className="text-right">Comp</DenseTableHead>
                <DenseTableHead className="text-right">IV Rank</DenseTableHead>
                <DenseTableHead className="text-right">VRP</DenseTableHead>
                <DenseTableHead className="text-right">Slope</DenseTableHead>
                <DenseTableHead className="text-right">Pin%</DenseTableHead>
                <DenseTableHead>Regime</DenseTableHead>
                <DenseTableHead>Flags</DenseTableHead>
                <DenseTableHead>Labs</DenseTableHead>
                <DenseTableHead className="w-10">Pool</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {rows.map((row) => {
                const open = expanded === row.symbol
                const flags = row.lens_flags || {}
                const picker = regimePicker[row.symbol] ?? 'auto'
                const strong = resolveRegime(row, picker)
                const isHolding = holdingsSet.has(row.symbol.toUpperCase())
                const isWatch = watchlistSet.has(row.symbol.toUpperCase())
                return (
                  <Fragment key={row.symbol}>
                    <DenseTableRow>
                      <DenseTableCell>
                        <ExpandToggleCell
                          expanded={open}
                          onToggle={() => setExpanded(open ? null : row.symbol)}
                        />
                      </DenseTableCell>
                      <DenseTableCell className={denseTableEntityCell}>
                        <strong className="text-entity-symbol">{row.symbol}</strong>
                      </DenseTableCell>
                      <DenseTableCell>
                        <div className="flex flex-wrap gap-1">
                          {isHolding ? <DenseTag variant="category">holding</DenseTag> : null}
                          {isWatch ? <DenseTag variant="category">watchlist</DenseTag> : null}
                          {!isHolding && !isWatch ? (
                            <span className="text-muted-foreground">—</span>
                          ) : null}
                        </div>
                      </DenseTableCell>
                      <DenseTableCell className={denseTableNumCell}>
                        {fmtNum(row.composite_score, 0)}
                      </DenseTableCell>
                      <DenseTableCell className={denseTableNumCell}>
                        {fmtNum(row.iv_rank_1y, 0)}
                      </DenseTableCell>
                      <DenseTableCell className={denseTableNumCell}>
                        {fmtNum(row.vrp_pct_252d, 0)}
                      </DenseTableCell>
                      <DenseTableCell className={denseTableNumCell}>
                        {fmtNum(row.atm_slope_30d, 3)}
                      </DenseTableCell>
                      <DenseTableCell className={denseTableNumCell}>
                        {fmtPctFromFraction(row.pin_pct_distance)}
                      </DenseTableCell>
                      <DenseTableCell>
                        {row.terrain_regime ? (
                          <DenseTag variant="neutral">{row.terrain_regime}</DenseTag>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </DenseTableCell>
                      <DenseTableCell>
                        <div className="flex flex-wrap gap-1">
                          <FlagCell flag={flags.iv_rank as ScanLensFlag | undefined} />
                          <FlagCell flag={flags.vrp as ScanLensFlag | undefined} />
                        </div>
                      </DenseTableCell>
                      <DenseTableCell>
                        <div className="flex flex-wrap gap-1">
                          {LAB_LINKS.map((lab) => (
                            <Link
                              key={lab.key}
                              to={lab.path(row.symbol)}
                              className={cn(
                                denseTable.mutedMeta,
                                'underline-offset-2 hover:underline',
                              )}
                            >
                              → {lab.label}
                            </Link>
                          ))}
                        </div>
                      </DenseTableCell>
                      <DenseTableCell>
                        <AddToPoolButton
                          symbol={row.symbol}
                          source="scan"
                          score={row.composite_score}
                          lens_snapshot={{
                            iv_rank_1y: row.iv_rank_1y,
                            vrp_pct_252d: row.vrp_pct_252d,
                            atm_slope_30d: row.atm_slope_30d,
                            pin_pct_distance: row.pin_pct_distance,
                            terrain_regime: row.terrain_regime,
                            lens_flags: row.lens_flags,
                            composite_score: row.composite_score,
                          }}
                          tags={['scan', preset]}
                          source_ref={{ trade_date: row.trade_date, preset }}
                        />
                      </DenseTableCell>
                    </DenseTableRow>
                    {open ? (
                      <DenseTableRow>
                        <DenseTableCell colSpan={12} className={denseTable.detailCellClip}>
                          <div className="space-y-2 p-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-dense-meta text-muted-foreground">SimilarRegime lens:</span>
                              <SegmentControl
                                value={picker}
                                onChange={(v) =>
                                  setRegimePicker((prev) => ({
                                    ...prev,
                                    [row.symbol]: v as RegimePicker,
                                  }))
                                }
                                options={REGIME_PICKER_OPTIONS}
                              />
                            </div>
                            {strong ? (
                              <SimilarRegimeCard
                                lens={strong.lens}
                                symbol={row.symbol}
                                value={strong.value}
                              />
                            ) : (
                              <p className="text-dense-meta text-muted-foreground">
                                No lens value for similar-regime lookup.
                              </p>
                            )}
                          </div>
                        </DenseTableCell>
                      </DenseTableRow>
                    ) : null}
                  </Fragment>
                )
              })}
            </DenseTableBody>
          </DenseDataTable>
        )}
      </div>
    </PageShell>
  )
}
