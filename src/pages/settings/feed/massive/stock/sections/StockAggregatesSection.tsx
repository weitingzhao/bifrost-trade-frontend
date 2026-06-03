import { useState } from 'react'
import { SegmentControl } from '@/components/data-display'
import {
  MassiveJsonProbeCard,
  ProbeField,
  ProbeInput,
} from '@/pages/settings/feed/massive/components/MassiveJsonProbeCard'
import { MassiveServicePanel } from '@/pages/settings/feed/massive/components/MassiveServicePanel'
import {
  fetchMassiveStockBarsRange,
  fetchMassiveStockGroupedDaily,
  fetchMassiveStockOpenClose,
  fetchMassiveStockPrev,
} from '@/api/massive/stockFeed'
import type { ChecklistRow, EffectiveServiceStatus } from '@/pages/settings/feed/massive/checklist/types'
import {
  STOCK_CUSTOM_BARS_DEFAULT_END_MS,
  STOCK_CUSTOM_BARS_DEFAULT_START_MS,
} from '@/pages/settings/feed/massive/stock/stockRestSections'

type AggSub = 'custom' | 'grouped' | 'open_close' | 'prev'

const AGG_OPTS = [
  { value: 'custom' as const, label: 'Custom Bars' },
  { value: 'grouped' as const, label: 'Daily Market Summary' },
  { value: 'open_close' as const, label: 'Daily Ticker Summary' },
  { value: 'prev' as const, label: 'Previous Day Bar' },
]

function parseAdjusted(raw: string): boolean | undefined {
  const t = raw.trim().toLowerCase()
  if (t === 'false') return false
  if (t === 'true') return true
  return undefined
}

export function StockAggregatesSection({
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
  const [sub, setSub] = useState<AggSub>('custom')
  const [ticker, setTicker] = useState('AAPL')
  const [multiplier, setMultiplier] = useState('1')
  const [timespan, setTimespan] = useState('minute')
  const [startMs, setStartMs] = useState(String(STOCK_CUSTOM_BARS_DEFAULT_START_MS))
  const [endMs, setEndMs] = useState(String(STOCK_CUSTOM_BARS_DEFAULT_END_MS))
  const [date, setDate] = useState('2024-06-03')
  const [adjusted, setAdjusted] = useState('true')

  return (
    <MassiveServicePanel
      row={row}
      effectiveStatus={effectiveStatus}
      expanded={expanded}
      highlighted={highlighted}
      onToggle={onToggle}
    >
      <SegmentControl
        ariaLabel="Aggregates sub-tabs"
        options={AGG_OPTS}
        value={sub}
        onChange={v => setSub(v as AggSub)}
        className="mb-3"
      />
      {sub === 'custom' ? (
        <MassiveJsonProbeCard
          title="Custom Bars (OHLC)"
          description="Default window: one regular session (09:30–16:00 ET) on 2024-06-03, minute bars."
          fields={
            <>
              <ProbeField label="ticker">
                <ProbeInput value={ticker} onChange={setTicker} />
              </ProbeField>
              <ProbeField label="multiplier">
                <ProbeInput value={multiplier} onChange={setMultiplier} type="number" />
              </ProbeField>
              <ProbeField label="timespan">
                <ProbeInput value={timespan} onChange={setTimespan} />
              </ProbeField>
              <ProbeField label="start_ms">
                <ProbeInput value={startMs} onChange={setStartMs} />
              </ProbeField>
              <ProbeField label="end_ms">
                <ProbeInput value={endMs} onChange={setEndMs} />
              </ProbeField>
            </>
          }
          disabled={!configured}
          onExecute={() =>
            fetchMassiveStockBarsRange({
              ticker: ticker.trim() || 'AAPL',
              multiplier: parseInt(multiplier, 10) || 1,
              timespan: timespan.trim() || 'minute',
              start_ms: parseInt(startMs, 10) || STOCK_CUSTOM_BARS_DEFAULT_START_MS,
              end_ms: parseInt(endMs, 10) || STOCK_CUSTOM_BARS_DEFAULT_END_MS,
            })
          }
        />
      ) : null}
      {sub === 'grouped' ? (
        <MassiveJsonProbeCard
          title="Daily Market Summary"
          fields={
            <>
              <ProbeField label="date (YYYY-MM-DD)">
                <ProbeInput value={date} onChange={setDate} />
              </ProbeField>
              <ProbeField label="adjusted">
                <ProbeInput value={adjusted} onChange={setAdjusted} placeholder="true / false" />
              </ProbeField>
            </>
          }
          disabled={!configured}
          onExecute={() =>
            fetchMassiveStockGroupedDaily(date.trim() || '2024-06-03', {
              adjusted: parseAdjusted(adjusted),
            })
          }
        />
      ) : null}
      {sub === 'open_close' ? (
        <MassiveJsonProbeCard
          title="Daily Ticker Summary"
          fields={
            <>
              <ProbeField label="ticker">
                <ProbeInput value={ticker} onChange={setTicker} />
              </ProbeField>
              <ProbeField label="date">
                <ProbeInput value={date} onChange={setDate} />
              </ProbeField>
              <ProbeField label="adjusted">
                <ProbeInput value={adjusted} onChange={setAdjusted} placeholder="true / false" />
              </ProbeField>
            </>
          }
          disabled={!configured}
          onExecute={() =>
            fetchMassiveStockOpenClose(ticker.trim() || 'AAPL', date.trim() || '2024-06-03', {
              adjusted: parseAdjusted(adjusted),
            })
          }
        />
      ) : null}
      {sub === 'prev' ? (
        <MassiveJsonProbeCard
          title="Previous Day Bar"
          fields={
            <>
              <ProbeField label="ticker">
                <ProbeInput value={ticker} onChange={setTicker} />
              </ProbeField>
              <ProbeField label="adjusted">
                <ProbeInput value={adjusted} onChange={setAdjusted} placeholder="true / false" />
              </ProbeField>
            </>
          }
          disabled={!configured}
          onExecute={() =>
            fetchMassiveStockPrev(ticker.trim() || 'AAPL', {
              adjusted: parseAdjusted(adjusted),
            })
          }
        />
      ) : null}
    </MassiveServicePanel>
  )
}
