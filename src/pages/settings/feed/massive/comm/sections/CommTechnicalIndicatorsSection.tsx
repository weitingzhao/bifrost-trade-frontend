import { useCallback, useMemo, useState } from 'react'
import { SegmentControl } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MassiveServicePanel } from '@/pages/settings/feed/massive/components/MassiveServicePanel'
import { fetchTechnicalIndicator, type TechnicalIndicatorResponse } from '@/api/massive/commFeed'
import { feedMassiveCommonSvcAnchorId } from '@/pages/settings/feed/massive/nav/anchors'
import {
  TI_DOC_PAGE_LABEL,
  TI_SEGMENT_OPTS,
  type TiSubTabKey,
} from '@/pages/settings/feed/massive/comm/commTiMoConstants'
import type { ChecklistRow, EffectiveServiceStatus } from '@/pages/settings/feed/massive/checklist/types'

function TiTabDoc({ sub }: { sub: TiSubTabKey }) {
  if (sub === 'sma') {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Use case:</strong> Compute Simple Moving Average over a custom window for
          any ticker. Works with option tickers (<code className="font-mono text-xs">O:</code> prefix) and stock/index
          tickers.
        </p>
        <p className="text-xs">
          <strong className="text-foreground">Option applicability:</strong> Directly supported for option tickers.
        </p>
        <p className="font-mono text-xs">REST: GET /v1/indicators/sma/&#123;ticker&#125;</p>
      </div>
    )
  }
  if (sub === 'ema') {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Use case:</strong> Exponential Moving Average weights recent prices more
          heavily than SMA.
        </p>
        <p className="font-mono text-xs">REST: GET /v1/indicators/ema/&#123;ticker&#125;</p>
      </div>
    )
  }
  if (sub === 'rsi') {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Use case:</strong> RSI on a 0–100 scale; above 70 overbought, below 30
          oversold.
        </p>
        <p className="font-mono text-xs">REST: GET /v1/indicators/rsi/&#123;ticker&#125;</p>
      </div>
    )
  }
  return (
    <div className="space-y-2 text-sm text-muted-foreground">
      <p>
        <strong className="text-foreground">Use case:</strong> MACD tracks two EMAs; customizable short/long/signal
        windows.
      </p>
      <p className="font-mono text-xs">REST: GET /v1/indicators/macd/&#123;ticker&#125;</p>
    </div>
  )
}

