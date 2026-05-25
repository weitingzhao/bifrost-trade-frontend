import { useState, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Play, ChevronDown, ChevronRight, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { fetchSepaPhase1, fetchSepaFundamentals } from '@/api/research'
import type { SepaSymbolResult, SepaConditionResult, SepaResponse } from '@/types/research'

function SummaryBar({ summary }: { summary: SepaResponse['summary'] }) {
  const total = summary.total || 1
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border border-border text-xs">
      <span className="text-muted-foreground">Total: <strong className="text-foreground">{summary.total}</strong></span>
      <span className="text-green-600 dark:text-green-400">Passed: <strong>{summary.passed}</strong></span>
      <span className="text-red-500">Failed: <strong>{summary.failed}</strong></span>
      {summary.insufficient_data > 0 && (
        <span className="text-yellow-600 dark:text-yellow-400">
          Insufficient data: <strong>{summary.insufficient_data}</strong>
        </span>
      )}
      <div className="ml-auto flex gap-px h-2 w-32 rounded overflow-hidden">
        <div
          className="bg-green-500"
          style={{ width: `${(summary.passed / total) * 100}%` }}
        />
        <div
          className="bg-yellow-400"
          style={{ width: `${(summary.insufficient_data / total) * 100}%` }}
        />
        <div
          className="bg-red-400 flex-1"
        />
      </div>
    </div>
  )
}

function ConditionPill({ c }: { c: SepaConditionResult }) {
  if (c.pass) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-mono">
        {c.condition_id}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-mono">
      {c.condition_id}
    </span>
  )
}

