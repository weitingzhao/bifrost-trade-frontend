import { useMemo, useRef, useState } from 'react'
import { PageHeader, PageShell } from '@/components/layout'
import { SegmentControl } from '@/components/data-display'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useGreeksAvailableDates, useGreeksLoad } from '@/hooks/useGreeksHistory'
import type { GreeksResponse, GreeksRow } from '@/types/research'
import { GreeksCalcTooltip } from './greeks/GreeksCalcTooltip'
import { GreeksHistoryTable } from './greeks/GreeksHistoryTable'
import {
  greeksControlsInnerClass,
  greeksEmptyHintClass,
  greeksFieldLabelClass,
  greeksInfoApproxClass,
  greeksInfoBarClass,
  greeksInfoLabelClass,
  greeksLoadingHintClass,
} from './greeks/greeksUi'

const DEFAULT_SYMBOL = 'NVDA'
const DEFAULT_RFR = 0.045

export default function GreeksPage() {
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL)
  const [symbolInput, setSymbolInput] = useState(DEFAULT_SYMBOL)
  const [tradeDate, setTradeDate] = useState('')
  const [riskFreeRate, setRiskFreeRate] = useState(DEFAULT_RFR)
  const [rightFilter, setRightFilter] = useState<'ALL' | 'C' | 'P'>('ALL')
  const [result, setResult] = useState<GreeksResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [hoveredRow, setHoveredRow] = useState<GreeksRow | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: availableDates = [], isLoading: datesLoading } = useGreeksAvailableDates(symbol)
  const loadMutation = useGreeksLoad()

  const resolvedTradeDate = useMemo(() => {
    if (tradeDate && availableDates.includes(tradeDate)) return tradeDate
    return availableDates[0] ?? ''
  }, [tradeDate, availableDates])

  function commitSymbol(next?: string) {
    const s = (next ?? symbolInput).trim().toUpperCase()
    if (!s || s === symbol) return
    setSymbolInput(s)
    setSymbol(s)
    setTradeDate('')
    setResult(null)
    setLoadError(null)
  }

  function handleLoad() {
    if (!symbol || !resolvedTradeDate) return
    setLoadError(null)
    setResult(null)

    const params = {
      symbol,
      trade_date: resolvedTradeDate,
      risk_free_rate: riskFreeRate,
      limit: 1000,
      ...(rightFilter !== 'ALL' ? { right: rightFilter } : {}),
    }

    loadMutation.mutate(params, {
      onSuccess: (res) => {
        if (!res.ok) {
          setLoadError(res.error ?? 'Request failed')
          return
        }
        setResult(res)
      },
      onError: (err) => {
        setLoadError(err instanceof Error ? err.message : 'fetch failed')
      },
    })
  }

  function handleRowHover(row: GreeksRow | null, e: React.MouseEvent | null) {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
    if (row == null || e == null) {
      tooltipTimerRef.current = setTimeout(() => setHoveredRow(null), 80)
      return
    }
    setTooltipPos({ x: e.clientX, y: e.clientY })
    setHoveredRow(row)
  }

  const loading = loadMutation.isPending

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="IV & Greeks"
        description="Historical option greeks from the research API: pick symbol and trade date, then fetch chain rows."
      />

      <Card variant="elevated">
        <CardContent className="p-4">
          <div className={greeksControlsInnerClass}>
            <form
              className="space-y-1"
              onSubmit={(e) => {
                e.preventDefault()
                commitSymbol()
              }}
            >
              <Label htmlFor="greeks-symbol" className={greeksFieldLabelClass}>Symbol</Label>
              <Input
                id="greeks-symbol"
                className="h-8 w-[5.5rem] font-mono uppercase text-xs"
                value={symbolInput}
                onChange={e => setSymbolInput(e.target.value.toUpperCase())}
                onBlur={() => commitSymbol()}
                placeholder="NVDA"
              />
            </form>

            <div className="space-y-1 min-w-[10rem]">
              <Label htmlFor="greeks-date" className={greeksFieldLabelClass}>
                Trade Date
                {datesLoading && <span className="ml-1 normal-case tracking-normal">…</span>}
              </Label>
              <Select
                value={resolvedTradeDate || undefined}
                onValueChange={setTradeDate}
                disabled={availableDates.length === 0}
              >
                <SelectTrigger id="greeks-date" className="h-8 text-xs font-mono">
                  <SelectValue placeholder={availableDates.length === 0 ? '— no data —' : 'Select date'} />
                </SelectTrigger>
                <SelectContent>
                  {availableDates.map(d => (
                    <SelectItem key={d} value={d} className="text-xs font-mono">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="greeks-rfr" className={greeksFieldLabelClass}>Risk-free Rate</Label>
              <Input
                id="greeks-rfr"
                type="number"
                className="h-8 w-20 text-xs font-mono tabular-nums"
                value={riskFreeRate}
                onChange={e => setRiskFreeRate(Number(e.target.value))}
                min={0.001}
                max={0.2}
                step={0.001}
              />
            </div>

            <div className="space-y-1">
              <span className={greeksFieldLabelClass}>C / P</span>
              <SegmentControl
                ariaLabel="Call or put filter"
                value={rightFilter}
                onChange={v => setRightFilter(v as 'ALL' | 'C' | 'P')}
                options={[
                  { value: 'ALL', label: 'All' },
                  { value: 'C', label: 'C' },
                  { value: 'P', label: 'P' },
                ]}
              />
            </div>

            <Button
              type="button"
              size="sm"
              className="h-8"
              onClick={handleLoad}
              disabled={loading || !symbol || !resolvedTradeDate}
            >
              {loading ? 'Loading…' : 'Load'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card variant="elevated">
          <CardContent className={greeksInfoBarClass}>
            <span>
              <span className={greeksInfoLabelClass}>Symbol</span>
              <strong className="font-mono">{result.symbol}</strong>
            </span>
            <span>
              <span className={greeksInfoLabelClass}>Trade Date</span>
              <strong className="font-mono">{result.trade_date}</strong>
            </span>
            {result.stock_price != null && (
              <span>
                <span className={greeksInfoLabelClass}>Stock Price</span>
                <strong className="font-mono">${result.stock_price.toFixed(2)}</strong>
              </span>
            )}
            <span>
              <span className={greeksInfoLabelClass}>r</span>
              <strong className="font-mono">{(result.risk_free_rate * 100).toFixed(2)}%</strong>
            </span>
            <span>
              <span className={greeksInfoLabelClass}>Contracts</span>
              <strong className="font-mono">{result.count.toLocaleString()}</strong>
            </span>
            <span className={greeksInfoApproxClass}>
              Black-Scholes (European approximation for American options) · Hover row for BS detail
            </span>
          </CardContent>
        </Card>
      )}

      {loadError && (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <p className={greeksLoadingHintClass}>
          Computing IV & Greeks…
        </p>
      )}

      {result && result.rows.length > 0 && !loading && (
        <GreeksHistoryTable
          rows={result.rows}
          tradeDate={result.trade_date}
          onRowHover={handleRowHover}
        />
      )}

      {result && result.rows.length === 0 && !loading && (
        <p className={greeksEmptyHintClass}>
          No option data found for {result.symbol} on {result.trade_date}.
        </p>
      )}

      {hoveredRow && (
        <GreeksCalcTooltip
          row={hoveredRow}
          pos={tooltipPos}
          riskFreeRate={riskFreeRate}
        />
      )}
    </PageShell>
  )
}