export function CommTechnicalIndicatorsSection({
  row,
  effectiveStatus,
  expanded,
  highlighted,
  onToggle,
  configured,
}: {
  row: ChecklistRow
  effectiveStatus: EffectiveServiceStatus
  expanded: boolean
  highlighted?: boolean
  onToggle: () => void
  configured: boolean
}) {
  const [sub, setSub] = useState<TiSubTabKey>('sma')
  const [ticker, setTicker] = useState('O:SPY251219C00600000')
  const [window, setWindow] = useState('14')
  const [timespan, setTimespan] = useState('day')
  const [seriesType, setSeriesType] = useState('close')
  const [limit, setLimit] = useState('50')
  const [macdShort, setMacdShort] = useState('12')
  const [macdLong, setMacdLong] = useState('26')
  const [macdSignal, setMacdSignal] = useState('9')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<TechnicalIndicatorResponse | null>(null)

  const evidence = useMemo(() => {
    if (result?.ok && result.count != null) {
      return `${TI_DOC_PAGE_LABEL[sub]} — ${result.ticker}: ${result.count} data point(s).`
    }
    return 'No indicator data loaded. Select a tab and fetch.'
  }, [result, sub])

  const runFetch = useCallback(async () => {
    setBusy(true)
    setErr(null)
    setResult(null)
    try {
      const p: Parameters<typeof fetchTechnicalIndicator>[0] = {
        ticker: ticker.trim(),
        indicator: sub,
        timespan,
        series_type: seriesType,
        limit: Number(limit) || 50,
      }
      if (sub === 'macd') {
        p.short_window = Number(macdShort) || 12
        p.long_window = Number(macdLong) || 26
        p.signal_window = Number(macdSignal) || 9
      } else {
        p.window = Number(window) || 14
      }
      const res = await fetchTechnicalIndicator(p)
      if (!res.ok) {
        setErr(res.error ?? 'Failed')
        return
      }
      setResult(res)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }, [ticker, sub, timespan, seriesType, limit, window, macdShort, macdLong, macdSignal])

  const values = result?.ok ? (result.results?.values as Record<string, unknown>[] | undefined) : undefined

  return (
    <MassiveServicePanel
      row={row}
      effectiveStatus={effectiveStatus}
      expanded={expanded}
      highlighted={highlighted}
      onToggle={onToggle}
      anchorId={feedMassiveCommonSvcAnchorId(row.id)}
      evidence={<span>{evidence}</span>}
    >
      <p className="text-sm text-muted-foreground">{row.description}</p>
      <SegmentControl
        ariaLabel="Technical Indicators REST DocPage rows"
        options={TI_SEGMENT_OPTS}
        value={sub}
        onChange={v => setSub(v as TiSubTabKey)}
        className="mb-3"
      />
      <TiTabDoc sub={sub} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl">
        <div className="space-y-1 sm:col-span-2">
          <Label>Ticker</Label>
          <Input
            value={ticker}
            onChange={e => setTicker(e.target.value)}
            disabled={busy || !configured}
            placeholder="O:SPY251219C00600000 or AAPL"
            autoComplete="off"
          />
        </div>
        {sub === 'macd' ? (
          <>
            <div className="space-y-1">
              <Label>Short window</Label>
              <Input type="number" min={1} value={macdShort} onChange={e => setMacdShort(e.target.value)} disabled={busy} />
            </div>
            <div className="space-y-1">
              <Label>Long window</Label>
              <Input type="number" min={1} value={macdLong} onChange={e => setMacdLong(e.target.value)} disabled={busy} />
            </div>
            <div className="space-y-1">
              <Label>Signal window</Label>
              <Input type="number" min={1} value={macdSignal} onChange={e => setMacdSignal(e.target.value)} disabled={busy} />
            </div>
          </>
        ) : (
          <div className="space-y-1">
            <Label>Window</Label>
            <Input type="number" min={1} max={500} value={window} onChange={e => setWindow(e.target.value)} disabled={busy} />
          </div>
        )}
        <div className="space-y-1">
          <Label>Timespan</Label>
          <Select value={timespan} onValueChange={setTimespan} disabled={busy}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minute">Minute</SelectItem>
              <SelectItem value="hour">Hour</SelectItem>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Series type</Label>
          <Select value={seriesType} onValueChange={setSeriesType} disabled={busy}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="close">Close</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Limit</Label>
          <Input type="number" min={1} max={5000} value={limit} onChange={e => setLimit(e.target.value)} disabled={busy} />
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-3"
        disabled={busy || !configured || !ticker.trim()}
        onClick={() => void runFetch()}
      >
        {busy ? 'Loading…' : `Fetch ${TI_DOC_PAGE_LABEL[sub]}`}
      </Button>
      {err ? <p className="mt-3 text-sm text-destructive">{err}</p> : null}
      {values && values.length > 0 ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{result?.count}</strong> data point(s) for{' '}
            <strong className="text-foreground">{result?.ticker}</strong>
          </p>
          <div className="max-h-80 overflow-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium">Timestamp</th>
                  {sub === 'macd' ? (
                    <>
                      <th className="px-2 py-1.5 text-left font-medium">Value</th>
                      <th className="px-2 py-1.5 text-left font-medium">Signal</th>
                      <th className="px-2 py-1.5 text-left font-medium">Histogram</th>
                    </>
                  ) : (
                    <th className="px-2 py-1.5 text-left font-medium">Value</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {values.map((v, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="px-2 py-1">{String(v.timestamp ?? '')}</td>
                    {sub === 'macd' ? (
                      <>
                        <td className="px-2 py-1">{v.value != null ? Number(v.value).toFixed(4) : '—'}</td>
                        <td className="px-2 py-1">{v.signal != null ? Number(v.signal).toFixed(4) : '—'}</td>
                        <td className="px-2 py-1">{v.histogram != null ? Number(v.histogram).toFixed(4) : '—'}</td>
                      </>
                    ) : (
                      <td className="px-2 py-1">{v.value != null ? Number(v.value).toFixed(4) : '—'}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </MassiveServicePanel>
  )
}
