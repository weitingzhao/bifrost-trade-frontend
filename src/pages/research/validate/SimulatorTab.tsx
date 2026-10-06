/**
 * Simulator tab — the option position simulator (research 0.170.0): one seller
 * structure opened on a schedule, managed every session (profit take, stop,
 * DTE exit, stale quotes) and settled at intrinsic. Run-first like the Event
 * tab: persisted `sim:*` runs on the left, the selected run's readings, curve
 * and trades on the right, the builder behind ＋ New sim. Fills are modelled
 * (vwap or close plus tiered slippage — option_daily has no bid/ask), and
 * every run says so. Historical only — nothing here places an order (D10).
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'
import { ViewState } from '@bifrost/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CloseButton, DenseTag, SegmentControl } from '@/components/data-display'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { firstResearchAuthGapError } from '@/lib/auth/researchAuthGap'
import { failedDetail } from '@/lib/viewState'
import { fmtNumLocale } from '@/lib/format'
import {
  indicatorChartSignal,
  pineChartSignalOf,
  pineLibraryPath,
  withChartSignal,
  withSymbolParam,
} from '@/lib/symbolLink'
import { useResearchAuth } from '@/lib/auth/researchUser'
import { usePineLibrary } from '@/hooks/usePineLibrary'
import { useSimEntryBasis } from '@/hooks/useSimEntryBasis'
import { SYMBOL_PATH } from '@/lib/symbolTabs'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import { runSymbols } from '@/utils/backtestRuns'
import { cap, mono, panel, panelHead, td, th } from '@/components/research/labFaceUi'
import { useRunSim, useSimDetail } from '@/hooks/useBacktestSim'
import type { BacktestRunRow } from '@/api/research/backtestEvent'
import {
  INDICATOR_SIGNALS,
  indicatorSignal,
  signalShortLabel,
  type IndicatorSignalId,
} from '@/api/research/indicators'
import { pricePlots, type PineLibraryEntry, type PineSide } from '@/api/research/pine'
import {
  entryOffsetFor,
  sessionsAfterOf,
  type SimEquityPoint,
  type SimInput,
  type SimResponse,
  type SimStructure,
  type SimSummary,
  type SimTrade,
} from '@/api/research/backtestSim'
import { SimComparison } from './SimComparison'
import {
  ONE_SIDED,
  STRUCTURE_LABEL,
  WINGED,
  curveFrom,
  exitReasonRows,
  legsLabel,
  pct,
  sampleTone,
  simUsd,
  simStructure,
  simSummaryOf,
  tradeExpiry,
} from './simRuns'

const STRUCTURES: SimStructure[] = [
  'short_put',
  'put_credit_spread',
  'call_credit_spread',
  'short_strangle',
  'iron_condor',
]

interface SimulatorTabProps {
  rows: BacktestRunRow[]
  loading: boolean
  error: unknown
  hasData: boolean
  onRetry: () => void
  builderOpen: boolean
  onBuilderClose: () => void
  selectedId: string | null
  onSelect: (id: string) => void
  heldSymbol: string
}

export function SimulatorTab({
  rows,
  loading,
  error,
  hasData,
  onRetry,
  builderOpen,
  onBuilderClose,
  selectedId,
  onSelect,
  heldSymbol,
}: SimulatorTabProps) {
  const pineLib = usePineLibrary().scripts
  const [live, setLive] = useState<SimResponse | null>(null)
  // The same run with the schedule entry, when the builder asked for the comparison.
  const [baseline, setBaseline] = useState<SimResponse | null>(null)
  const effectiveId = selectedId ?? live?.run_id ?? rows[0]?.id ?? null
  const selectedRow = rows.find((r) => r.id === effectiveId) ?? null
  // A live run that did not persist (DDL not applied yet, or persist off) has
  // no id; it stays on screen until another run is picked.
  const showLive =
    live != null && (live.run_id == null ? selectedId == null : live.run_id === effectiveId)
  const detailQ = useSimDetail(!showLive && selectedRow ? selectedRow.id : undefined)

  const view = showLive
    ? {
        summary: live.summary,
        trades: live.trades,
        equity: live.equity,
        row: null as BacktestRunRow | null,
        entry: runEntryOf(liveEventDef(live.summary), live.summary),
      }
    : selectedRow
      ? {
          summary: simSummaryOf(selectedRow),
          trades: detailQ.data?.trades ?? [],
          equity: detailQ.data?.equity ?? [],
          row: selectedRow,
          entry: runEntryOf(selectedRow.event_def, simSummaryOf(selectedRow)),
        }
      : null

  return (
    <div className="space-y-3">
      {builderOpen ? (
        <SimBuilder
          defaultSymbols={heldSymbol ? [heldSymbol] : undefined}
          onClose={onBuilderClose}
          onRun={(res, base) => {
            setLive(res)
            setBaseline(base ?? null)
            onBuilderClose()
            if (res.run_id) onSelect(res.run_id)
          }}
        />
      ) : null}
      <div className="flex flex-wrap items-start gap-3">
        <section className={cn(panel, 'max-w-[32rem] flex-[1_1_22rem]')}>
          <header className={panelHead}>
            <span className="text-dense-body font-semibold">Simulations</span>
            <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>
              {hasData ? fmtNumLocale(rows.length, 0) : '…'}
            </span>
            <span className="ml-auto text-dense-caption text-muted-foreground">
              sim:* · newest first
            </span>
          </header>
          {loading ? (
            <ViewState kind="loading" title="Loading the simulations" rows={6} cols={5} />
          ) : !hasData && firstResearchAuthGapError(error) ? (
            <ResearchAuthGap error={error} onRetry={onRetry} className="p-2" />
          ) : !hasData && error ? (
            <ViewState
              kind="failed"
              title="Couldn’t load the simulations"
              detail="No run was read — an empty list here would not mean nothing ran."
              onAction={onRetry}
            />
          ) : rows.length === 0 ? (
            <ViewState
              kind="empty"
              title="No stored simulations"
              detail="＋ New sim replays a seller structure. Runs are kept once the 0.170.0 tables exist."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px]">
                <thead>
                  <tr>
                    <th className={cn(th, 'text-left')}>Run</th>
                    <th className={cn(th, 'text-left')}>Structure · symbols · entry</th>
                    <th className={th}>n</th>
                    <th className={th}>Win</th>
                    <th className={th}>P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const s = simSummaryOf(r)
                    const entry = runEntryOf(r.event_def, s)
                    const tone = sampleTone(s.sample_note)
                    const on = r.id === effectiveId && !(showLive && live?.run_id == null)
                    return (
                      <tr
                        key={r.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelect(r.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onSelect(r.id)
                          }
                        }}
                        data-selected={on ? 'true' : undefined}
                        className="cursor-pointer"
                      >
                        <td className={cn(td, 'text-left')}>
                          <div className={cn(mono, 'text-dense-caption font-semibold')}>
                            {r.id.slice(0, 11)}
                          </div>
                          <div className={cn(mono, 'text-dense-micro text-muted-foreground')}>
                            {r.created_at.slice(0, 16).replace('T', ' ')}
                          </div>
                        </td>
                        <td className={cn(td, 'text-left')}>
                          <div className="font-sans text-dense-caption">
                            {STRUCTURE_LABEL[simStructure(r)] ?? simStructure(r)}
                          </div>
                          <div className={cn(mono, 'text-dense-micro text-muted-foreground')}>
                            {runSymbols(r.event_def.params).join(' ') || '—'}
                            <span className="ml-1.5" title={entryBasisTitle(entry)}>
                              {entryLabel(entry, pineLib)}
                            </span>
                          </div>
                        </td>
                        <td
                          className={cn(
                            td,
                            tone === 'destructive'
                              ? 'text-destructive'
                              : tone === 'warning'
                                ? 'text-warning'
                                : ''
                          )}
                        >
                          {s.n_trades ?? '—'}
                        </td>
                        <td className={td}>{pct(s.win_rate)}</td>
                        <td className={cn(td, pnlColorClass(s.total_pnl))}>{simUsd(s.total_pnl)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="min-w-0 flex-[999_1_34rem] space-y-3">
          {showLive && live && !live.run_id ? (
            <ViewState
              kind="stale"
              layout="strip"
              title="This run was not stored"
              detail={
                live.run.error
                  ? `The tables may not exist yet (0.170.0 ddl-apply): ${live.run.error}`
                  : 'Persist was off — the result is only on this screen.'
              }
            />
          ) : null}
          {view && (view.summary.pine_exit_comparison || view.entry.kind !== 'schedule') ? (
            <SimComparison
              exit={view.summary.pine_exit_comparison}
              signalRun={view.entry.kind !== 'schedule'}
              schedule={
                showLive && live && baseline
                  ? {
                      signal: live.summary,
                      baseline: baseline.summary,
                      events: (live.summary as SimSummary & { entry_rule?: { events?: number } }).entry_rule?.events,
                    }
                  : null
              }
            />
          ) : null}
          {view ? (
            <SimResult
              summary={view.summary}
              trades={view.trades}
              equity={view.equity}
              row={view.row}
              entry={view.entry}
              lib={pineLib}
              detailState={
                view.row && detailQ.isLoading
                  ? 'loading'
                  : view.row && detailQ.isError
                    ? 'failed'
                    : 'ok'
              }
              detailError={
                detailQ.isError
                  ? failedDetail(detailQ, 'The trades and curve were not read.')
                  : null
              }
              onRetryDetail={() => void detailQ.refetch()}
            />
          ) : (
            <section className={panel}>
              <ViewState
                kind="empty"
                title="No simulation selected"
                detail="Pick a run on the left, or ＋ New sim."
              />
            </section>
          )}
        </section>
      </div>
    </div>
  )
}

function SimField({ id, label, children }: { id?: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-dense-meta font-semibold text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function NumField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  id: string
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
}) {
  return (
    <SimField id={id} label={label}>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)))
        }}
        className="h-8 text-dense-body"
      />
    </SimField>
  )
}

/** A run's entry: what opened it and how many sessions after the signal, on its own basis. */
interface RunEntry {
  kind: string
  params: Record<string, unknown>
  /** Sessions after the signal (1 = the next session), or null for a schedule. */
  after: number | null
  /** A v1 run (no `entry_timing`): offset 0 entered on the signal's own session. */
  v1: boolean
  /** research 0.178.0: the run let the script's exit close positions. */
  pineExit: boolean
  /** research 0.178.0: the Pine line the short strike was placed against, if any. */
  anchorLine: string | null
}

