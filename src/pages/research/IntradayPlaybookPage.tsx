import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader, PageShell } from '@/components/layout'
import {
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupTitle,
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  SegmentControl,
} from '@/components/data-display'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { ProbabilityBar } from '@/components/charts/ProbabilityBar'
import { ScenarioFanChart } from '@/components/charts/ScenarioFanChart'
import { SessionTimelineChart } from '@/components/charts/SessionTimelineChart'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { SaveAsHypothesisButton } from '@/components/research/SaveAsHypothesisButton'
import { ResearchContextBar } from '@/components/research/ResearchContextBar'
import { SymbolContextGuard } from '@/components/research/SymbolContextGuard'
import { CompositeRegimeRibbon } from '@/components/research/CompositeRegimeRibbon'
import { AnalyzeVerdictStrip } from '@/components/research/AnalyzeVerdictStrip'
import { EmptyHint } from '@/components/research/EmptyHint'
import { withWatchlistContractKey } from '@/components/research/watchlistContractKey'
import { PortfolioTag } from '@/components/portfolio/PortfolioTag'
import {
  fetchPlaybookHitRate,
  fetchPlaybookTriggers,
  fetchTerrainIntraday,
  type TerrainIntraday,
} from '@/api/researchEngine'
import { useIntradayVerdict } from '@/hooks/useIntradayVerdict'
import {
  PORTFOLIO_UNIVERSE_OPTIONS,
  usePortfolioSymbols,
  type PortfolioUniverse,
} from '@/hooks/usePortfolioSymbols'
import { useResearchContext } from '@/hooks/useResearchContext'
import {
  invalidateLine,
  liveScenario,
  SCENARIO_LABELS,
  type ScenarioKind,
} from '@/lib/intradayPlaybook'
import { cn } from '@/lib/utils'

interface ScenarioCardProps {
  kind: ScenarioKind
  probability: number
  latest: TerrainIntraday
  live?: boolean
  wide?: boolean
}

const SCENARIO_META: Record<
  ScenarioKind,
  { label: string; color: string; tagVariant: 'neutral' | 'success' | 'danger' | 'warning'; hint: string }
> = {
  rangy: {
    label: 'Rangy',
    color: 'border-violet-500/40',
    tagVariant: 'neutral',
    hint: 'Mean-reversion inside gamma zone',
  },
  bull: {
    label: 'Bull',
    color: 'border-emerald-500/40',
    tagVariant: 'success',
    hint: 'Upside release toward call wall',
  },
  bear: {
    label: 'Bear',
    color: 'border-red-500/40',
    tagVariant: 'danger',
    hint: 'Downside release toward put wall',
  },
  squeeze: {
    label: 'Squeeze',
    color: 'border-amber-500/40',
    tagVariant: 'warning',
    hint: 'Vol compression / pin risk',
  },
}

function scenarioLevels(
  kind: ScenarioKind,
  latest: TerrainIntraday,
): { a: string; aLabel: string; b: string; bLabel: string } {
  const spot = latest.spot
  const low = latest.gamma_zone_low
  const high = latest.gamma_zone_high
  const mid = (low + high) / 2
  switch (kind) {
    case 'rangy':
      return {
        aLabel: 'Zone Low',
        a: low.toFixed(2),
        bLabel: 'Zone High',
        b: high.toFixed(2),
      }
    case 'bull':
      return {
        aLabel: 'Target',
        a: high.toFixed(2),
        bLabel: 'Upside',
        b: `${(((high - spot) / Math.max(spot, 1)) * 100).toFixed(2)}%`,
      }
    case 'bear':
      return {
        aLabel: 'Target',
        a: low.toFixed(2),
        bLabel: 'Downside',
        b: `${(((low - spot) / Math.max(spot, 1)) * 100).toFixed(2)}%`,
      }
    case 'squeeze':
      return {
        aLabel: 'Pin / Pivot',
        a: mid.toFixed(2),
        bLabel: 'Vol Squeeze',
        b: latest.vol_squeeze.toFixed(0),
      }
  }
}

