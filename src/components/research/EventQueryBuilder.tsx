/**
 * Event Query Builder (Wave RS-C4).
 *
 * Form to compose `POST /research/backtest/event-query`:
 * - Event kind + params
 * - Strategy template
 * - FillConfig (collapsible)
 * - Lookback years
 * - Attach to Hypothesis (Wave A `research.hypothesis`)
 * - Walk-forward / benchmark toggles (RS-C3)
 *
 * Emits `onRun(response)` on successful mutation so the parent can render
 * a `BacktestRunResultCard`.
 */
import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { SegmentControl } from '@/components/data-display'
import { useActiveHypotheses } from '@/hooks/useHypotheses'
import { useRunEventQuery } from '@/hooks/useBacktestEventQuery'
import type {
  EventKind,
  EventQueryInput,
  EventQueryResponse,
  FillConfig,
} from '@/api/research/backtestEvent'

const EVENT_KIND_OPTIONS: { value: Exclude<EventKind, 'sql'>; label: string; hint: string }[] = [
  { value: 'earnings', label: 'Earnings', hint: 'Corp actions · event_radar · stub fallback' },
  { value: 'opex', label: 'OpEx (3rd Fri)', hint: 'Third Friday over lookback window' },
  { value: 'sepa_hit', label: 'SEPA hit', hint: 'features.stock_signal_sepa_daily ≥ threshold' },
  {
    value: 'iv_percentile_threshold',
    label: 'IV percentile',
    hint: 'features.option_metric_iv_percentile crossing',
  },
]

// Must stay in sync with TEMPLATES in
// bifrost-research/src/bifrost_research/engines/backtest/strategy_templates.py —
// a template the backend knows but this list omits is unreachable from the UI.
//
// Stock-leg templates lead: every option template prices against
// raw_market.option_daily, which currently holds a few weeks of history, so a
// multi-year event study on one of those returns nothing at all.
const TEMPLATE_OPTIONS: { value: string; label: string; note?: string }[] = [
  { value: 'long_stock_event', label: 'Long stock across event', note: 'stock only' },
  { value: 'short_stock_event', label: 'Short stock across event', note: 'stock only' },
  { value: 'long_atm_straddle', label: 'Long ATM straddle' },
  { value: 'short_atm_straddle', label: 'Short ATM straddle' },
  { value: 'long_atm_call', label: 'Long ATM call' },
  { value: 'long_atm_put', label: 'Long ATM put' },
  { value: 'short_30d_iron_condor', label: 'Short 30d iron condor' },
  { value: 'covered_call_1sd', label: 'Covered call (1σ, needs stock leg)' },
]

const DEFAULT_FILL: FillConfig = {
  slippage_pct_of_spread: 0.2,
  commission_per_contract: 0.65,
  multiplier: 100,
  exercise_style: 'american_no_early',
}

interface EventQueryBuilderProps {
  onRun?: (result: EventQueryResponse) => void
  onHypothesisChange?: (hid: string | null) => void
  initialHypothesisId?: string | null
  defaultSymbols?: string[]
}

