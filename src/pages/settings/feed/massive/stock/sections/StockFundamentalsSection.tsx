import { useState } from 'react'
import { SegmentControl } from '@/components/data-display'
import {
  MassiveJsonProbeCard,
  ProbeField,
  ProbeInput,
} from '@/pages/settings/feed/massive/components/MassiveJsonProbeCard'
import { MassiveServicePanel } from '@/pages/settings/feed/massive/components/MassiveServicePanel'
import {
  fetchMassiveStockBalanceSheets,
  fetchMassiveStockCashFlowStatements,
  fetchMassiveStockFloat,
  fetchMassiveStockIncomeStatements,
  fetchMassiveStockRatios,
  fetchMassiveStockShortInterest,
  fetchMassiveStockShortVolume,
} from '@/api/massive/stockFeed'
import type { ChecklistRow, EffectiveServiceStatus } from '@/pages/settings/feed/massive/checklist/types'

type FundSub =
  | 'income'
  | 'balance'
  | 'cashflow'
  | 'ratios'
  | 'short_interest'
  | 'short_volume'
  | 'float'

export function StockFundamentalsSection({
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
  const [sub, setSub] = useState<FundSub>('income')
  const [ticker, setTicker] = useState('AAPL')
  const [timeframe, setTimeframe] = useState('quarterly')
  const [limit, setLimit] = useState('10')

  const fundOpts = [
    { value: 'income', label: 'Income' },
    { value: 'balance', label: 'Balance' },
    { value: 'cashflow', label: 'Cash flow' },
    { value: 'ratios', label: 'Ratios' },
    { value: 'short_interest', label: 'Short interest' },
    { value: 'short_volume', label: 'Short volume' },
    { value: 'float', label: 'Float' },
  ]

  const commonFields = (
    <>
      <ProbeField label="ticker">
        <ProbeInput value={ticker} onChange={setTicker} />
      </ProbeField>
      {(sub === 'income' || sub === 'balance' || sub === 'cashflow') && (
        <ProbeField label="timeframe">
          <ProbeInput value={timeframe} onChange={setTimeframe} />
        </ProbeField>
      )}
      <ProbeField label="limit">
        <ProbeInput value={limit} onChange={setLimit} type="number" />
      </ProbeField>
    </>
  )

  const run = () => {
    const t = ticker.trim() || 'AAPL'
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 10))
    const opts = { timeframe: timeframe.trim() || undefined, limit: lim }
    switch (sub) {
      case 'income':
        return fetchMassiveStockIncomeStatements(t, opts)
      case 'balance':
        return fetchMassiveStockBalanceSheets(t, opts)
      case 'cashflow':
        return fetchMassiveStockCashFlowStatements(t, opts)
      case 'ratios':
        return fetchMassiveStockRatios(t, { limit: lim })
      case 'short_interest':
        return fetchMassiveStockShortInterest(t, { limit: lim })
      case 'short_volume':
        return fetchMassiveStockShortVolume(t, { limit: lim })
      case 'float':
        return fetchMassiveStockFloat(t, { limit: lim })
      default:
        return fetchMassiveStockIncomeStatements(t, opts)
    }
  }

  return (
    <MassiveServicePanel
      row={row}
      effectiveStatus={effectiveStatus}
      expanded={expanded}
      highlighted={highlighted}
      onToggle={onToggle}
    >
      <SegmentControl
        ariaLabel="Fundamentals sub-tabs"
        options={fundOpts}
        value={sub}
        onChange={v => setSub(v as FundSub)}
        className="mb-3"
      />
      <MassiveJsonProbeCard
        title={fundOpts.find(o => o.value === sub)?.label ?? 'Fundamentals'}
        fields={commonFields}
        disabled={!configured}
        onExecute={run}
      />
    </MassiveServicePanel>
  )
}
