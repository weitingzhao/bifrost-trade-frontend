import { useCallback, useMemo, useState } from 'react'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { SegmentControl } from '@/components/data-display'
import { DiscoveryHint } from '@/components/optionDiscovery/DiscoveryHint'
import { DiscoveryIconButton } from '@/components/optionDiscovery/DiscoveryIconButton'
import { DiscoverySection } from '@/components/optionDiscovery/DiscoverySection'
import {
  CONE_MIN_DAILY_SAMPLES,
  DiscoveryIvTermSheetTable,
} from '@/components/optionDiscovery/DiscoveryIvTermSheetTable'
import { optionDiscoveryChartWrapClass } from '@/components/optionDiscovery/optionDiscoveryUi'
import {
  IvParametricConeChart,
  IvTermStructureChart,
  IvVolConeChart,
  type IvTermPoint,
  type IvVolConePoint,
} from './OptionDiscoveryAnalytics'
import { OdChartExpandOnHover } from './OdChartExpandOnHover'
import { cn } from '@/lib/utils'
import {
  type ExpirationKind,
  classifyExpiration,
  expirationDaysFromToday,
  expirationKindLabel,
} from '@/utils/optionDiscovery/expirationMeta'

type IvDataQuality = 'good' | 'limited' | 'unknown'

function ivDataQualityForExpiration(
  exp: string,
  termPoints: IvTermPoint[],
  conePoints: IvVolConePoint[],
): IvDataQuality {
  const cone = conePoints.find(c => c.expiration === exp)
  const term = termPoints.find(t => t.expiration === exp)
  if (cone != null && cone.sample_days >= CONE_MIN_DAILY_SAMPLES) return 'good'
  const hasTermIv = term?.atm_iv != null && Number.isFinite(term.atm_iv)
  const hasConeIv = cone?.atm_iv != null && Number.isFinite(cone.atm_iv)
  if (hasTermIv || hasConeIv) return 'limited'
  return 'unknown'
}