function ScenarioCard({ kind, probability, latest, live, wide }: ScenarioCardProps) {
  const meta = SCENARIO_META[kind]
  const levels = scenarioLevels(kind, latest)
  return (
    <Card
      variant="elevated"
      className={cn(
        'border',
        meta.color,
        wide && 'ring-1 ring-primary/25',
        wide && 'col-span-2',
      )}
    >
      <CardContent className="space-y-2 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <DenseTag variant={meta.tagVariant}>{meta.label}</DenseTag>
            {live ? <DenseTag variant="success">LIVE</DenseTag> : null}
          </div>
          <span className="font-mono text-sm font-semibold tabular-nums">
            {(probability * 100).toFixed(0)}%
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <SmallMetric label={levels.aLabel} value={levels.a} />
          <SmallMetric label={levels.bLabel} value={levels.b} />
        </div>
        <p className="text-dense-meta text-muted-foreground line-clamp-2">{meta.hint}</p>
        <p className="text-dense-caption text-muted-foreground leading-snug">
          {invalidateLine(kind, latest)}
        </p>
      </CardContent>
    </Card>
  )
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-dense-micro text-muted-foreground">{label}</p>
      <p className="font-mono text-dense-label tabular-nums">{value}</p>
    </div>
  )
}

function biasTagVariant(regime: string): 'success' | 'danger' | 'warning' | 'neutral' {
  const lo = regime.toLowerCase()
  if (lo.includes('bull')) return 'success'
  if (lo.includes('bear')) return 'danger'
  if (lo.includes('squeeze') || lo.includes('transition')) return 'warning'
  return 'neutral'
}

function buildPathTransitions(rows: TerrainIntraday[]): { time: string; from: string; to: string; price: string }[] {
  const transitions: { time: string; from: string; to: string; price: string }[] = []
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1]
    const cur = rows[i]
    if (prev.regime !== cur.regime) {
      transitions.push({
        time: cur.asof_ts,
        from: prev.regime,
        to: cur.regime,
        price: cur.spot.toFixed(2),
      })
    }
  }
  return transitions
}

