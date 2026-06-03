import { useState } from 'react'
import { SegmentControl } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MassiveServicePanel } from '@/pages/settings/feed/massive/components/MassiveServicePanel'
import { feedMassiveOptionSvcAnchorId } from '@/pages/settings/feed/massive/nav/anchors'
import { useMassiveSyncJob } from '@/pages/settings/feed/massive/hooks/useMassiveSyncJob'
import type { ChecklistRow, EffectiveServiceStatus } from '@/pages/settings/feed/massive/checklist/types'

type AggSub = 'custom_bars' | 'open_close' | 'prev'

const AGG_OPTS: { value: AggSub; label: string }[] = [
  { value: 'custom_bars', label: 'Custom Bars (OHLC)' },
  { value: 'open_close', label: 'Daily Ticker Summary' },
  { value: 'prev', label: 'Previous Day Bar' },
]

export function OptionAggregatesSection({
  row,
  effectiveStatus,
  expanded,
  highlighted,
  onToggle,
  configured,
  evidence,
  onJobComplete,
}: {
  row: ChecklistRow
  effectiveStatus: EffectiveServiceStatus
  expanded: boolean
  highlighted?: boolean
  onToggle: () => void
  configured: boolean
  evidence?: React.ReactNode
  onJobComplete?: () => void
}) {
  const [sub, setSub] = useState<AggSub>('custom_bars')
  const sync = useMassiveSyncJob(onJobComplete)

  const [ticker, setTicker] = useState('O:SPY251219C00600000')
  const [symbol, setSymbol] = useState('SPY')
  const [expiry, setExpiry] = useState('20251219')
  const [strike, setStrike] = useState('600')
  const [right, setRight] = useState<'C' | 'P'>('C')
  const [startMs, setStartMs] = useState('1734541200000')
  const [endMs, setEndMs] = useState('1734566400000')
  const [timespan, setTimespan] = useState('minute')
  const [multiplier, setMultiplier] = useState('1')
  const [date, setDate] = useState('2025-12-19')

  const run = () => {
    if (sub === 'custom_bars') {
      void sync.run('feed_options_aggregate', {
        options_ticker: ticker.trim(),
        symbol: symbol.trim().toUpperCase(),
        expiry: expiry.trim(),
        strike: strike.trim(),
        right,
        start_ms: parseInt(startMs, 10) || undefined,
        end_ms: parseInt(endMs, 10) || undefined,
        timespan: timespan.trim() || 'minute',
        multiplier: parseInt(multiplier, 10) || 1,
        mode: 'custom_bars',
      })
      return
    }
    if (sub === 'open_close') {
      void sync.run('feed_options_aggregate', {
        mode: 'open_close',
        options_ticker: ticker.trim(),
        date: date.trim(),
      })
      return
    }
    void sync.run('feed_options_aggregate', {
      mode: 'prev',
      options_ticker: ticker.trim(),
    })
  }

  const resultJson = sync.result ? JSON.stringify(sync.result, null, 2) : null

  return (
    <MassiveServicePanel
      row={row}
      effectiveStatus={effectiveStatus}
      expanded={expanded}
      highlighted={highlighted}
      onToggle={onToggle}
      anchorId={feedMassiveOptionSvcAnchorId(row.id)}
      evidence={evidence}
    >
      <SegmentControl ariaLabel="Aggregates sub-tabs" options={AGG_OPTS} value={sub} onChange={v => setSub(v as AggSub)} className="mb-3" />
      <div className="space-y-1 max-w-xl">
        <Label>Options ticker</Label>
        <Input value={ticker} onChange={e => setTicker(e.target.value)} disabled={!configured || sync.busy} />
      </div>
      {sub === 'custom_bars' ? (
        <div className="grid gap-3 sm:grid-cols-2 max-w-2xl mt-3">
          <div className="space-y-1">
            <Label>Symbol</Label>
            <Input value={symbol} onChange={e => setSymbol(e.target.value)} disabled={!configured || sync.busy} />
          </div>
          <div className="space-y-1">
            <Label>Expiry (YYYYMMDD)</Label>
            <Input value={expiry} onChange={e => setExpiry(e.target.value)} disabled={!configured || sync.busy} />
          </div>
          <div className="space-y-1">
            <Label>Strike</Label>
            <Input value={strike} onChange={e => setStrike(e.target.value)} disabled={!configured || sync.busy} />
          </div>
          <div className="space-y-1">
            <Label>Right</Label>
            <select
              className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={right}
              onChange={e => setRight(e.target.value as 'C' | 'P')}
              disabled={!configured || sync.busy}
            >
              <option value="C">Call</option>
              <option value="P">Put</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Start (ms)</Label>
            <Input value={startMs} onChange={e => setStartMs(e.target.value)} disabled={!configured || sync.busy} />
          </div>
          <div className="space-y-1">
            <Label>End (ms)</Label>
            <Input value={endMs} onChange={e => setEndMs(e.target.value)} disabled={!configured || sync.busy} />
          </div>
          <div className="space-y-1">
            <Label>Timespan</Label>
            <Input value={timespan} onChange={e => setTimespan(e.target.value)} disabled={!configured || sync.busy} />
          </div>
          <div className="space-y-1">
            <Label>Multiplier</Label>
            <Input value={multiplier} onChange={e => setMultiplier(e.target.value)} disabled={!configured || sync.busy} />
          </div>
        </div>
      ) : null}
      {sub === 'open_close' ? (
        <div className="space-y-1 max-w-xs mt-3">
          <Label>Date (YYYY-MM-DD)</Label>
          <Input value={date} onChange={e => setDate(e.target.value)} disabled={!configured || sync.busy} />
        </div>
      ) : null}
      <Button type="button" size="sm" className="mt-3" disabled={!configured || sync.busy} onClick={run}>
        {sync.busy ? 'Enqueueing…' : 'Enqueue'}
      </Button>
      {sync.error ? <p className="text-sm text-destructive mt-2" role="alert">{sync.error}</p> : null}
      {resultJson ? <pre className="max-h-64 overflow-auto rounded-md bg-muted/50 p-3 text-xs mt-2">{resultJson}</pre> : null}
    </MassiveServicePanel>
  )
}