export function EventQueryBuilder({
  onRun,
  onHypothesisChange,
  initialHypothesisId,
  defaultSymbols,
}: EventQueryBuilderProps) {
  const [kind, setKind] = useState<Exclude<EventKind, 'sql'>>('earnings')
  const [symbolsStr, setSymbolsStr] = useState(
    (defaultSymbols ?? ['NVDA', 'AAPL', 'AMZN', 'MSFT']).join(', '),
  )
  const [template, setTemplate] = useState<string>('long_stock_event')
  const [lookbackYears, setLookbackYears] = useState(3)
  const [entryOffset, setEntryOffset] = useState(-1)
  const [exitOffset, setExitOffset] = useState(2)
  const [sepaMinScore, setSepaMinScore] = useState(70)
  const [ivThreshold, setIvThreshold] = useState(0.8)
  const [ivDirection, setIvDirection] = useState<'above' | 'below'>('above')
  const [fillOpen, setFillOpen] = useState(false)
  const [fill, setFill] = useState<FillConfig>(DEFAULT_FILL)
  const [walkForward, setWalkForward] = useState(false)
  const [benchmark, setBenchmark] = useState(false)
  const [hypothesisId, setHypothesisId] = useState<string>(initialHypothesisId ?? '')
  const [showErrorDetail, setShowErrorDetail] = useState(false)

  const hypothesesQ = useActiveHypotheses(50)
  const mutation = useRunEventQuery()

  const symbols = useMemo(
    () =>
      symbolsStr
        .split(/[,\s]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    [symbolsStr],
  )

  const disabled = mutation.isPending || symbols.length === 0

  function buildInput(): EventQueryInput {
    const params: Record<string, unknown> = { symbols }
    if (kind === 'sepa_hit') {
      params.min_total_score = sepaMinScore
    } else if (kind === 'iv_percentile_threshold') {
      params.threshold = ivThreshold
      params.direction = ivDirection
    }
    return {
      event_def: { kind, params },
      strategy_template: template,
      fill_config: fill,
      lookback_years: lookbackYears,
      hypothesis_id: hypothesisId ? hypothesisId : null,
      include_walk_forward: walkForward,
      include_benchmark: benchmark,
      template_kwargs: {
        entry_offset_days: entryOffset,
        exit_offset_days: exitOffset,
      },
    }
  }

  async function runQuery() {
    setShowErrorDetail(false)
    try {
      const data = await mutation.mutateAsync(buildInput())
      onRun?.(data)
    } catch {
      setShowErrorDetail(true)
    }
  }

  function handleHypothesisChange(val: string) {
    const normalized = val === '__none__' ? '' : val
    setHypothesisId(normalized)
    onHypothesisChange?.(normalized || null)
  }

  return (
    <Card variant="elevated">
      <CardContent className="space-y-3 px-3 py-3">
        <div className="flex flex-col gap-3 md:grid md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-dense-caption uppercase tracking-wide text-muted-foreground">
              Event kind
            </Label>
            <Select value={kind} onValueChange={(v) => setKind(v as Exclude<EventKind, 'sql'>)}>
              <SelectTrigger className="h-8 text-dense-body">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_KIND_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex flex-col leading-tight">
                      <span className="text-dense-body">{opt.label}</span>
                      <span className="text-dense-caption text-muted-foreground">{opt.hint}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-dense-caption uppercase tracking-wide text-muted-foreground">
              Strategy template
            </Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger className="h-8 text-dense-body">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                    {opt.note ? (
                      <span className="ml-1.5 text-dense-caption text-muted-foreground">
                        {opt.note}
                      </span>
                    ) : null}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label
            htmlFor="event-query-symbols"
            className="text-dense-caption uppercase tracking-wide text-muted-foreground"
          >
            Symbols (comma-separated)
          </Label>
          <Input
            id="event-query-symbols"
            value={symbolsStr}
            onChange={(e) => setSymbolsStr(e.target.value)}
            placeholder="NVDA, AAPL, AMZN"
            className="h-8 text-dense-body"
          />
          <p className="text-dense-caption text-muted-foreground">
            {symbols.length} symbol{symbols.length === 1 ? '' : 's'} parsed
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label
              htmlFor="event-query-lookback"
              className="text-dense-caption uppercase tracking-wide text-muted-foreground"
            >
              Lookback years
            </Label>
            <Input
              id="event-query-lookback"
              type="number"
              min={1}
              max={10}
              value={lookbackYears}
              onChange={(e) =>
                setLookbackYears(Math.max(1, Math.min(10, Number(e.target.value) || 3)))
              }
              className="h-8 text-dense-body"
            />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="event-query-entry-offset"
              className="text-dense-caption uppercase tracking-wide text-muted-foreground"
            >
              Entry offset (days)
            </Label>
            <Input
              id="event-query-entry-offset"
              type="number"
              min={-10}
              max={10}
              value={entryOffset}
              onChange={(e) => setEntryOffset(Number(e.target.value) || 0)}
              className="h-8 text-dense-body"
            />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="event-query-exit-offset"
              className="text-dense-caption uppercase tracking-wide text-muted-foreground"
            >
              Exit offset (days)
            </Label>
            <Input
              id="event-query-exit-offset"
              type="number"
              min={-5}
              max={45}
              value={exitOffset}
              onChange={(e) => setExitOffset(Number(e.target.value) || 0)}
              className="h-8 text-dense-body"
            />
          </div>
        </div>

        {kind === 'sepa_hit' && (
          <div className="space-y-1">
            <Label
              htmlFor="event-query-sepa-score"
              className="text-dense-caption uppercase tracking-wide text-muted-foreground"
            >
              SEPA min total score
            </Label>
            <Input
              id="event-query-sepa-score"
              type="number"
              min={0}
              max={100}
              value={sepaMinScore}
              onChange={(e) => setSepaMinScore(Number(e.target.value) || 70)}
              className="h-8 w-40 text-dense-body"
            />
          </div>
        )}

        {kind === 'iv_percentile_threshold' && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label
                htmlFor="event-query-iv-threshold"
                className="text-dense-caption uppercase tracking-wide text-muted-foreground"
              >
                IV percentile threshold
              </Label>
              <Input
                id="event-query-iv-threshold"
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={ivThreshold}
                onChange={(e) => setIvThreshold(Number(e.target.value) || 0.8)}
                className="h-8 w-40 text-dense-body"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-dense-caption uppercase tracking-wide text-muted-foreground">
                Direction
              </Label>
              <SegmentControl
                options={[
                  { value: 'above', label: 'Above' },
                  { value: 'below', label: 'Below' },
                ]}
                value={ivDirection}
                onChange={(v) => setIvDirection(v as 'above' | 'below')}
              />
            </div>
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={() => setFillOpen((v) => !v)}
            className="flex items-center gap-1 text-dense-label font-semibold text-muted-foreground hover:text-foreground"
            aria-expanded={fillOpen}
          >
            {fillOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            Fill config
            <span className="text-dense-caption font-normal text-muted-foreground">
              (slippage {fill.slippage_pct_of_spread}× spread · commission $
              {fill.commission_per_contract.toFixed(2)}/contract)
            </span>
          </button>
          {fillOpen && (
            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label
                  htmlFor="event-query-slippage"
                  className="text-dense-caption uppercase tracking-wide text-muted-foreground"
                >
                  Slippage (× spread)
                </Label>
                <Input
                  id="event-query-slippage"
                  type="number"
                  min={0}
                  max={2}
                  step={0.05}
                  value={fill.slippage_pct_of_spread}
                  onChange={(e) =>
                    setFill((f) => ({
                      ...f,
                      slippage_pct_of_spread: Number(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-dense-body"
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="event-query-commission"
                  className="text-dense-caption uppercase tracking-wide text-muted-foreground"
                >
                  Commission $/contract
                </Label>
                <Input
                  id="event-query-commission"
                  type="number"
                  min={0}
                  step={0.05}
                  value={fill.commission_per_contract}
                  onChange={(e) =>
                    setFill((f) => ({
                      ...f,
                      commission_per_contract: Number(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-dense-body"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-dense-caption uppercase tracking-wide text-muted-foreground">
                  Multiplier
                </Label>
                <Input
                  value={fill.multiplier}
                  readOnly
                  disabled
                  className="h-8 text-dense-body"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-dense-label">
            <Checkbox
              checked={walkForward}
              onCheckedChange={(v) => setWalkForward(v === true)}
            />
            Include walk-forward
          </label>
          <label className="flex items-center gap-2 text-dense-label">
            <Checkbox
              checked={benchmark}
              onCheckedChange={(v) => setBenchmark(v === true)}
            />
            Include SPY / zero-signal benchmark
          </label>
        </div>

        <div className="space-y-1">
          <Label className="text-dense-caption uppercase tracking-wide text-muted-foreground">
            Attach to hypothesis
          </Label>
          <Select value={hypothesisId || '__none__'} onValueChange={handleHypothesisChange}>
            <SelectTrigger className="h-8 text-dense-body">
              <SelectValue placeholder="— none —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— none —</SelectItem>
              {(hypothesesQ.data?.recent_active ?? []).map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-dense-caption text-muted-foreground">
            Auto-appends the resulting run id to
            <code className="ml-1 rounded bg-muted px-1 py-0.5">
              research.hypothesis.linked_backtest_ids
            </code>
            .
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" disabled={disabled} onClick={runQuery} className="gap-1.5">
            <Play className="h-3.5 w-3.5" />
            {mutation.isPending ? 'Running…' : 'Run event query'}
          </Button>
          <p className="text-dense-caption text-muted-foreground">
            Observe-only historical replay (D10 BLOCKED).
          </p>
        </div>

        {mutation.isError && showErrorDetail && (
          <Alert variant="destructive">
            <AlertDescription className="text-dense-meta">
              {(mutation.error as Error)?.message ?? 'Event query failed'}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