function SymbolRow({ result }: { result: SepaSymbolResult }) {
  const [expanded, setExpanded] = useState(false)
  const passRate = result.pass_count + result.fail_count > 0
    ? result.pass_count / (result.pass_count + result.fail_count)
    : null

  return (
    <div className="border border-border/60 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/20 text-left"
      >
        {result.insufficient_data ? (
          <AlertCircle className="h-4 w-4 shrink-0 text-yellow-500" />
        ) : result.technical_pass ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 shrink-0 text-red-500" />
        )}

        <span className="font-mono font-semibold text-sm w-16 shrink-0">{result.symbol}</span>

        {result.insufficient_data ? (
          <span className="text-xs text-yellow-600 dark:text-yellow-400">Insufficient data</span>
        ) : (
          <span className={cn(
            'text-xs font-medium',
            result.technical_pass ? 'text-green-600 dark:text-green-400' : 'text-red-500',
          )}>
            {result.technical_pass ? 'Pass' : 'Fail'}
          </span>
        )}

        {passRate != null && (
          <span className="text-xs text-muted-foreground ml-1">
            {result.pass_count}/{result.pass_count + result.fail_count} conditions
          </span>
        )}

        <div className="ml-auto flex flex-wrap gap-0.5 max-w-xs justify-end">
          {result.conditions.slice(0, 8).map((c) => (
            <ConditionPill key={c.condition_id} c={c} />
          ))}
          {result.conditions.length > 8 && (
            <span className="text-[10px] text-muted-foreground">+{result.conditions.length - 8}</span>
          )}
        </div>

        {expanded
          ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground ml-1" />
          : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground ml-1" />}
      </button>

      {expanded && (
        <div className="border-t border-border/60 p-3 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
          <div>
            <p className="text-muted-foreground font-medium mb-1.5">Conditions</p>
            <div className="flex flex-wrap gap-1">
              {result.conditions.map((c) => (
                <span
                  key={c.condition_id}
                  title={`${c.label}: ${c.value != null ? c.value : '—'}`}
                  className={cn(
                    'inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-mono',
                    c.pass
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
                  )}
                >
                  {c.condition_id}
                  {c.value != null && <span className="opacity-70"> {c.value.toFixed(2)}</span>}
                </span>
              ))}
            </div>
          </div>
          {Object.keys(result.metrics).length > 0 && (
            <div>
              <p className="text-muted-foreground font-medium mb-1.5">Metrics</p>
              <div className="font-mono space-y-0.5">
                {Object.entries(result.metrics).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-muted-foreground w-32 shrink-0 truncate">{k}</span>
                    <span>{v != null ? v.toFixed(4) : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function WarningsPanel({ warnings }: { warnings: Record<string, string> }) {
  const [open, setOpen] = useState(false)
  const entries = Object.entries(warnings)
  if (entries.length === 0) return null
  return (
    <div className="rounded-md border border-yellow-300 dark:border-yellow-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-xs text-yellow-700 dark:text-yellow-300 text-left"
      >
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        {entries.length} warning{entries.length > 1 ? 's' : ''}
        {open ? <ChevronDown className="h-3.5 w-3.5 ml-auto" /> : <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-0.5 bg-yellow-50 dark:bg-yellow-900/10">
          {entries.map(([sym, msg]) => (
            <p key={sym} className="text-xs text-yellow-700 dark:text-yellow-300">
              <span className="font-mono font-medium">{sym}</span>: {msg}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

interface TechnicalParamProps {
  volumeThreshold: string
  onVolumeChange: (v: string) => void
  strictSma: boolean
  onStrictSmaChange: (v: boolean) => void
}

function TechnicalParams({ volumeThreshold, onVolumeChange, strictSma, onStrictSmaChange }: TechnicalParamProps) {
  return (
    <div className="flex items-end gap-3 flex-wrap">
      <div className="space-y-1">
        <Label className="text-xs">Min Avg Volume</Label>
        <Input
          type="number"
          className="h-7 text-xs w-36"
          placeholder="default"
          value={volumeThreshold}
          onChange={(e) => onVolumeChange(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 cursor-pointer mb-0.5">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-border"
          checked={strictSma}
          onChange={(e) => onStrictSmaChange(e.target.checked)}
        />
        <span className="text-xs text-muted-foreground">Strict SMA200 rising</span>
      </label>
    </div>
  )
}

interface FundamentalsParamProps {
  values: Record<string, string>
  onChange: (key: string, val: string) => void
}

const FUND_FIELDS = [
  { key: 'eps_q2q_threshold', label: 'EPS Q/Q Threshold' },
  { key: 'rev_q2q_threshold', label: 'Rev Q/Q Threshold' },
  { key: 'eps_3y_threshold', label: 'EPS 3Y Threshold' },
  { key: 'rev_3y_threshold', label: 'Rev 3Y Threshold' },
]

function FundamentalsParams({ values, onChange }: FundamentalsParamProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {FUND_FIELDS.map(({ key, label }) => (
        <div key={key} className="space-y-1">
          <Label className="text-xs">{label}</Label>
          <Input
            type="number"
            step="any"
            className="h-7 text-xs w-32"
            placeholder="default"
            value={values[key] ?? ''}
            onChange={(e) => onChange(key, e.target.value)}
          />
        </div>
      ))}
    </div>
  )
}

export default function SepaPage() {
  const [tab, setTab] = useState<'technical' | 'fundamentals'>('technical')
  const [symbolsRaw, setSymbolsRaw] = useState('')

  const [volumeThreshold, setVolumeThreshold] = useState('')
  const [strictSma, setStrictSma] = useState(false)

  const [fundParams, setFundParams] = useState<Record<string, string>>({})

  const symbols = useMemo(
    () => symbolsRaw.split(/[\n,]+/).map((s) => s.trim().toUpperCase()).filter(Boolean),
    [symbolsRaw],
  )

  const technicalMutation = useMutation({ mutationFn: fetchSepaPhase1 })
  const fundamentalsMutation = useMutation({ mutationFn: fetchSepaFundamentals })

  const activeMutation = tab === 'technical' ? technicalMutation : fundamentalsMutation

  function handleRun() {
    if (symbols.length === 0) return
    if (tab === 'technical') {
      const req = {
        symbols,
        ...(volumeThreshold ? { volume_threshold: parseFloat(volumeThreshold) } : {}),
        strict_sma200_rising: strictSma,
      }
      technicalMutation.mutate(req)
    } else {
      const parseOpt = (k: string) => fundParams[k] ? { [k]: parseFloat(fundParams[k]) } : {}
      fundamentalsMutation.mutate({
        symbols,
        ...parseOpt('eps_q2q_threshold'),
        ...parseOpt('rev_q2q_threshold'),
        ...parseOpt('eps_3y_threshold'),
        ...parseOpt('rev_3y_threshold'),
      })
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">SEPA Screener</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Four-stage SEPA analysis — Technical and Fundamentals phases
        </p>
      </div>

      {/* Tab switch */}
      <div className="flex gap-1 border-b border-border pb-1">
        {(['technical', 'fundamentals'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-t-md transition-colors capitalize',
              tab === t
                ? 'bg-muted text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t === 'technical' ? 'Technical (Phase 1)' : 'Fundamentals'}
          </button>
        ))}
      </div>

      {/* Symbols + params */}
      <div className="border border-border rounded-lg p-4 space-y-4 bg-card">
        <div className="space-y-1">
          <Label className="text-xs">Symbols (comma or newline separated)</Label>
          <textarea
            className="w-full min-h-[72px] resize-y rounded-md border border-input bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="AAPL&#10;MSFT&#10;NVDA"
            value={symbolsRaw}
            onChange={(e) => setSymbolsRaw(e.target.value)}
          />
          {symbols.length > 0 && (
            <p className="text-xs text-muted-foreground">{symbols.length} symbol{symbols.length > 1 ? 's' : ''}</p>
          )}
        </div>

        {tab === 'technical' ? (
          <TechnicalParams
            volumeThreshold={volumeThreshold}
            onVolumeChange={setVolumeThreshold}
            strictSma={strictSma}
            onStrictSmaChange={setStrictSma}
          />
        ) : (
          <FundamentalsParams
            values={fundParams}
            onChange={(k, v) => setFundParams((prev) => ({ ...prev, [k]: v }))}
          />
        )}

        <Button
          size="sm"
          onClick={handleRun}
          disabled={activeMutation.isPending || symbols.length === 0}
        >
          <Play className="h-3.5 w-3.5 mr-1.5" />
          {activeMutation.isPending ? 'Running…' : `Run ${tab === 'technical' ? 'Technical' : 'Fundamentals'}`}
        </Button>
      </div>

      {activeMutation.isError && (
        <Alert variant="destructive">
          <AlertDescription>{(activeMutation.error as Error).message}</AlertDescription>
        </Alert>
      )}

      {activeMutation.data && (
        <div className="space-y-3">
          <SummaryBar summary={activeMutation.data.summary} />
          <WarningsPanel warnings={activeMutation.data.warnings} />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>As of: {activeMutation.data.as_of_date}</span>
            <span>Rule version: {activeMutation.data.rule_version}</span>
          </div>

          <div className="space-y-1.5">
            {activeMutation.data.results.map((r) => (
              <SymbolRow key={r.symbol} result={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