function runEntryOf(ev: BacktestRunRow['event_def'] | undefined, summary: Partial<SimSummary>): RunEntry {
  const kind = String(ev?.kind ?? 'schedule')
  const params = (ev?.params ?? {}) as Record<string, unknown>
  const v1 = !summary.entry_timing || summary.entry_timing.version < 2
  const off = params.offset_sessions
  const after =
    kind === 'schedule' || off == null || !Number.isFinite(Number(off)) ? null : sessionsAfterOf(Number(off), !v1)
  return {
    kind,
    params,
    after,
    v1,
    pineExit: Boolean(summary.pine_exit_comparison) || Boolean(summary.pine?.exit_mode),
    anchorLine: summary.pine?.anchor_plot ?? null,
  }
}

type EntryRule = { kind?: string; every_sessions?: number; offset_sessions?: number; event_def?: BacktestRunRow['event_def'] }

/** A fresh run's entry, from `summary.entry_rule`, in the stored row's `event_def` shape. */
function liveEventDef(summary: SimSummary): BacktestRunRow['event_def'] {
  const rule = (summary as SimSummary & { entry_rule?: EntryRule }).entry_rule
  if (!rule?.event_def) return { kind: 'schedule', params: { every_sessions: rule?.every_sessions } }
  return {
    kind: rule.event_def.kind,
    params: { ...(rule.event_def.params ?? {}), offset_sessions: rule.offset_sessions },
  } as BacktestRunRow['event_def']
}