function IvDataQualityIcon({ tier }: { tier: IvDataQuality }) {
  const svgProps = {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  const className = cn(
    'inline-flex shrink-0',
    tier === 'good' && 'text-green-500',
    tier === 'limited' && 'text-amber-500',
    tier === 'unknown' && 'text-muted-foreground',
  )
  if (tier === 'good') {
    return (
      <span
        className={className}
        title="IV cone: enough daily samples for percentile bands"
        aria-label="IV data quality: good"
      >
        <svg {...svgProps}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </span>
    )
  }
  if (tier === 'limited') {
    return (
      <span
        className={className}
        title="ATM IV present but fewer than 5 daily samples for full cone bands"
        aria-label="IV data quality: limited"
      >
        <svg {...svgProps}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </span>
    )
  }
  return (
    <span
      className={className}
      title="Load IV term structure to assess historical cone quality"
      aria-label="IV data quality: unknown"
    >
      <svg {...svgProps}>
        <circle cx="12" cy="12" r="10" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    </span>
  )
}

export function OptionDiscoveryIvTermSection({
  symbol,
  filteredExpirations,
  expirationFilterKind,
  onExpirationFilterKindChange,
  selectedExpirations,
  onToggleExpiration,
  onResetExpirationsToDefault,
  onSelectAllExpirations,
  onUncheckAllExpirations,
  maxExpirations,
  defaultExpirationCount,
  massiveBackfillAvailable,
  onBackfillMassiveSnapshots,
  snapshotSyncLoading,
  snapshotSyncStatus,
  onLoad,
  termPoints,
  termLoading,
  termError,
  conePoints,
  coneError,
  expirationsLoading,
  expirationsError,
}: {
  symbol: string
  filteredExpirations: string[]
  expirationFilterKind: ExpirationKind
  onExpirationFilterKindChange: (kind: ExpirationKind) => void
  selectedExpirations: string[]
  onToggleExpiration: (expiration: string, checked: boolean) => void
  onResetExpirationsToDefault: () => void
  onSelectAllExpirations: () => void
  onUncheckAllExpirations: () => void
  maxExpirations: number
  defaultExpirationCount: number
  massiveBackfillAvailable: boolean
  onBackfillMassiveSnapshots: () => Promise<void>
  snapshotSyncLoading: boolean
  snapshotSyncStatus: string | null
  onLoad: () => Promise<void>
  termPoints: IvTermPoint[]
  termLoading: boolean
  termError: string | null
  conePoints: IvVolConePoint[]
  coneError: string | null
  expirationsLoading: boolean
  expirationsError: string | null
}) {
  const [busy, setBusy] = useState(false)
  const run = useCallback(async () => {
    setBusy(true)
    try {
      await onLoad()
    } finally {
      setBusy(false)
    }
  }, [onLoad])

  const runBackfill = useCallback(async () => {
    setBusy(true)
    try {
      await onBackfillMassiveSnapshots()
    } finally {
      setBusy(false)
    }
  }, [onBackfillMassiveSnapshots])

  const sym = symbol.trim()
  const canLoad = sym !== '' && filteredExpirations.length >= 2 && !expirationsLoading
  const selectedCount = selectedExpirations.length
  const blocked = termLoading || busy || snapshotSyncLoading
  const canRunLoad = selectedCount >= 2 && !blocked
  const hasChart = termPoints.length >= 2
  const tripleCharts = !coneError && conePoints.length >= 2

  const fmtIvPct = (v: number | null | undefined): string => {
    if (v == null || !Number.isFinite(v)) return '—'
    return `${(v * 100).toFixed(1)}%`
  }

  const termRows = [...termPoints]
    .filter(p => p.dte_days >= 0)
    .sort((a, b) => a.dte_days - b.dte_days)
  const coneRows = [...conePoints].filter(p => p.dte_days >= 0).sort((a, b) => a.dte_days - b.dte_days)

  const mergedIvRows = useMemo(() => {
    const exps = new Set<string>()
    termRows.forEach(r => exps.add(r.expiration))
    coneRows.forEach(r => exps.add(r.expiration))
    return Array.from(exps)
      .map(exp => {
        const term = termRows.find(t => t.expiration === exp)
        const cone = coneRows.find(c => c.expiration === exp)
        const dte = term?.dte_days ?? cone?.dte_days ?? 0
        return { expiration: exp, dte, term, cone }
      })
      .sort((a, b) => a.dte - b.dte)
  }, [termRows, coneRows])

  return (
    <DiscoverySection aria-label="IV term structure">
      {expirationsLoading && (
        <DiscoveryHint role="status">Loading expirations…</DiscoveryHint>
      )}
      {expirationsError && !expirationsLoading && (
        <DiscoveryHint className="text-destructive" role="alert">
          {expirationsError}
        </DiscoveryHint>
      )}
      {!canLoad && !expirationsLoading && (
        <DiscoveryHint role="status">
          {!sym
            ? 'Select an underlying to load expirations.'
            : filteredExpirations.length === 0
              ? 'No expirations match the current filter (All/Std/Wk/Qtr). Try another filter or symbol.'
              : 'Need at least two expirations in the filtered list for IV term charts. Adjust All/Std/Wk/Qtr or pick another symbol. Chain / quotes expiry is chosen in section 2.'}
        </DiscoveryHint>
      )}
      {canLoad && (
        <>
          <div className="mb-3 min-w-0">
            <div
              className="rounded-lg border border-border bg-gradient-to-b from-accent/5 to-card shadow-sm"
              role="group"
              aria-label="Expirations for IV term structure"
            >
              <div className="flex flex-col gap-2 border-b border-border/80 px-3 py-2.5">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wide text-muted-foreground">
                    Expirations in chart
                    <InfoTooltip
                      text={`You may check any expirations in the list (up to ${maxExpirations}), not only the first ${defaultExpirationCount}. "Select first ${defaultExpirationCount}" is a shortcut. IV term reads existing rows in PostgreSQL — if you pick expirations that were never snapshotted, use Backfill (Massive) or Load quotes in section 4 for those dates.`}
                    />
                  </span>
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold tabular-nums',
                      selectedCount < 2
                        ? 'border-amber-500/45 text-amber-600 dark:text-amber-400'
                        : 'border-border/70 bg-card text-foreground',
                    )}
                    aria-live="polite"
                  >
                    {selectedCount} / {maxExpirations}
                    {selectedCount < 2 ? ' · min 2' : ''}
                  </span>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <SegmentControl
                    value={expirationFilterKind}
                    onChange={v => {
                      if (v === 'all' || v === 'standard' || v === 'weeklies' || v === 'quarterlies') {
                        onExpirationFilterKindChange(v)
                      }
                    }}
                    ariaLabel="Expiration type filter"
                    options={[
                      { value: 'all', label: 'All' },
                      { value: 'standard', label: 'Std' },
                      { value: 'weeklies', label: 'Wk' },
                      { value: 'quarterlies', label: 'Qtr' },
                    ]}
                  />
                  <div className="ml-auto flex min-w-0 flex-wrap justify-end gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={onResetExpirationsToDefault}
                      disabled={blocked}
                      title={`Select the first ${defaultExpirationCount} expirations in expiration list order`}
                    >
                      First {defaultExpirationCount}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={onSelectAllExpirations}
                      disabled={blocked}
                      title={`Select up to ${maxExpirations} expirations (all listed, in expiration list order)`}
                    >
                      Check all
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={onUncheckAllExpirations}
                      disabled={blocked}
                      title="Clear selection down to the first two expirations in expiration list order (minimum required for IV term)"
                    >
                      Uncheck all
                    </Button>
                  </div>
                </div>
              </div>
              <ul className="grid list-none gap-1.5 p-2 sm:grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))]">
                {filteredExpirations.map(exp => {
                  const checked = selectedExpirations.includes(exp)
                  const atCap = !checked && selectedCount >= maxExpirations
                  const kind = classifyExpiration(exp)
                  const q = ivDataQualityForExpiration(exp, termPoints, conePoints)
                  return (
                    <li key={exp}>
                      <label
                        className={cn(
                          'flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors',
                          checked
                            ? 'border-primary/40 bg-accent/15'
                            : 'border-border/80 bg-card hover:border-primary/25 hover:bg-accent/5',
                          (blocked || atCap) && 'cursor-not-allowed opacity-50',
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={blocked || atCap}
                          onCheckedChange={v => onToggleExpiration(exp, v === true)}
                          aria-label={`Include ${exp} in IV term structure`}
                        />
                        <span
                          className="min-w-0 flex-1 text-xs tabular-nums"
                          title={`${exp} · ${expirationDaysFromToday(exp)}`}
                        >
                          <span className="font-semibold">{exp}</span>
                          <span className="text-muted-foreground" aria-hidden>
                            {' '}
                            · {expirationDaysFromToday(exp)}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-0.5">
                          {kind === 'weeklies' && (
                            <span
                              className="rounded px-1 text-[0.6rem] font-bold bg-expiry-weekly/20 text-expiry-weekly"
                              title={expirationKindLabel(kind)}
                            >
                              W
                            </span>
                          )}
                          {kind === 'quarterlies' && (
                            <span
                              className="rounded px-1 text-[0.6rem] font-bold bg-expiry-quarterly/20 text-expiry-quarterly"
                              title={expirationKindLabel(kind)}
                            >
                              Q
                            </span>
                          )}
                          <IvDataQualityIcon tier={q} />
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>
            {massiveBackfillAvailable && (
              <DiscoveryHint className="mt-2 text-xs">
                Backfill runs the same Massive chain snapshot jobs as “Load quotes” (section 4), once per checked
                expiration. Strike window from section 3 is applied when set; otherwise a broad chain (limit 250) is
                requested.
              </DiscoveryHint>
            )}
          </div>

          {termError && (
            <DiscoveryHint className="text-destructive" role="alert">
              {termError}
            </DiscoveryHint>
          )}
          {snapshotSyncLoading && snapshotSyncStatus && (
            <DiscoveryHint role="status">{snapshotSyncStatus}</DiscoveryHint>
          )}
          {!snapshotSyncLoading && (termLoading || busy) && (
            <DiscoveryHint>Loading term structure…</DiscoveryHint>
          )}
          {!snapshotSyncLoading && !(termLoading || busy) && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {massiveBackfillAvailable && (
                <DiscoveryIconButton
                  disabled={!canRunLoad}
                  onClick={() => void runBackfill()}
                  title="Backfill selected expirations then load IV term structure"
                  aria-label="Backfill selected expirations then load IV term structure"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 7h16" />
                    <path d="M4 12h16" />
                    <path d="M4 17h10" />
                    <path d="M17 14l3 3-3 3" />
                  </svg>
                </DiscoveryIconButton>
              )}
              <DiscoveryIconButton
                disabled={!canRunLoad}
                onClick={() => void run()}
                title={hasChart ? 'Reload IV term structure' : 'Load IV term structure'}
                aria-label={hasChart ? 'Reload IV term structure' : 'Load IV term structure'}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 21h5v-5" />
                </svg>
              </DiscoveryIconButton>
            </div>
          )}

          {hasChart && (
            <>
              <div
                className={cn(
                  'grid gap-3',
                  tripleCharts ? 'lg:grid-cols-3' : 'lg:grid-cols-2',
                )}
              >
                <div className={optionDiscoveryChartWrapClass}>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    IV Term Structure
                    <InfoTooltip text="ATM implied volatility for the expirations you check below (PostgreSQL option_snapshots; source matches your quote pipeline). Order follows the expiration list above." />
                  </h4>
                  <OdChartExpandOnHover title="IV Term Structure">
                    <IvTermStructureChart points={termPoints} />
                  </OdChartExpandOnHover>
                </div>
                <div className={optionDiscoveryChartWrapClass}>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    IV Volatility Cone
                    <InfoTooltip text="Per calendar expiration: p10–p90 band of daily ATM IV from PostgreSQL option_snapshots (up to 90 calendar days). DTE on the x-axis is today’s days to expiration; past samples had different DTE for the same expiry. Orange line: current ATM IV (same definition as IV term structure)." />
                  </h4>
                  {coneError && (
                    <DiscoveryHint className="text-destructive" role="alert">
                      {coneError}
                    </DiscoveryHint>
                  )}
                  {!coneError && conePoints.length >= 2 && (
                    <OdChartExpandOnHover title="IV Volatility Cone">
                      <IvVolConeChart points={conePoints} />
                    </OdChartExpandOnHover>
                  )}
                  {!coneError && conePoints.length > 0 && conePoints.length < 2 && (
                    <DiscoveryHint>Not enough cone points (need at least 2 expirations).</DiscoveryHint>
                  )}
                </div>

                {tripleCharts && (
                  <div className={optionDiscoveryChartWrapClass}>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Parametric IV (historical)
                      <InfoTooltip text="Per expiration: sample mean and sample standard deviation of daily ATM IV over the same lookback as the percentile cone; min/max and mean ±1 SD / ±2 SD (lower bands clamped at 0). Not the same as p10–p90. Call and Put: latest snapshot IV at the chosen ATM strike (same as term structure)." />
                    </h4>
                    <OdChartExpandOnHover title="Parametric IV (historical)">
                      <IvParametricConeChart points={conePoints} />
                    </OdChartExpandOnHover>
                  </div>
                )}
              </div>

              <details className="group mt-3 w-full min-w-0">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/25 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">IV term &amp; cone — combined values</span>
                  <span className="text-muted-foreground group-open:rotate-90" aria-hidden>
                    ›
                  </span>
                </summary>
                <div className="rounded-b-lg border border-t-0 border-border bg-card p-2">
                  <DiscoveryHint className="mb-2 text-xs leading-snug">
                    <strong>Term (latest):</strong> PostgreSQL{' '}
                    <code className="rounded bg-muted px-1 py-0.5 text-[0.85em]">option_snapshots_latest</code> (same
                    pipeline as quotes: Massive or IB). <strong>Cone (historical bands):</strong>{' '}
                    <code className="rounded bg-muted px-1 py-0.5 text-[0.85em]">option_snapshots</code>, one row per NY
                    calendar day per contract (last snapshot that day), up to 90 calendar days; percentiles from daily ATM
                    IV. <strong>ACT/REQ</strong> = actual daily ATM IV sample count vs minimum ({CONE_MIN_DAILY_SAMPLES})
                    for bands; hover cells when highlighted.
                  </DiscoveryHint>
                  <div className="overflow-x-auto">
                    <DiscoveryIvTermSheetTable
                      mergedIvRows={mergedIvRows}
                      coneError={coneError}
                      termRows={termRows}
                      fmtIvPct={fmtIvPct}
                    />
                  </div>
                </div>
              </details>

              <DiscoveryHint className="mt-2 text-xs" role="status">
                Plotted expirations (term structure):{' '}
                {termPoints
                  .filter(p => p.atm_iv != null && Number.isFinite(p.atm_iv) && p.dte_days >= 0)
                  .sort((a, b) => a.dte_days - b.dte_days)
                  .map(p => p.expiration)
                  .join(', ')}
              </DiscoveryHint>
            </>
          )}
        </>
      )}
    </DiscoverySection>
  )
}
