import { useState, useEffect, useMemo } from 'react'
import { Play, Download, ChevronDown, ChevronRight, Bookmark } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { OpportunityFormModal } from '@/components/strategy/OpportunityFormModal'
import type { PrefillData } from '@/components/strategy/OpportunityFormModal'
import { useOptionScreener } from '@/hooks/useOptionScreener'
import type { ScreenerFilters, ScreenerContractRow, ScreenerSymbolGroup } from '@/types/research'
import { pnlColorClass } from '@/utils/dailyChange'

const STRUCTURE_TYPES = [
  { value: 'cash_secured_put', label: 'Cash Secured Put' },
  { value: 'covered_call', label: 'Covered Call' },
  { value: 'bull_put_spread', label: 'Bull Put Spread' },
  { value: 'bear_call_spread', label: 'Bear Call Spread' },
]

const STRUCTURE_LABEL: Record<string, string> = Object.fromEntries(
  STRUCTURE_TYPES.map(({ value, label }) => [value, label]),
)

const DEFAULT_FILTERS: ScreenerFilters = {
  structure_type: 'cash_secured_put',
  symbols: [],
  dte_min: 14,
  dte_max: 45,
  max_prob_itm: 0.3,
  min_annualized_return: null,
  max_spread_pct: null,
  min_premium: null,
  include_earnings_span: false,
  source: 'massive',
}

function loadSavedFilters(): ScreenerFilters {
  try {
    const raw = localStorage.getItem('optionScreenerFilters')
    return raw ? (JSON.parse(raw) as ScreenerFilters) : DEFAULT_FILTERS
  } catch {
    return DEFAULT_FILTERS
  }
}

function ratingClass(r: string): string {
  if (r === 'A') return cn(pnlColorClass(1), 'font-semibold')
  if (r === 'B') return 'text-sky-600 dark:text-sky-400 font-semibold'
  if (r === 'C') return 'text-warning font-semibold'
  return cn(pnlColorClass(-1), 'font-semibold')
}

function riskClass(r: string): string {
  if (r === 'low') return 'bg-muted text-muted-foreground'
  if (r === 'medium') return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
  return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
}

function fmtPct(v: number | null | undefined): string {
  return v != null ? `${(v * 100).toFixed(1)}%` : '—'
}

function fmtPrice(v: number | null | undefined): string {
  return v != null ? `$${v.toFixed(2)}` : '—'
}

function fmtGreek(v: number | null | undefined): string {
  return v != null ? v.toFixed(3) : '—'
}