/** The run's entry signal as the Symbol chart's `?signal=`, or null for a schedule. */
function runChartSignal(e: RunEntry): string | null {
  if (e.kind === 'pine_signal' && e.params.script) return pineChartSignalOf(String(e.params.script))
  if (e.kind === 'indicator_signal' && e.params.signal) return indicatorChartSignal(String(e.params.signal))
  return null
}

function scriptName(lib: readonly PineLibraryEntry[], id: string): string {
  return lib.find((x) => x.id === id)?.label ?? id
}

/** What opened a run's positions: a schedule, or the signal it waited for, `+N` sessions after. */
function entryLabel(e: RunEntry, lib: readonly PineLibraryEntry[]): string {
  const p = e.params
  if (e.kind === 'schedule') return p.every_sessions != null ? `every ${String(p.every_sessions)}` : ''
  const off = e.after == null ? '' : ` +${e.after}${e.v1 && e.after === 0 ? ' (same session)' : ''}`
  if (e.kind === 'indicator_signal') return `${signalShortLabel(String(p.signal ?? ''), p)}${off}`
  if (e.kind === 'pine_signal') {
    const extra = `${e.pineExit ? ' · Pine exit' : ''}${e.anchorLine ? ` · K at ${e.anchorLine}` : ''}`
    return `Pine ${scriptName(lib, String(p.script ?? ''))} ${String(p.side ?? 'buy')}${off}${extra}`
  }
  return `${e.kind.replace(/_/g, ' ')}${off}`
}