export default function IntradayPlaybookPage() {
  const { symbol, apiDate } = useResearchContext()
  const [transitionsExplicit, setTransitionsExplicit] = useState<boolean | undefined>(undefined)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [universe, setUniverse] = useState<PortfolioUniverse>('all')
  const { filterSymbols } = usePortfolioSymbols()
  const symbolOutOfUniverse =
    universe !== 'all' &&
    Boolean(symbol.trim()) &&
    filterSymbols(universe, [symbol]).length === 0

  const intradayQ = useQuery({
    queryKey: ['terrain-intraday', symbol, apiDate],
    queryFn: () => fetchTerrainIntraday(symbol, apiDate),
    enabled: symbol.length > 0,
    refetchInterval: 60_000,
  })

  const triggersQ = useQuery({
    queryKey: ['playbook-triggers', symbol, apiDate],
    queryFn: () => fetchPlaybookTriggers(symbol, apiDate || undefined),
    enabled: symbol.length > 0,
    staleTime: 30_000,
  })

  const hitRateQ = useQuery({
    queryKey: ['playbook-hit-rate', symbol, 30],
    queryFn: () => fetchPlaybookHitRate(symbol, 30, 5),
    enabled: symbol.length > 0,
    staleTime: 60_000,
  })

  const rows = useMemo(() => intradayQ.data?.rows ?? [], [intradayQ.data])
  const triggerRows = useMemo(() => triggersQ.data?.rows ?? [], [triggersQ.data])
  const hitRate = hitRateQ.data?.hit_rate ?? null
  const hitEval = hitRateQ.data?.evaluated_count ?? 0
  const hitCount = hitRateQ.data?.hit_count ?? 0
  const effectiveIdx =
    selectedIdx ?? (rows.length > 0 ? rows.length - 1 : null)
  const selected =
    effectiveIdx != null && effectiveIdx >= 0 ? rows[effectiveIdx] ?? null : null
  const selectedKind = selected ? liveScenario(selected) : null
  const intradayVerdict = useIntradayVerdict(selected)

  const transitions = useMemo(() => buildPathTransitions(rows), [rows])

  const fanPoints = useMemo(
    () =>
      rows.map((r) => ({
        time: r.asof_ts.slice(11, 16),
        low: r.gamma_zone_low,
        high: r.gamma_zone_high,
        target: r.expected_close,
      })),
    [rows],
  )

  const spotPoints = useMemo(
    () => rows.map((r) => ({ time: r.asof_ts.slice(11, 16), price: r.spot })),
    [rows],
  )

  const liveIdx = effectiveIdx != null && effectiveIdx >= 0 ? effectiveIdx : undefined

  const isLoading = intradayQ.isLoading
  const isError = intradayQ.isError

  const transitionsExpanded = transitionsExplicit ?? transitions.length > 0

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Intraday Playbook"
        description="Scenario fan, LIVE bias, and path transitions — observe only (D10)"
        actions={
          <div className="flex items-center gap-1.5">
            <AskCopilotButton
              originPage="intraday-playbook"
              originLabel="Intraday Playbook"
              symbol={symbol}
              date={apiDate}
              snapshot={compactSnapshot({
                headline: intradayVerdict.headline,
                bias: intradayVerdict.biasTag,
                live_kind: selectedKind,
                spot: selected?.spot,
              })}
              suggestedPrompt={`Given the live intraday playbook for ${symbol}, what bias should I observe and what would invalidate it?`}
            />
            <SaveAsHypothesisButton
              originPage="intraday-playbook"
              defaultTitle={`${symbol} intraday ${intradayVerdict.biasTag} hypothesis`}
              defaultThesis={`${intradayVerdict.headline}. Invalidate: ${intradayVerdict.invalidate}`}
              defaultSymbols={[symbol]}
              defaultTags={['intraday', 'playbook', 'scenario']}
              originRef={withWatchlistContractKey(
                {
                  symbol,
                  date: apiDate || null,
                  bias: intradayVerdict.biasTag,
                  live_kind: selectedKind,
                  spot: selected?.spot ?? null,
                  invalidate: intradayVerdict.invalidate,
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
          intradayVerdict.liveKind === 'bull'
            ? 'success'
            : intradayVerdict.liveKind === 'bear'
              ? 'danger'
              : intradayVerdict.liveKind === 'squeeze'
                ? 'warning'
                : 'neutral'
        }
        verdictLabel={
          selected
            ? `Observe ${intradayVerdict.mechanism} — D10`
            : 'No LIVE scenario'
        }
        narrative={
          selected
            ? `${intradayVerdict.headline}. ${intradayVerdict.invalidate} Observe only — do not arm live orders (D10).`
            : 'Load intraday terrain to pick a LIVE scenario bias before the open.'
        }
        signals={
          selected
            ? [
                { label: 'Bias', value: intradayVerdict.biasTag },
                {
                  label: 'LIVE',
                  value:
                    intradayVerdict.liveProbability != null
                      ? `${(intradayVerdict.liveProbability * 100).toFixed(0)}%`
                      : '—',
                },
                {
                  label: '30d hit',
                  value:
                    hitRate != null ? `${(hitRate * 100).toFixed(0)}% (${hitCount}/${hitEval})` : '—',
                },
              ]
            : []
        }
      />

      <Card variant="elevated">
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 text-dense-meta">
          <span className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
            Trigger hit-rate (30d)
          </span>
          {hitRateQ.isLoading ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            <>
              <span>
                Rate{' '}
                <strong className="font-mono text-foreground">
                  {hitRate != null ? `${(hitRate * 100).toFixed(0)}%` : '—'}
                </strong>
              </span>
              <span>
                Hits{' '}
                <strong className="font-mono text-foreground">
                  {hitCount}/{hitEval}
                </strong>
              </span>
              <span>
                Triggers{' '}
                <strong className="font-mono text-foreground">
                  {hitRateQ.data?.trigger_count ?? 0}
                </strong>
              </span>
            </>
          )}
        </CardContent>
      </Card>

      {isError && (
        <QueryErrorAlert
          error={intradayQ.error}
          onRetry={() => { void intradayQ.refetch() }}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-xl" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      ) : selected ? (
        <>
          {/* Scenario trigger timeline */}
          <Card variant="elevated">
            <CardContent className="space-y-2 px-4 py-3">
              <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
                Scenario trigger timeline
              </p>
              {triggersQ.isLoading ? (
                <Skeleton className="h-16 w-full rounded-md" />
              ) : triggerRows.length === 0 ? (
                <p className="text-dense-meta text-muted-foreground">
                  No trigger events for this session yet. Events fire when LIVE scenario changes or probability crosses 0.40.
                </p>
              ) : (
                <ul className="space-y-2 border-l border-border pl-3">
                  {triggerRows.map((t, i) => (
                    <li key={`${t.trigger_at}-${t.scenario_key}-${i}`} className="relative">
                      <span className="absolute -left-[17px] top-1.5 size-2 rounded-full bg-primary" />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-dense-meta text-muted-foreground">
                          {t.trigger_at.slice(11, 19) || t.trigger_at}
                        </span>
                        <DenseTag variant={t.satisfied ? 'success' : 'warning'}>
                          {t.scenario_key}
                        </DenseTag>
                        <span className="text-dense-caption text-muted-foreground">
                          {t.satisfied ? 'satisfied' : 'armed'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Verdict */}
          <Card variant="elevated" className="ring-1 ring-primary/15">
            <CardContent className="space-y-2 px-4 py-3">
              <p className="text-dense-body font-semibold leading-snug">{intradayVerdict.headline}</p>
              <div className="flex flex-wrap items-center gap-3 gap-y-1">
                <DenseTag variant={biasTagVariant(intradayVerdict.biasTag)}>
                  {intradayVerdict.biasTag}
                </DenseTag>
                <span className="text-dense-meta text-muted-foreground">
                  Mechanism: {intradayVerdict.mechanism}
                </span>
              </div>
              <p className="text-dense-caption text-muted-foreground leading-snug">
                {intradayVerdict.invalidate}
              </p>
            </CardContent>
          </Card>

          {/* Session timeline */}
          <Card variant="elevated">
            <CardContent className="px-4 py-3">
              <p className="mb-2 text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
                Session Timeline
              </p>
              <SessionTimelineChart
                rows={rows}
                selectedIdx={effectiveIdx ?? undefined}
                onSelectIdx={(idx) => setSelectedIdx(idx)}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Info bar */}
          <Card variant="elevated">
            <CardContent className="flex flex-wrap items-center gap-4 px-4 py-3">
              <KeyValue label="Close" value={selected.expected_close.toFixed(2)} />
              <KeyValue label="PIN" value={selected.pin_score.toFixed(0)} />
              <KeyValue
                label="Pivot"
                value={((selected.gamma_zone_low + selected.gamma_zone_high) / 2).toFixed(2)}
              />
              <KeyValue label="Spot" value={selected.spot.toFixed(2)} />
              <div className="ml-auto">
                <p className="text-dense-micro text-muted-foreground">Mechanism</p>
                <DenseTag variant={biasTagVariant(selected.regime)}>{selected.regime}</DenseTag>
              </div>
            </CardContent>
          </Card>

          {/* Probability bar */}
          <Card variant="elevated">
            <CardContent className="px-4 py-3">
              <ProbabilityBar
                rangy={selected.prob_rangy}
                bull={selected.prob_bull}
                bear={selected.prob_bear}
                squeeze={selected.prob_squeeze}
                height={36}
              />
            </CardContent>
          </Card>

          {/* Scenario cards — selected snapshot */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(['rangy', 'bull', 'bear', 'squeeze'] as ScenarioKind[]).map((kind) => {
              const prob =
                kind === 'rangy'
                  ? selected.prob_rangy
                  : kind === 'bull'
                    ? selected.prob_bull
                    : kind === 'bear'
                      ? selected.prob_bear
                      : selected.prob_squeeze
              return (
                <ScenarioCard
                  key={kind}
                  kind={kind}
                  probability={prob}
                  latest={selected}
                  live={selectedKind === kind}
                  wide={selectedKind === kind}
                />
              )
            })}
          </div>

          {/* Fan chart */}
          {fanPoints.length > 0 && (
            <Card variant="elevated">
              <CardContent className="px-4 py-3">
                <p className="mb-2 text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
                  Scenario Fan
                  {selectedKind ? (
                    <span className="ml-2 font-normal normal-case text-muted-foreground">
                      · {SCENARIO_LABELS[selectedKind]}
                    </span>
                  ) : null}
                </p>
                <ScenarioFanChart
                  fanPoints={fanPoints}
                  spotPoints={spotPoints}
                  liveIdx={liveIdx}
                  className="w-full max-w-none"
                />
              </CardContent>
            </Card>
          )}

          {/* Path transitions — collapsed when empty */}
          <CollapsibleGroup variant="card">
            <CollapsibleGroupHeader
              expanded={transitionsExpanded}
              onToggle={() =>
                setTransitionsExplicit((prev) => !(prev ?? transitions.length > 0))
              }
            >
              <CollapsibleGroupTitle>
                Path Transitions
                {transitions.length === 0 ? ' · 0 transitions today' : ` · ${transitions.length}`}
              </CollapsibleGroupTitle>
            </CollapsibleGroupHeader>
            {transitionsExpanded ? (
              <CollapsibleGroupBody>
                <div className="px-3 pb-3">
                  {transitions.length === 0 ? (
                    <p className="py-4 text-center text-dense-meta text-muted-foreground">
                      No regime transitions recorded today
                    </p>
                  ) : (
                    <DenseDataTable tableClassName="min-w-[400px]">
                      <colgroup>
                        <col style={{ width: '30%' }} />
                        <col style={{ width: '35%' }} />
                        <col style={{ width: '15%' }} />
                      </colgroup>
                      <DenseTableHeader>
                        <DenseTableHeadRow>
                          <DenseTableHead>Time</DenseTableHead>
                          <DenseTableHead>Transition</DenseTableHead>
                          <DenseTableHead className="text-right">Price</DenseTableHead>
                        </DenseTableHeadRow>
                      </DenseTableHeader>
                      <DenseTableBody>
                        {transitions.map((t, i) => (
                          <DenseTableRow key={i}>
                            <DenseTableCell className="font-mono text-dense-meta">
                              {t.time}
                            </DenseTableCell>
                            <DenseTableCell className="text-dense-label">
                              {t.from} → {t.to}
                            </DenseTableCell>
                            <DenseTableCell className="text-right font-mono text-dense-label tabular-nums">
                              {t.price}
                            </DenseTableCell>
                          </DenseTableRow>
                        ))}
                      </DenseTableBody>
                    </DenseDataTable>
                  )}
                </div>
              </CollapsibleGroupBody>
            ) : null}
          </CollapsibleGroup>
        </>
      ) : (
        <Card variant="elevated">
          <CardContent className="px-4 py-6">
            <EmptyHint
              title="No intraday data"
              hint={`No terrain intraday rows for ${symbol}. Check that the terrain intraday CronJob has run.`}
              to="/research/intraday-playbook"
              triggerId="terrain-intraday"
              triggerLabel="Trigger terrain intraday"
              invalidateKeys={[['terrain-intraday', symbol, apiDate ?? '']]}
            />
          </CardContent>
        </Card>
      )}

      <p className="text-dense-caption text-muted-foreground">
        Intraday playbook — observe only (D10). Not investment advice.
      </p>
      </SymbolContextGuard>
    </PageShell>
  )
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-dense-micro text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-semibold tabular-nums">{value}</p>
    </div>
  )
}
