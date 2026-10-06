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
import { DenseTag, SegmentControl } from '@/components/data-display'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { firstResearchAuthGapError } from '@/lib/auth/researchAuthGap'
import { failedDetail } from '@/lib/viewState'
import { fmtNumLocale } from '@/lib/format'
import { withSymbolParam } from '@/lib/symbolLink'
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
import type {
  SimEquityPoint,
  SimInput,
  SimResponse,
  SimStructure,
  SimSummary,
  SimTrade,
} from '@/api/research/backtestSim'
import {
  STRUCTURE_LABEL,
  WINGED,
  curveFrom,
  exitReasonRows,
  legsLabel,
  sampleTone,
  simStructure,
  simSummaryOf,
  tradeExpiry,
} from './simRuns'

const STRUCTURES: SimStructure[] = [
  'short_put',
  'put_credit_spread',
  'short_strangle',
  'iron_condor',
]

function usd(v: number | null | undefined, digits = 0): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const s = `$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits })}`
  return v < 0 ? `−${s}` : s
}

function pct(v: number | null | undefined, digits = 0): string {
  return v == null || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(digits)}%`
}

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
      }
    : selectedRow
      ? {
          summary: simSummaryOf(selectedRow),
          trades: detailQ.data?.trades ?? [],
          equity: detailQ.data?.equity ?? [],
          row: selectedRow,
        }
      : null

  return (
    <div className="space-y-3">
      {builderOpen ? (
        <SimBuilder
          defaultSymbols={heldSymbol ? [heldSymbol] : undefined}
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
                    <th className={cn(th, 'text-left')}>Structure · symbols</th>
                    <th className={th}>n</th>
                    <th className={th}>Win</th>
                    <th className={th}>P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const s = simSummaryOf(r)
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
                            <span className="ml-1.5">{entryLabel(r)}</span>
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
                        <td className={cn(td, pnlColorClass(s.total_pnl))}>{usd(s.total_pnl)}</td>
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
          {showLive && live && baseline ? <EntryComparison signal={live} baseline={baseline} /> : null}
          {view ? (
            <SimResult
              summary={view.summary}
              trades={view.trades}
              equity={view.equity}
              row={view.row}
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

function Field({ id, label, children }: { id?: string; label: string; children: React.ReactNode }) {
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
    <Field id={id} label={label}>
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
    </Field>
  )
}

/** What opened a stored run's positions: a schedule, or the event it waited for. */
function entryLabel(r: BacktestRunRow): string {
  const ev = r.event_def
  if (!ev || ev.kind === 'schedule') {
    const every = (ev?.params as Record<string, unknown> | undefined)?.every_sessions
    return every != null ? `every ${every}` : ''
  }
  const p = (ev.params ?? {}) as Record<string, unknown>
  const off = p.offset_sessions != null ? ` ${Number(p.offset_sessions) >= 0 ? '+' : ''}${p.offset_sessions}` : ''
  if (ev.kind === 'indicator_signal') return `${signalShortLabel(String(p.signal ?? ''), p)}${off}`
  return `${String(ev.kind).replace(/_/g, ' ')}${off}`
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

function SimBuilder({
  defaultSymbols,
  onRun,
}: {
  defaultSymbols?: string[]
  onRun: (r: SimResponse, baseline?: SimResponse) => void
}) {
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
  const [entryMode, setEntryMode] = useState<'schedule' | 'signal'>('schedule')
  const [signalId, setSignalId] = useState<IndicatorSignalId>('macd_cross_up')
  const [signalParams, setSignalParams] = useState<Record<string, number>>(
    () => ({ ...INDICATOR_SIGNALS[0].defaults })
  )
  // +1: enter on the close after the signal session — the signal is only known at its close.
  const [offset, setOffset] = useState(1)
  const [compare, setCompare] = useState(true)
  const mutation = useRunSim()
  const baselineMutation = useRunSim()
  const pending = mutation.isPending || baselineMutation.isPending
  const failed = mutation.isError ? mutation : baselineMutation.isError ? baselineMutation : null

  const symbols = useMemo(
    () =>
      symbolsStr
        .split(/[,\s]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    [symbolsStr]
  )
  const tooMany = symbols.length > 10

  function input(withSignal: boolean): SimInput {
    const entry: Partial<SimInput> =
      withSignal && entryMode === 'signal'
        ? {
            entry_event: { kind: 'indicator_signal', params: { signal: signalId, ...signalParams } },
            entry_offset_sessions: offset,
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

  return (
    <section className={cn(panel, 'space-y-3 px-3 py-3')}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_14rem_9rem_9rem]">
        <Field id="sim-symbols" label="Symbols (1–10)">
          <Input
            id="sim-symbols"
            value={symbolsStr}
            onChange={(e) => setSymbolsStr(e.target.value)}
            placeholder="SPY, QQQ"
            className="h-8 text-dense-body"
          />
        </Field>
        <Field label="Structure">
          <Select value={structure} onValueChange={(v) => setStructure(v as SimStructure)}>
            <SelectTrigger className="h-8 text-dense-body" aria-label="Structure">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STRUCTURES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STRUCTURE_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="sim-start" label="Start">
          <Input
            id="sim-start"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="h-8 text-dense-body"
          />
        </Field>
        <Field id="sim-end" label="End">
          <Input
            id="sim-end"
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="h-8 text-dense-body"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className={cap}>Entry</span>
        <SegmentControl
          options={[
            { value: 'schedule', label: 'Schedule' },
            { value: 'signal', label: 'Indicator signal' },
          ]}
          value={entryMode}
          onChange={(v) => setEntryMode(v as 'schedule' | 'signal')}
        />
      </div>
      {entryMode === 'signal' ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-[16rem_repeat(4,minmax(0,8rem))]">
          <Field label="Signal">
            <Select
              value={signalId}
              onValueChange={(v) => {
                setSignalId(v as IndicatorSignalId)
                setSignalParams({ ...(indicatorSignal(v)?.defaults ?? {}) })
              }}
            >
              <SelectTrigger className="h-8 text-dense-body" aria-label="Signal">
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
          </Field>
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
          <NumField
            id="sim-offset"
            label="Enter at (sessions after)"
            value={offset}
            onChange={setOffset}
            min={0}
            max={10}
          />
          <label className="flex items-center gap-2 self-end pb-1.5 text-dense-caption">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
            />
            Compare with the schedule
          </label>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <NumField
          id="sim-dte"
          label="Target DTE"
          value={targetDte}
          onChange={setTargetDte}
          min={7}
          max={80}
        />
        <NumField
          id="sim-delta"
          label="Short Δ"
          value={shortDelta}
          onChange={setShortDelta}
          min={0.05}
          max={0.5}
          step={0.01}
        />
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
          label={entryMode === 'signal' ? 'Schedule baseline: every (sessions)' : 'Open every (sessions)'}
          value={every}
          onChange={setEvery}
          min={1}
          max={60}
        />
        <NumField
          id="sim-maxopen"
          label="Max open per symbol"
          value={maxOpen}
          onChange={setMaxOpen}
          min={1}
          max={20}
        />
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
        <NumField
          id="sim-stop"
          label="Stop (× credit)"
          value={stopMult}
          onChange={setStopMult}
          min={0}
          max={20}
          step={0.5}
        />
        <NumField
          id="sim-dteexit"
          label="Close at DTE"
          value={dteExit}
          onChange={setDteExit}
          min={0}
          max={80}
        />
        <Field label="Fill price">
          <SegmentControl
            options={[
              { value: 'vwap', label: 'VWAP' },
              { value: 'close', label: 'Close' },
            ]}
            value={priceField}
            onChange={(v) => setPriceField(v as 'vwap' | 'close')}
          />
        </Field>
        <NumField
          id="sim-slip"
          label="Slippage (× tier)"
          value={slip}
          onChange={setSlip}
          min={0}
          max={10}
          step={0.25}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          onClick={() => {
            baselineMutation.reset()
            mutation.mutate(input(true), {
              onSuccess: (res) => {
                if (entryMode !== 'signal' || !compare) {
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
          disabled={pending || symbols.length === 0 || tooMany}
        >
          <Play className="h-3.5 w-3.5" />
          {mutation.isPending
            ? 'Simulating…'
            : baselineMutation.isPending
              ? 'Running the schedule baseline…'
              : 'Run simulation'}
        </Button>
        <span className="text-dense-caption text-muted-foreground">
          {tooMany
            ? 'At most 10 symbols per run.'
            : 'Fills are modelled: option_daily has no bid/ask, so the price is VWAP or close plus a tiered slippage.'}
        </span>
      </div>
      {failed ? (
        firstResearchAuthGapError(failed.error) ? (
          <ResearchAuthGap error={failed.error} layout="banner" />
        ) : (
          <ViewState
            kind="failed"
            layout="strip"
            title={
              failed === mutation
                ? 'The simulation did not run'
                : 'The schedule baseline did not run'
            }
            detail={failed.error instanceof Error ? failed.error.message : String(failed.error)}
          />
        )
      ) : null}
    </section>
  )
}

/**
 * Signal entry next to the schedule it replaces, same structure, symbols,
 * window and management — the only difference is when positions open.
 */
function EntryComparison({ signal, baseline }: { signal: SimResponse; baseline: SimResponse }) {
  const a = signal.summary
  const b = baseline.summary
  const rule = (a as SimSummary & { entry_rule?: Record<string, unknown> }).entry_rule
  const ev = (rule?.event_def as { params?: Record<string, unknown> } | undefined)?.params ?? {}
  const sigLabel = signalShortLabel(String(ev.signal ?? ''), ev)
  const rows: Array<{ k: string; a: string; b: string; diff?: number | null; money?: boolean }> = [
    { k: 'Trades', a: String(a.n_trades), b: String(b.n_trades) },
    { k: 'Win rate', a: pct(a.win_rate), b: pct(b.win_rate), diff: a.win_rate - b.win_rate },
    { k: 'Avg / trade', a: usd(a.avg_pnl), b: usd(b.avg_pnl), diff: a.avg_pnl - b.avg_pnl, money: true },
    { k: 'Total P&L', a: usd(a.total_pnl), b: usd(b.total_pnl), diff: a.total_pnl - b.total_pnl, money: true },
    { k: 'Worst trade', a: usd(a.worst_trade), b: usd(b.worst_trade), diff: a.worst_trade - b.worst_trade, money: true },
    { k: 'Max drawdown', a: usd(a.max_drawdown), b: usd(b.max_drawdown) },
    { k: 'Sharpe', a: a.sharpe_annual?.toFixed(2) ?? '—', b: b.sharpe_annual?.toFixed(2) ?? '—', diff: (a.sharpe_annual ?? 0) - (b.sharpe_annual ?? 0) },
  ]
  return (
    <section className={panel}>
      <header className={panelHead}>
        <span className="text-dense-body font-semibold">Signal entry vs schedule</span>
        <DenseTag size="cell" variant="neutral">
          {sigLabel}
          {rule?.offset_sessions != null ? ` · +${String(rule.offset_sessions)}` : ''}
        </DenseTag>
        <span className="ml-auto text-dense-caption text-muted-foreground">
          {rule?.events != null ? `${String(rule.events)} signals · ` : ''}same structure, window and exits
        </span>
      </header>
      <table className="w-full">
        <thead>
          <tr>
            <th className={cn(th, 'text-left')}>Reading</th>
            <th className={th}>Signal</th>
            <th className={th}>Schedule</th>
            <th className={th}>Difference</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.k}>
              <td className={cn(td, 'text-left font-sans')}>{r.k}</td>
              <td className={td}>{r.a}</td>
              <td className={cn(td, 'text-muted-foreground')}>{r.b}</td>
              <td className={cn(td, r.diff != null ? pnlColorClass(r.diff) : '')}>
                {r.diff == null || !Number.isFinite(r.diff)
                  ? ''
                  : r.money
                    ? `${r.diff >= 0 ? '+' : ''}${usd(r.diff)}`
                    : r.k === 'Win rate'
                      ? `${r.diff >= 0 ? '+' : ''}${(r.diff * 100).toFixed(0)} pt`
                      : `${r.diff >= 0 ? '+' : ''}${r.diff.toFixed(2)}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {a.sample_note !== 'ok' ? (
        <p className="m-0 border-t border-border px-3 py-1.5 text-dense-caption text-warning">
          The signal run has {a.n_trades} trades ({a.sample_note}); read the difference as a lead, not a result.
        </p>
      ) : null}
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
  detailState,
  detailError,
  onRetryDetail,
}: {
  summary: Partial<SimSummary>
  trades: SimTrade[]
  equity: SimEquityPoint[]
  row: BacktestRunRow | null
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
        <Tile label="Win rate" value={pct(summary.win_rate)} />
        <Tile
          label="Total P&L"
          value={usd(summary.total_pnl)}
          cls={pnlColorClass(summary.total_pnl)}
        />
        <Tile
          label="Avg / trade"
          value={usd(summary.avg_pnl)}
          cls={pnlColorClass(summary.avg_pnl)}
          note={ci ? `95% CI ${usd(ci[0])} to ${usd(ci[1])}` : 'too few trades for an interval'}
        />
        <Tile
          label="Worst trade"
          value={usd(summary.worst_trade)}
          cls={pnlColorClass(summary.worst_trade)}
        />
        <Tile
          label="Max drawdown"
          value={usd(summary.max_drawdown)}
          note={pct(summary.max_drawdown_pct, 1) + ' of capital'}
        />
        <Tile
          label="Sharpe"
          value={summary.sharpe_annual != null ? summary.sharpe_annual.toFixed(2) : '—'}
          note="daily equity, annualised"
        />
        <Tile
          label="On peak margin"
          value={pct(summary.return_on_peak_margin, 1)}
          note={`peak ${usd(summary.peak_margin)}`}
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
              entries skipped: {skipped.map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`).join(' · ')}
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
          <TradesTable trades={trades} />
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
        <span className={pnlColorClass(c.pnl[n - 1])}>{usd(c.pnl[n - 1])}</span>
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

function TradesTable({ trades }: { trades: SimTrade[] }) {
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
              <td className={cn(td, 'text-left font-bold text-entity-symbol')}>{t.symbol}</td>
              <td className={cn(td, 'text-left text-muted-foreground')}>{t.entry_date}</td>
              <td className={cn(td, 'text-left text-muted-foreground')}>{t.exit_date}</td>
              <td className={cn(td, 'text-left')}>
                {legsLabel(t.legs)}
                <span className="ml-1.5 text-muted-foreground">{tradeExpiry(t) ?? ''}</span>
              </td>
              <td className={td}>{usd(t.entry_credit)}</td>
              <td className={cn(td, pnlColorClass(t.pnl))}>{usd(t.pnl)}</td>
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