function exportCsv(groups: ScreenerSymbolGroup[], structureType: string): void {
  const header = [
    'symbol', 'strike', 'right', 'expiry', 'dte',
    'rating', 'risk', 'score', 'iv', 'premium', 'prob_itm',
    'bid', 'ask', 'mid', 'spread_pct', 'oi',
    'delta', 'gamma', 'theta', 'vega',
  ]
  const rows = groups.flatMap((g) =>
    g.contracts.map((c) => [
      g.symbol, c.strike, c.right, c.expiry, c.dte,
      c.rating, c.risk, c.score,
      c.iv != null ? (c.iv * 100).toFixed(2) : '',
      c.premium != null ? c.premium.toFixed(2) : '',
      c.prob_itm != null ? (c.prob_itm * 100).toFixed(1) : '',
      c.bid ?? '', c.ask ?? '', c.mid ?? '',
      c.spread_pct != null ? (c.spread_pct * 100).toFixed(2) : '',
      c.oi ?? '',
      c.delta ?? '', c.gamma ?? '', c.theta ?? '', c.vega ?? '',
    ]),
  )
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `screener_${structureType}_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function NumInput({
  label, value, onChange, placeholder,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  placeholder?: string
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        step="any"
        className="h-7 text-xs"
        placeholder={placeholder ?? '—'}
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value === '' ? null : parseFloat(e.target.value)
          onChange(Number.isNaN(v ?? 0) ? null : v)
        }}
      />
    </div>
  )
}

interface ContractRowProps {
  contract: ScreenerContractRow
  symbol: string
  onSave: () => void
}

function ContractRow({ contract: c, symbol, onSave }: ContractRowProps) {
  return (
    <tr className="border-b border-border/40 hover:bg-muted/20 text-xs font-mono">
      <td className="py-1 px-2 tabular-nums">{c.strike.toFixed(0)}</td>
      <td className="py-1 px-2">{c.right}</td>
      <td className="py-1 px-2 text-muted-foreground">{c.expiry}</td>
      <td className="py-1 px-2 tabular-nums">{c.dte}d</td>
      <td className="py-1 px-2">
        <span className={ratingClass(c.rating)}>{c.rating}</span>
      </td>
      <td className="py-1 px-2">
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded', riskClass(c.risk))}>
          {c.risk}
        </span>
      </td>
      <td className="py-1 px-2">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-12 rounded bg-muted overflow-hidden">
            <div className="h-full rounded bg-primary" style={{ width: `${c.score}%` }} />
          </div>
          <span className="text-muted-foreground">{c.score}</span>
        </div>
      </td>
      <td className="py-1 px-2 tabular-nums">{fmtPct(c.iv)}</td>
      <td className="py-1 px-2 tabular-nums">{fmtPrice(c.premium)}</td>
      <td className="py-1 px-2 tabular-nums">{fmtPct(c.prob_itm)}</td>
      <td className="py-1 px-2 tabular-nums text-muted-foreground">{fmtGreek(c.delta)}</td>
      <td className="py-1 px-2 tabular-nums text-muted-foreground">{fmtGreek(c.gamma)}</td>
      <td className="py-1 px-2 tabular-nums text-muted-foreground">{fmtGreek(c.theta)}</td>
      <td className="py-1 px-2 tabular-nums text-muted-foreground">{fmtGreek(c.vega)}</td>
      <td className="py-1 px-2 tabular-nums text-muted-foreground">{fmtPct(c.spread_pct)}</td>
      <td className="py-1 px-2 tabular-nums text-muted-foreground">
        {c.oi != null ? c.oi.toLocaleString() : '—'}
      </td>
      <td className="py-1 px-2">
        <button
          type="button"
          title={`Save ${symbol} as opportunity`}
          onClick={onSave}
          className="opacity-40 hover:opacity-100 transition-opacity"
        >
          <Bookmark className="h-3 w-3" />
        </button>
      </td>
    </tr>
  )
}

function SymbolGroup({
  group, expanded, onToggle, onSave,
}: {
  group: ScreenerSymbolGroup
  expanded: boolean
  onToggle: () => void
  onSave: (symbol: string) => void
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2 bg-muted/30 hover:bg-muted/50 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="font-semibold text-sm">{group.symbol}</span>
        <span className="text-xs text-muted-foreground font-mono">
          ${group.spot.toFixed(2)}
        </span>
        <span className="text-xs text-muted-foreground">
          Best: <span className={ratingClass(
            group.best_score >= 80 ? 'A' : group.best_score >= 60 ? 'B' : group.best_score >= 40 ? 'C' : 'D'
          )}>{group.best_score}</span>
        </span>
        <span className="text-xs text-muted-foreground">
          IV: {fmtPct(group.avg_iv)}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {group.contracts.length} contracts
        </span>
      </button>

      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border text-left">
                <th className="py-1 px-2 font-medium">Strike</th>
                <th className="py-1 px-2 font-medium">P/C</th>
                <th className="py-1 px-2 font-medium">Expiry</th>
                <th className="py-1 px-2 font-medium">DTE</th>
                <th className="py-1 px-2 font-medium">Rating</th>
                <th className="py-1 px-2 font-medium">Risk</th>
                <th className="py-1 px-2 font-medium">Score</th>
                <th className="py-1 px-2 font-medium">IV</th>
                <th className="py-1 px-2 font-medium">Premium</th>
                <th className="py-1 px-2 font-medium">P(ITM)</th>
                <th className="py-1 px-2 font-medium">Δ</th>
                <th className="py-1 px-2 font-medium">Γ</th>
                <th className="py-1 px-2 font-medium">θ</th>
                <th className="py-1 px-2 font-medium">ν</th>
                <th className="py-1 px-2 font-medium">Spread%</th>
                <th className="py-1 px-2 font-medium">OI</th>
                <th className="py-1 px-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {group.contracts.map((c, i) => (
                <ContractRow
                  key={`${c.strike}-${c.right}-${c.expiry}-${i}`}
                  contract={c}
                  symbol={group.symbol}
                  onSave={() => onSave(group.symbol)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function ScreenerPage() {
  const [filters, setFilters] = useState<ScreenerFilters>(loadSavedFilters)
  const [symbolsText, setSymbolsText] = useState(() => filters.symbols.join('\n'))
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [saveSymbol, setSaveSymbol] = useState<string | null>(null)

  const mutation = useOptionScreener()

  useEffect(() => {
    localStorage.setItem('optionScreenerFilters', JSON.stringify(filters))
  }, [filters])

  function handleRun() {
    const symbols = symbolsText
      .split(/[\n,\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
    const f = { ...filters, symbols }
    setFilters(f)
    mutation.mutate(f)
    setExpandedGroups(new Set(symbols))
  }

  function toggleGroup(symbol: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(symbol)) next.delete(symbol)
      else next.add(symbol)
      return next
    })
  }

  const groups = mutation.data?.groups ?? []

  const warnings = useMemo(() => {
    const w = mutation.data?.warnings ?? {}
    return Object.entries(w)
  }, [mutation.data])

  const prefillData: PrefillData | undefined = saveSymbol != null ? {
    name: `${saveSymbol} ${STRUCTURE_LABEL[filters.structure_type] ?? filters.structure_type}`,
    structureId: '',
    gateSafetyId: '',
    scopeType: 'explicit_symbols',
    symbols: [saveSymbol],
    conditions: [],
  } : undefined

  return (
    <PageShell className="space-y-4">
      <PageHeader
        title="Option Screener"
        description="Screen options contracts by structure type and filters"
      />

      {/* Filter Panel */}
      <div className="border border-border rounded-lg p-4 space-y-4 bg-secondary">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <Label className="text-xs">Structure Type</Label>
            <Select
              value={filters.structure_type}
              onValueChange={(v) => setFilters((f) => ({ ...f, structure_type: v }))}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STRUCTURE_TYPES.map(({ value, label }) => (
                  <SelectItem key={value} value={value} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <NumInput
            label="DTE Min"
            value={filters.dte_min}
            onChange={(v) => setFilters((f) => ({ ...f, dte_min: v }))}
            placeholder="14"
          />
          <NumInput
            label="DTE Max"
            value={filters.dte_max}
            onChange={(v) => setFilters((f) => ({ ...f, dte_max: v }))}
            placeholder="45"
          />
          <NumInput
            label="Max P(ITM) (0–1)"
            value={filters.max_prob_itm}
            onChange={(v) => setFilters((f) => ({ ...f, max_prob_itm: v }))}
            placeholder="0.30"
          />
          <NumInput
            label="Min Ann. Return (0–1)"
            value={filters.min_annualized_return}
            onChange={(v) => setFilters((f) => ({ ...f, min_annualized_return: v }))}
          />
          <NumInput
            label="Max Spread % (0–1)"
            value={filters.max_spread_pct}
            onChange={(v) => setFilters((f) => ({ ...f, max_spread_pct: v }))}
          />
          <NumInput
            label="Min Premium ($)"
            value={filters.min_premium}
            onChange={(v) => setFilters((f) => ({ ...f, min_premium: v }))}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Symbols (comma or newline separated)</Label>
          <textarea
            className="w-full min-h-[72px] resize-y rounded-md border border-input bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="AAPL&#10;MSFT&#10;NVDA"
            value={symbolsText}
            onChange={(e) => setSymbolsText(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-border"
              checked={filters.include_earnings_span}
              onChange={(e) => setFilters((f) => ({ ...f, include_earnings_span: e.target.checked }))}
            />
            <span className="text-xs text-muted-foreground">Include earnings span</span>
          </label>

          <Button
            size="sm"
            onClick={handleRun}
            disabled={mutation.isPending}
            className="ml-auto"
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            {mutation.isPending ? 'Scanning…' : 'Run Screener'}
          </Button>
        </div>
      </div>

      {mutation.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {mutation.error instanceof Error && mutation.error.name === 'AbortError'
              ? 'Request timed out after 60 seconds.'
              : (mutation.error as Error).message}
          </AlertDescription>
        </Alert>
      )}

      {mutation.data && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {mutation.data.total_contracts} contracts across{' '}
            {mutation.data.symbols_scanned.length} symbols
            {mutation.data.symbols_failed.length > 0 && (
              <span className="ml-2 text-red-500">
                Failed: {mutation.data.symbols_failed.join(', ')}
              </span>
            )}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(groups, filters.structure_type)}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-md border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-3 space-y-0.5">
          {warnings.map(([sym, msg]) => (
            <p key={sym} className="text-xs text-yellow-700 dark:text-yellow-300">
              <span className="font-mono font-medium">{sym}</span>: {msg}
            </p>
          ))}
        </div>
      )}

      {groups.length > 0 && (
        <div className="space-y-2">
          {groups.map((g) => (
            <SymbolGroup
              key={g.symbol}
              group={g}
              expanded={expandedGroups.has(g.symbol)}
              onToggle={() => toggleGroup(g.symbol)}
              onSave={setSaveSymbol}
            />
          ))}
        </div>
      )}

      <OpportunityFormModal
        key={saveSymbol ?? 'screener-save'}
        open={saveSymbol != null}
        onOpenChange={(v) => { if (!v) setSaveSymbol(null) }}
        prefill={prefillData}
      />
    </PageShell>
  )
}
