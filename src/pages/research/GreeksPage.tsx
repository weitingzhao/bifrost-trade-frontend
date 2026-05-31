import { useState, useMemo, useRef } from 'react'
import { PageHeader, PageShell } from '@/components/layout'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useGreeksAvailableDates, useGreeksHistory } from '@/hooks/useGreeksHistory'
import { bsComputeDetail, impliedVolatility } from '@/utils/blackScholes'
import type { GreeksRow } from '@/types/research'

const RISK_FREE_RATE = 0.05

function dteDays(expiration: string): number {
  const s = expiration.length === 8
    ? `${expiration.slice(0, 4)}-${expiration.slice(4, 6)}-${expiration.slice(6, 8)}`
    : expiration
  return Math.ceil((new Date(s).getTime() - Date.now()) / 86_400_000)
}

function dteBadgeClass(dte: number): string {
  if (dte < 30) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
  if (dte < 60) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
  return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
}

function f4(v: number): string { return v.toFixed(4) }
function f6(v: number): string { return v.toFixed(6) }
function fPct(v: number): string { return `${(v * 100).toFixed(2)}%` }

function BsDetailPanel({ row }: { row: GreeksRow }) {
  const local = bsComputeDetail({
    S: row.stock_price,
    K: row.strike,
    T: row.t_years,
    r: RISK_FREE_RATE,
    sigma: row.iv,
    right: row.right,
  })
  const ivSolved = impliedVolatility(
    row.stock_price, row.strike, row.t_years, RISK_FREE_RATE, row.market_price, row.right,
  )

  const cmp = [
    { label: 'IV', server: fPct(row.iv), local: fPct(ivSolved.sigma) },
    { label: 'Delta', server: f4(row.delta), local: f4(local.delta) },
    { label: 'Gamma', server: f6(row.gamma), local: f6(local.gamma) },
    { label: 'Theta', server: f4(row.theta), local: f4(local.theta) },
    { label: 'Vega', server: f4(row.vega), local: f4(local.vega) },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/20 text-xs font-mono">
      <div className="space-y-1">
        <p className="text-muted-foreground font-medium mb-1 font-sans">BS Inputs</p>
        <p>S = {row.stock_price.toFixed(2)}</p>
        <p>K = {row.strike.toFixed(2)}</p>
        <p>T = {f4(row.t_years)} yr</p>
        <p>r = {RISK_FREE_RATE * 100}%</p>
        <p>σ = {fPct(row.iv)}</p>
        <p className="mt-2 text-muted-foreground">d₁ = {f4(local.d1)}</p>
        <p className="text-muted-foreground">d₂ = {f4(local.d2)}</p>
        <p className="text-muted-foreground">N(d₁) = {f4(local.Nd1)}</p>
        {!ivSolved.converged && (
          <p className="text-yellow-500 mt-1">IV solver did not converge ({ivSolved.iterations} iter)</p>
        )}
      </div>
      <div>
        <p className="text-muted-foreground font-medium mb-1 font-sans">Server vs Local</p>
        <table className="w-full">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left pr-2 font-medium"></th>
              <th className="text-right pr-2 font-medium">Server</th>
              <th className="text-right font-medium">Local</th>
            </tr>
          </thead>
          <tbody>
            {cmp.map(({ label, server, local: loc }) => (
              <tr key={label}>
                <td className="pr-2 text-muted-foreground">{label}</td>
                <td className="text-right pr-2">{server}</td>
                <td className={cn(
                  'text-right',
                  server !== loc ? 'text-yellow-500' : 'text-muted-foreground',
                )}>
                  {loc}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ExpirationGroup({
  exp, rows, expanded, onToggle,
}: {
  exp: string
  rows: GreeksRow[]
  expanded: boolean
  onToggle: () => void
}) {
  const dte = dteDays(exp)
  const [activeKey, setActiveKey] = useState<string | null>(null)

  function rowKey(r: GreeksRow) { return `${r.strike}-${r.right}` }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2 bg-muted/30 hover:bg-muted/50 text-left"
      >
        {expanded
          ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        <span className="font-mono text-sm font-medium">{exp}</span>
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-mono', dteBadgeClass(dte))}>
          {dte}d
        </span>
        <span className="ml-auto text-xs text-muted-foreground">{rows.length} rows</span>
      </button>

      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border text-right">
                <th className="py-1 px-2 text-left font-medium">Strike</th>
                <th className="py-1 px-2 font-medium">P/C</th>
                <th className="py-1 px-2 font-medium">Spot</th>
                <th className="py-1 px-2 font-medium">Mkt Price</th>
                <th className="py-1 px-2 font-medium">IV</th>
                <th className="py-1 px-2 font-medium">Δ</th>
                <th className="py-1 px-2 font-medium">Γ</th>
                <th className="py-1 px-2 font-medium">θ</th>
                <th className="py-1 px-2 font-medium">ν</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const key = rowKey(row)
                const isActive = activeKey === key
                return (
                  <>
                    <tr
                      key={key}
                      onClick={() => setActiveKey(isActive ? null : key)}
                      className={cn(
                        'border-b border-border/40 hover:bg-muted/20 cursor-pointer font-mono',
                        isActive && 'bg-muted/30',
                      )}
                    >
                      <td className="py-1 px-2 tabular-nums">{row.strike.toFixed(2)}</td>
                      <td className="py-1 px-2 text-right tabular-nums">{row.right}</td>
                      <td className="py-1 px-2 text-right tabular-nums">{row.stock_price.toFixed(2)}</td>
                      <td className="py-1 px-2 text-right tabular-nums">{row.market_price.toFixed(2)}</td>
                      <td className="py-1 px-2 text-right tabular-nums">{fPct(row.iv)}</td>
                      <td className="py-1 px-2 text-right tabular-nums">{f4(row.delta)}</td>
                      <td className="py-1 px-2 text-right tabular-nums text-muted-foreground">{f6(row.gamma)}</td>
                      <td className="py-1 px-2 text-right tabular-nums text-muted-foreground">{f4(row.theta)}</td>
                      <td className="py-1 px-2 text-right tabular-nums text-muted-foreground">{f4(row.vega)}</td>
                    </tr>
                    {isActive && (
                      <tr key={`${key}-detail`}>
                        <td colSpan={9} className="p-0">
                          <BsDetailPanel row={row} />
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function GreeksPage() {
  const [symbolInput, setSymbolInput] = useState('')
  const [symbol, setSymbol] = useState('')
  const [tradeDate, setTradeDate] = useState('')
  const [expFilter, setExpFilter] = useState('all')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  // available-dates is a best-effort helper — retry:0 so failures don't block UI
  const { data: availDates } = useGreeksAvailableDates(symbol)

  const sortedDates = useMemo(
    () => (availDates?.length ? [...availDates].sort().reverse() : []),
    [availDates],
  )

  const expArg = expFilter === 'all' ? undefined : expFilter
  const { data, isLoading, isError, error } = useGreeksHistory(symbol, tradeDate || null, expArg)

  const groups = useMemo(() => {
    if (!data?.rows) return []
    const map = new Map<string, GreeksRow[]>()
    for (const row of data.rows) {
      const existing = map.get(row.expiration) ?? []
      existing.push(row)
      map.set(row.expiration, existing)
    }
    return Array.from(map.entries())
      .map(([exp, rows]) => ({
        exp,
        rows: rows.sort((a, b) => a.strike - b.strike || a.right.localeCompare(b.right)),
      }))
      .sort((a, b) => a.exp.localeCompare(b.exp))
  }, [data])

  function handleQuery() {
    const sym = symbolInput.trim().toUpperCase()
    if (!sym || !tradeDate) return
    setSymbol(sym)
    setExpFilter('all')
    setExpandedGroups(new Set())
  }

  function toggleGroup(exp: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(exp)) next.delete(exp)
      else next.add(exp)
      return next
    })
  }

  return (
    <PageShell className="space-y-4">
      <PageHeader
        title="IV & Greeks"
        description="View server-computed Greeks with client-side Black-Scholes validation"
        className="[&_p]:text-xs"
      />

      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1 w-28">
          <Label className="text-xs">Symbol</Label>
          <Input
            ref={inputRef}
            className="h-8 font-mono uppercase text-xs"
            placeholder="AAPL"
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') handleQuery() }}
          />
        </div>

        <div className="space-y-1 min-w-[160px]">
          <Label className="text-xs">
            Trade Date
            {sortedDates.length > 0 && (
              <span className="text-muted-foreground ml-1">({sortedDates.length} available)</span>
            )}
          </Label>
          {sortedDates.length > 0 ? (
            <Select value={tradeDate} onValueChange={setTradeDate}>
              <SelectTrigger className="h-8 text-xs font-mono">
                <SelectValue placeholder="Select date" />
              </SelectTrigger>
              <SelectContent>
                {sortedDates.map((d) => (
                  <SelectItem key={d} value={d} className="text-xs font-mono">{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              className="h-8 font-mono text-xs"
              placeholder="YYYY-MM-DD"
              value={tradeDate}
              onChange={(e) => setTradeDate(e.target.value)}
            />
          )}
        </div>

        {groups.length > 0 && (
          <div className="space-y-1 min-w-[160px]">
            <Label className="text-xs">Expiration Filter</Label>
            <Select value={expFilter} onValueChange={setExpFilter}>
              <SelectTrigger className="h-8 text-xs font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All expirations</SelectItem>
                {groups.map(({ exp }) => (
                  <SelectItem key={exp} value={exp} className="text-xs font-mono">{exp}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button
          size="sm"
          onClick={handleQuery}
          className="h-8"
          disabled={!symbolInput.trim() || !tradeDate}
        >
          <Search className="h-3.5 w-3.5 mr-1.5" />
          Query
        </Button>
      </div>

      {!tradeDate && !!symbolInput && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400">
          Enter a trade date to query Greeks
        </p>
      )}

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {!symbol && !isLoading && (
        <p className="text-sm text-muted-foreground text-center py-12">
          Enter a symbol to load Greeks data
        </p>
      )}

      {symbol && data && groups.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">
          No Greeks data available for {symbol}
        </p>
      )}

      {groups.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {symbol} — {groups.length} expirations, {data?.rows.length ?? 0} contracts
            {' '}· click row for BS detail
          </p>
          {groups.map(({ exp, rows }) => (
            <ExpirationGroup
              key={exp}
              exp={exp}
              rows={rows}
              expanded={expandedGroups.has(exp)}
              onToggle={() => toggleGroup(exp)}
            />
          ))}
        </div>
      )}
    </PageShell>
  )
}