/** The title on a run's entry: which timing basis its `+N` was counted on. */
function entryBasisTitle(e: RunEntry): string | undefined {
  if (e.after == null) return undefined
  return e.v1
    ? 'Run before research 0.175.0: its offset counted from the signal’s own session, so +0 entered before the signal was known.'
    : 'Entered N sessions after the signal’s session, at that session’s fill price.'
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

function SimBuilder({
  defaultSymbols,
  onRun,
  onClose,
}: {
  defaultSymbols?: string[]
  onRun: (r: SimResponse, baseline?: SimResponse) => void
  onClose: () => void
}) {
  const auth = useResearchAuth()
  const basis = useSimEntryBasis()
  const { scripts: pineLib, rows: pineRows } = usePineLibrary()
  const [symbolsStr, setSymbolsStr] = useState((defaultSymbols ?? ['SPY']).join(', '))
  const [structure, setStructure] = useState<SimStructure>('put_credit_spread')
  const [start, setStart] = useState(isoDaysAgo(365))
  const [end, setEnd] = useState(isoDaysAgo(0))
  const [targetDte, setTargetDte] = useState(45)
  const [shortDelta, setShortDelta] = useState(0.2)
  const [wingPct, setWingPct] = useState(5)
  const [every, setEvery] = useState(5)
  const [maxOpen, setMaxOpen] = useState(3)
  const [profitTake, setProfitTake] = useState(50)
  const [stopMult, setStopMult] = useState(2)
  const [dteExit, setDteExit] = useState(21)
  const [priceField, setPriceField] = useState<'vwap' | 'close'>('vwap')
  const [slip, setSlip] = useState(1)
  const [entryMode, setEntryMode] = useState<'schedule' | 'signal' | 'pine'>('schedule')
  const [pineScript, setPineScript] = useState('')
  const [pineSide, setPineSide] = useState<PineSide>('buy')
  const pineId = pineScript || pineLib[0]?.id || ''
  // Pine decides the timing, Bifrost the structure (research 0.178.0): the script's own exit, and a strike at its line.
  const [pineExit, setPineExit] = useState(false)
  // Kept when a structure or script cannot take a line: it runs by Δ and comes back with the next one that can.
  const [strikeAtLine, setStrikeAtLine] = useState(false)
  const lines = pricePlots(pineRows?.find((r) => r.id === pineId))
  const [linePick, setLinePick] = useState('')
  const line = lines.includes(linePick) ? linePick : (lines[0] ?? '')
  const [railLo, setRailLo] = useState(0.1)
  const [railHi, setRailHi] = useState(0.35)
  const lineOK = ONE_SIDED.has(structure) && lines.length > 0
  const lineWhy = !ONE_SIDED.has(structure)
    ? 'A Pine line places one short strike, so it takes a short put or a put or call credit spread'
    : `${scriptName(pineLib, pineId)} plots no price line`
  const anchorOn = entryMode === 'pine' && lineOK && strikeAtLine
  const shortRight = structure === 'call_credit_spread' ? 'call' : 'put'
  const scriptNotes = [
    ...(lineOK ? [] : [`Short strike by Δ — ${lineWhy.charAt(0).toLowerCase()}${lineWhy.slice(1)}.`]),
    ...(anchorOn
      ? [
          `The short ${shortRight} goes at the first strike ${shortRight === 'call' ? 'at or above' : 'at or below'} the line’s value on the session before entry. Outside the |Δ| floor and ceiling the entry is skipped and counted, never opened.`,
        ]
      : []),
    ...(pineExit
      ? [
          'The script’s exit (a strategy close or the opposite plot) closes the position on the first session after it is known, alongside profit take, stop and DTE — whichever comes first.',
        ]
      : []),
  ]
  const [signalId, setSignalId] = useState<IndicatorSignalId>('macd_cross_up')
  const [signalParams, setSignalParams] = useState<Record<string, number>>(
    () => ({ ...INDICATOR_SIGNALS[0].defaults })
  )
  // Sessions after the signal session: 1 = the next session, the earliest a
  // signal known only at its close can be acted on. The request's offset is
  // derived per server basis (entryOffsetFor), so 1 means the next session on both.
  const [after, setAfter] = useState(1)
  const [compare, setCompare] = useState(true)
  const mutation = useRunSim()
  const baselineMutation = useRunSim()
  const pending = mutation.isPending || baselineMutation.isPending
  const failed = mutation.isError ? mutation : baselineMutation.isError ? baselineMutation : null
  const isSignal = entryMode !== 'schedule'

  const symbols = useMemo(
    () =>
      symbolsStr
        .split(/[,\s]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    [symbolsStr]
  )
  const tooMany = symbols.length > 10
  const noIdentity = !auth.token
  // A signal entry's offset depends on the server's basis; until it is read, wait.
  const basisUnknown = isSignal && basis.v2 == null

  function input(withSignal: boolean): SimInput {
    const offset = entryOffsetFor(after, basis.v2 === true)
    const entry: Partial<SimInput> = !withSignal
      ? {}
      : entryMode === 'signal'
        ? {
            entry_event: { kind: 'indicator_signal', params: { signal: signalId, ...signalParams } },
            entry_offset_sessions: offset,
          }
        : entryMode === 'pine'
          ? {
              entry_event: { kind: 'pine_signal', params: { script: pineId, side: pineSide } },
              entry_offset_sessions: offset,
              ...(pineExit ? { pine_exit: 'auto' as const } : {}),
              ...(anchorOn && line ? { strike_anchor: { plot: line, min_delta: railLo, max_delta: railHi } } : {}),
            }
          : {}
    return {
      ...entry,
      symbols,
      start,
      end,
      structure,
      target_dte: targetDte,
      short_delta: shortDelta,
      wing_width_pct: wingPct / 100,
      entry_every_sessions: every,
      max_open_per_symbol: maxOpen,
      profit_take_pct: profitTake > 0 ? profitTake / 100 : null,
      stop_loss_mult: stopMult > 0 ? stopMult : null,
      dte_exit: dteExit > 0 ? dteExit : null,
      price_field: priceField,
      slippage_scale: slip,
    }
  }

  const blockedWhy = noIdentity
    ? 'Set user — runs need a Research identity'
    : tooMany
      ? 'At most 10 symbols per run.'
      : symbols.length === 0
        ? 'Name at least one symbol.'
        : entryMode === 'pine' && !pineId
          ? 'No active Pine script to enter on.'
          : anchorOn && !(railLo < railHi)
            ? 'The |Δ| floor must be below the ceiling.'
            : basisUnknown
            ? basis.failed
              ? 'Research did not say its version, so a signal’s entry session cannot be placed — try again.'
              : 'Reading Research’s entry basis…'
            : null

  return (
    <section className={panel} aria-label="New simulation">
      <header className={panelHead}>
        <span className="text-dense-body font-semibold">New simulation</span>
        <span className="text-dense-caption text-muted-foreground">
          one seller structure, opened on a schedule or a signal, managed every session, settled at intrinsic
        </span>
        <span className="ml-auto">
          <CloseButton label="Close the builder" onClick={onClose} />
        </span>
      </header>
      <div className="space-y-3 px-3 py-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,.7fr)_minmax(0,.7fr)]">
          <SimField id="sim-symbols" label="Symbols (1–10)">
            <Input
              id="sim-symbols"
              value={symbolsStr}
              onChange={(e) => setSymbolsStr(e.target.value)}
              placeholder="SPY, QQQ"
              className="h-8 text-dense-body"
            />
          </SimField>
          <SimField id="sim-start" label="Start">
            <Input
              id="sim-start"
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="h-8 text-dense-body"
            />
          </SimField>
          <SimField id="sim-end" label="End">
            <Input
              id="sim-end"
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="h-8 text-dense-body"
            />
          </SimField>
        </div>

        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <SimField label="Structure">
            <SegmentControl
              ariaLabel="Structure"
              options={STRUCTURES.map((v) => ({ value: v, label: STRUCTURE_LABEL[v] }))}
              value={structure}
              onChange={(v) => setStructure(v as SimStructure)}
            />
          </SimField>
          <SimField label="Entry">
            <SegmentControl
              ariaLabel="Entry"
              options={[
                { value: 'schedule', label: 'Schedule' },
                { value: 'signal', label: 'Indicator signal' },
                { value: 'pine', label: 'Pine script' },
              ]}
              value={entryMode}
              onChange={(v) => setEntryMode(v as 'schedule' | 'signal' | 'pine')}
            />
          </SimField>
          {entryMode === 'pine' ? (
            <>
              <SimField label="Script">
                <span className="flex items-center gap-1.5">
                  <Select value={pineId} onValueChange={setPineScript}>
                    <SelectTrigger className="h-8 w-[13rem] text-dense-body" aria-label="Pine script">
                      <SelectValue placeholder="No active scripts" />
                    </SelectTrigger>
                    <SelectContent>
                      {pineLib.map((x) => (
                        <SelectItem key={x.id} value={x.id}>
                          {x.label}
                          {x.origin === 'user' ? ' · mine' : x.origin === 'community' ? ' · community' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {pineId ? (
                    <Link
                      to={pineLibraryPath(pineId)}
                      title="Open this script in the Pine library"
                      aria-label="Open this script in the Pine library"
                      className="mat-btn inline-flex h-8 items-center px-2 text-dense-label"
                    >
                      ↗
                    </Link>
                  ) : null}
                </span>
              </SimField>
              <SimField label="Signal">
                <SegmentControl
                  ariaLabel="Signal side"
                  options={[
                    { value: 'buy', label: 'Buy' },
                    { value: 'sell', label: 'Sell' },
                  ]}
                  value={pineSide}
                  onChange={(v) => setPineSide(v as PineSide)}
                />
              </SimField>
            </>
          ) : null}
          {entryMode === 'signal' ? (
            <SimField label="Signal">
              <Select
                value={signalId}
                onValueChange={(v) => {
                  setSignalId(v as IndicatorSignalId)
                  setSignalParams({ ...(indicatorSignal(v)?.defaults ?? {}) })
                }}
              >
                <SelectTrigger className="h-8 w-[16rem] text-dense-body" aria-label="Signal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDICATOR_SIGNALS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SimField>
          ) : null}
          {isSignal ? (
            <>
              <div className="w-[9.5rem]" title="The signal is only known at its session’s close, so 1 — the next session — is the earliest">
                <NumField
                  id="sim-offset"
                  label="Enter at (sessions after)"
                  value={after}
                  onChange={setAfter}
                  min={1}
                  max={11}
                />
              </div>
              <label className="flex items-center gap-2 pb-1.5 text-dense-caption">
                <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
                Compare with the schedule
              </label>
            </>
          ) : null}
        </div>
        {entryMode === 'signal' && Object.keys(signalParams).length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {Object.entries(signalParams).map(([k, v]) => (
              <NumField
                key={`${signalId}-${k}`}
                id={`sim-sig-${k}`}
                label={k}
                value={v}
                onChange={(n) => setSignalParams((p) => ({ ...p, [k]: n }))}
                min={k === 'mult' ? 0.5 : 2}
                max={k === 'level' ? 98 : k === 'mult' ? 5 : 400}
                step={k === 'mult' ? 0.25 : 1}
              />
            ))}
          </div>
        ) : null}

        {entryMode === 'pine' ? (
          <div className="flex flex-col gap-2 border-t border-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)] pt-2.5">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className={cap}>From the script</span>
              <span className="text-dense-caption text-muted-foreground">
                the script times the entry and, if you let it, the exit and the short strike; the structure stays as set
                above
              </span>
            </div>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2.5">
              <SimField label="Exit">
                <SegmentControl
                  ariaLabel="Exit"
                  options={[
                    { value: 'premium', label: 'Premium rules' },
                    { value: 'pine', label: '+ Pine exit' },
                  ]}
                  value={pineExit ? 'pine' : 'premium'}
                  onChange={(v) => setPineExit(v === 'pine')}
                />
              </SimField>
              <SimField label="Short strike">
                {lineOK ? (
                  <SegmentControl
                    ariaLabel="Short strike"
                    options={[
                      { value: 'delta', label: 'By Δ' },
                      { value: 'line', label: 'At a Pine line' },
                    ]}
                    value={strikeAtLine ? 'line' : 'delta'}
                    onChange={(v) => setStrikeAtLine(v === 'line')}
                  />
                ) : (
                  <span title={lineWhy} className="inline-flex h-8 items-center text-dense-body text-[var(--sk-soft)]">
                    By Δ
                  </span>
                )}
              </SimField>
              {anchorOn ? (
                <>
                  <SimField label="Line">
                    <Select value={line} onValueChange={setLinePick}>
                      <SelectTrigger className="h-8 w-[11rem] text-dense-body" aria-label="Pine line">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {lines.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SimField>
                  <div className="w-24">
                    <NumField id="sim-rail-lo" label="|Δ| floor" value={railLo} onChange={setRailLo} min={0} max={0.95} step={0.01} />
                  </div>
                  <div className="w-24">
                    <NumField id="sim-rail-hi" label="|Δ| ceiling" value={railHi} onChange={setRailHi} min={0.01} max={1} step={0.01} />
                  </div>
                </>
              ) : null}
            </div>
            {scriptNotes.map((t) => (
              <p key={t} className="m-0 text-dense-caption text-muted-foreground">
                {t}
              </p>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <NumField id="sim-dte" label="Target DTE" value={targetDte} onChange={setTargetDte} min={7} max={80} />
          {anchorOn ? null : (
            <NumField
              id="sim-delta"
              label="Short Δ"
              value={shortDelta}
              onChange={setShortDelta}
              min={0.05}
              max={0.5}
              step={0.01}
            />
          )}
          {WINGED.has(structure) ? (
            <NumField
              id="sim-wing"
              label="Wing width (% of strike)"
              value={wingPct}
              onChange={setWingPct}
              min={1}
              max={50}
              step={0.5}
            />
          ) : null}
          <NumField
            id="sim-every"
            label={isSignal ? 'Schedule baseline: every' : 'Open every (sessions)'}
            value={every}
            onChange={setEvery}
            min={1}
            max={60}
          />
          <NumField id="sim-maxopen" label="Max open per symbol" value={maxOpen} onChange={setMaxOpen} min={1} max={20} />
        </div>

        <div className={cap}>Management · 0 turns a rule off</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <NumField
            id="sim-pt"
            label="Profit take (% of credit)"
            value={profitTake}
            onChange={setProfitTake}
            min={0}
            max={100}
            step={5}
          />
          <NumField id="sim-stop" label="Stop (× credit)" value={stopMult} onChange={setStopMult} min={0} max={20} step={0.5} />
          <NumField id="sim-dteexit" label="Close at DTE" value={dteExit} onChange={setDteExit} min={0} max={80} />
          <NumField id="sim-slip" label="Slippage (× tier)" value={slip} onChange={setSlip} min={0} max={10} step={0.25} />
          <SimField label="Fill price">
            <SegmentControl
              ariaLabel="Fill price"
              options={[
                { value: 'vwap', label: 'VWAP' },
                { value: 'close', label: 'Close' },
              ]}
              value={priceField}
              onChange={(v) => setPriceField(v as 'vwap' | 'close')}
            />
          </SimField>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            title={blockedWhy ?? undefined}
            onClick={() => {
              baselineMutation.reset()
              mutation.mutate(input(true), {
                onSuccess: (res) => {
                  if (!isSignal || !compare) {
                    onRun(res)
                    return
                  }
                  baselineMutation.mutate(input(false), {
                    onSuccess: (base) => onRun(res, base),
                    onError: () => onRun(res),
                  })
                },
              })
            }}
            disabled={pending || blockedWhy != null}
          >
            <Play className="h-3.5 w-3.5" />
            {mutation.isPending
              ? 'Simulating…'
              : baselineMutation.isPending
                ? 'Running the schedule baseline…'
                : 'Run simulation'}
          </Button>
          <span className={cn('text-dense-caption', blockedWhy ? 'text-foreground' : 'text-muted-foreground')}>
            {blockedWhy ??
              `Fills are modelled: option_daily has no bid / ask, so the price is VWAP or close plus a tiered slippage. Runs as ${auth.userLabel ?? 'you'} — a run needs a Research identity.`}
          </span>
        </div>
        {failed ? (
          firstResearchAuthGapError(failed.error) ? (
            <ResearchAuthGap error={failed.error} layout="banner" />
          ) : (
            <ViewState
              kind="failed"
              layout="strip"
              title={failed === mutation ? 'The simulation did not run' : 'The schedule baseline did not run'}
              detail={failed.error instanceof Error ? failed.error.message : String(failed.error)}
            />
          )
        ) : null}
      </div>
    </section>
  )
}

function Tile({
  label,
  value,
  note,
  cls,
}: {
  label: string
  value: string
  note?: string
  cls?: string
}) {
  return (
    <div className="min-w-0 px-3 py-2" data-sr-kpi="">
      <span className={cap}>{label}</span>
      <p
        className={cn('m-0 font-mono text-lg font-semibold tabular-nums', cls ?? 'text-foreground')}
      >
        {value}
      </p>
      {note ? (
        <p className="m-0 truncate text-dense-caption text-muted-foreground" title={note}>
          {note}
        </p>
      ) : null}
    </div>
  )
}

function SimResult({
  summary,
  trades,
  equity,
  row,
  entry,
  lib,
  detailState,
  detailError,
  onRetryDetail,
}: {
  summary: Partial<SimSummary>
  trades: SimTrade[]
  equity: SimEquityPoint[]
  row: BacktestRunRow | null
  entry: RunEntry
  lib: readonly PineLibraryEntry[]
  detailState: 'loading' | 'failed' | 'ok'
  detailError: string | null
  onRetryDetail: () => void
}) {
  const tone = sampleTone(summary.sample_note)
  const ci = summary.avg_pnl_ci95
  const reasons = exitReasonRows(summary.exit_reasons)
  const skipped = Object.entries(summary.skipped_entries ?? {}).filter(([, v]) => v > 0)
  return (
    <section className={panel}>
      <header className={panelHead}>
        {row ? (
          <>
            <span className={cn(mono, 'font-bold')}>{row.id.slice(0, 11)}</span>
            <DenseTag size="cell" variant="neutral">
              {STRUCTURE_LABEL[simStructure(row)] ?? simStructure(row)}
            </DenseTag>
            <span className="inline-flex flex-wrap gap-1">
              {runSymbols(row.event_def.params).map((s) => (
                <Link
                  key={s}
                  to={withSymbolParam(SYMBOL_PATH, s)}
                  className={cn(
                    mono,
                    'px-1.5 text-dense-caption font-bold leading-4 text-entity-symbol hover:underline mat-tag'
                  )}
                >
                  {s}
                </Link>
              ))}
            </span>
          </>
        ) : (
          <span className="font-semibold">This run</span>
        )}
        {entry.kind !== 'schedule' ? (
          <span className="text-dense-caption text-muted-foreground" title={entryBasisTitle(entry)}>
            {entryLabel(entry, lib)}
          </span>
        ) : null}
        {tone ? (
          <DenseTag size="cell" variant={tone === 'destructive' ? 'danger' : 'warning'}>
            {summary.sample_note === 'noise' ? 'noise · under 5 trades' : 'thin · under 30 trades'}
          </DenseTag>
        ) : null}
        <span
          className="ml-auto text-dense-caption text-muted-foreground"
          title={summary.rule_timing}
        >
          {summary.fill_basis ?? ''}
        </span>
      </header>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] border-b border-border">
        <Tile
          label="Trades"
          value={String(summary.n_trades ?? '—')}
          note={
            summary.avg_days_held != null
              ? `${summary.avg_days_held} days held on average`
              : undefined
          }
        />
        <Tile
          label="Win rate"
          value={pct(summary.win_rate)}
          note={
            summary.win_rate != null && summary.n_trades
              ? `${Math.round(summary.win_rate * summary.n_trades)} of ${summary.n_trades}`
              : undefined
          }
        />
        <Tile
          label="Total P&L"
          value={simUsd(summary.total_pnl)}
          cls={pnlColorClass(summary.total_pnl)}
          note="net of modelled fills"
        />
        <Tile
          label="Avg / trade"
          value={simUsd(summary.avg_pnl)}
          cls={pnlColorClass(summary.avg_pnl)}
          note={ci ? `95% CI ${simUsd(ci[0])} to ${simUsd(ci[1])}` : 'too few trades for an interval'}
        />
        <Tile
          label="Worst trade"
          value={simUsd(summary.worst_trade)}
          cls={pnlColorClass(summary.worst_trade)}
          note="single position"
        />
        <Tile
          label="Max drawdown"
          value={simUsd(summary.max_drawdown)}
          note={pct(summary.max_drawdown_pct, 1) + ' of capital'}
        />
        <Tile
          label="Sharpe"
          value={summary.sharpe_annual != null ? summary.sharpe_annual.toFixed(2) : '—'}
          note={summary.sharpe_annual != null ? 'daily equity, annualised' : 'withheld · too few trades'}
        />
        <Tile
          label="On peak margin"
          value={pct(summary.return_on_peak_margin, 1)}
          note={`peak ${simUsd(summary.peak_margin)}`}
        />
      </div>

      {reasons.length || skipped.length ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-2">
          <span className={cap}>Exits</span>
          {reasons.map(([k, v]) => (
            <DenseTag
              key={k}
              size="cell"
              variant={
                k === 'stop' || k === 'expiry_itm'
                  ? 'danger'
                  : k === 'profit_take'
                    ? 'success'
                    : 'neutral'
              }
            >
              {k.replace(/_/g, ' ')} {v}
            </DenseTag>
          ))}
          {skipped.length ? (
            <span className="ml-2 text-dense-caption text-muted-foreground">
              entries skipped: {skipped.map(([k, v]) => `${skipLabel(k)} ${v}`).join(' · ')}
            </span>
          ) : null}
        </div>
      ) : null}

      {detailState === 'loading' ? (
        <ViewState kind="loading" title="Loading trades and curve" rows={6} cols={6} />
      ) : detailState === 'failed' ? (
        <ViewState
          kind="failed"
          title="Couldn’t load the trades"
          detail={detailError ?? undefined}
          onAction={onRetryDetail}
        />
      ) : (
        <>
          <EquityCurve equity={equity} />
          <TradesTable trades={trades} chartSignal={runChartSignal(entry)} />
        </>
      )}
    </section>
  )
}

function EquityCurve({ equity }: { equity: SimEquityPoint[] }) {
  const c = curveFrom(equity)
  if (c.pnl.length < 2) {
    return (
      <p className="m-0 border-b border-border px-3 py-2 text-dense-caption text-muted-foreground">
        No equity curve stored for this run.
      </p>
    )
  }
  const n = c.pnl.length
  const lo = Math.min(0, ...c.pnl)
  const hi = Math.max(0, ...c.pnl)
  const span = hi - lo || 1
  const X = (i: number) => (i / (n - 1)) * 320
  const Y = (v: number) => 92 - ((v - lo) / span) * 88
  const ddLo = Math.min(...c.drawdown) || -1
  return (
    <div className="border-b border-border px-3 py-2">
      <div className="mb-1 flex justify-between text-dense-caption text-muted-foreground">
        <span>
          P&amp;L · {c.first} to {c.last}
        </span>
        <span className={pnlColorClass(c.pnl[n - 1])}>{simUsd(c.pnl[n - 1])}</span>
      </div>
      <svg
        viewBox="0 0 320 96"
        preserveAspectRatio="none"
        className="block h-24 w-full"
        role="img"
        aria-label="Cumulative P&L"
      >
        <line x1="0" y1={Y(0)} x2="320" y2={Y(0)} stroke="var(--sk-line)" strokeWidth="1" />
        <polyline
          points={c.pnl.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <svg
        viewBox="0 0 320 28"
        preserveAspectRatio="none"
        className="mt-0.5 block h-7 w-full"
        aria-hidden
      >
        <path
          d={`M0,0 ${c.drawdown.map((d, i) => `L${X(i).toFixed(1)},${((d / ddLo) * 27).toFixed(1)}`).join(' ')} L320,0 Z`}
          fill="var(--color-loss)"
          opacity="0.55"
        />
        <line x1="0" y1="0.5" x2="320" y2="0.5" stroke="var(--sk-line)" strokeWidth="1" />
      </svg>
    </div>
  )
}

/** A skipped-entry reason as the run reads it (Rev .161 names the |Δ| guard). */
function skipLabel(k: string): string {
  const named: Record<string, string> = {
    anchor_delta_out_of_band: 'outside |Δ| guard',
    anchor_no_strike: 'no strike beyond the line',
    anchor_missing: 'no line value yet',
  }
  return named[k] ?? k.replace(/_/g, ' ')
}

/** The Pine level a trade's short strike was placed against, and the exit it was due, if any. */
function anchorTitle(t: SimTrade): string | undefined {
  const leg = t.legs.find((l) => l.anchor_level != null)
  const parts = [
    leg ? `${leg.label} ${leg.strike} placed against the Pine line at ${leg.anchor_level}` : null,
    t.pine_exit_on ? `Pine exit due ${t.pine_exit_on}` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : undefined
}

function TradesTable({ trades, chartSignal }: { trades: SimTrade[]; chartSignal: string | null }) {
  if (trades.length === 0) {
    return (
      <p className="m-0 px-3 py-2 text-dense-caption text-muted-foreground">
        No trades stored for this run.
      </p>
    )
  }
  return (
    <div className="max-h-[28rem] overflow-auto">
      <table className="w-full min-w-[720px]">
        <thead>
          <tr>
            <th className={cn(th, 'text-left')}>Symbol</th>
            <th className={cn(th, 'text-left')}>Entry</th>
            <th className={cn(th, 'text-left')}>Exit</th>
            <th className={cn(th, 'text-left')}>Legs · expiry</th>
            <th className={th}>Credit</th>
            <th className={th}>P&amp;L</th>
            <th className={th}>Days</th>
            <th className={cn(th, 'text-left')}>Reason</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr key={`${t.symbol}-${t.seq}`}>
              <td className={cn(td, 'text-left')}>
                <Link
                  to={withSymbolParam(withChartSignal(SYMBOL_PATH, chartSignal), t.symbol)}
                  title={`Open ${t.symbol} in Symbol${chartSignal ? ' with this run’s entry signal marked' : ''}`}
                  className="font-bold text-entity-symbol hover:underline"
                >
                  {t.symbol}
                </Link>
              </td>
              <td className={cn(td, 'text-left text-muted-foreground')}>{t.entry_date}</td>
              <td className={cn(td, 'text-left text-muted-foreground')}>{t.exit_date}</td>
              <td className={cn(td, 'text-left')} title={anchorTitle(t)}>
                {legsLabel(t.legs)}
                <span className="ml-1.5 text-muted-foreground">{tradeExpiry(t) ?? ''}</span>
              </td>
              <td className={td}>{simUsd(t.entry_credit)}</td>
              <td className={cn(td, pnlColorClass(t.pnl))}>{simUsd(t.pnl)}</td>
              <td className={td}>{t.days_held}</td>
              <td className={cn(td, 'text-left font-sans text-dense-caption')}>
                {t.exit_reason.replace(/_/g, ' ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
