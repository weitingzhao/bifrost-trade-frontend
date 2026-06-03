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

const FUND_OPTS: { value: FundSub; label: string }[] = [
  { value: 'income', label: 'Income Statements' },
  { value: 'balance', label: 'Balance Sheets' },
  { value: 'cashflow', label: 'Cash Flow' },
  { value: 'ratios', label: 'Ratios' },
  { value: 'short_interest', label: 'Short Interest' },
  { value: 'short_volume', label: 'Short Volume' },
  { value: 'float', label: 'Float' },
]

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
  const [timeframe, setTimeframe] = useState('annual')
  const [fiscalYear, setFiscalYear] = useState('')
  const [fiscalQuarter, setFiscalQuarter] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [filingDate, setFilingDate] = useState('')
  const [limit, setLimit] = useState('4')
  const [settlementDate, setSettlementDate] = useState('')
  const [shortVolDate, setShortVolDate] = useState('')

  const statementFields = (
    <>
      <ProbeField label="timeframe">
        <ProbeInput value={timeframe} onChange={setTimeframe} placeholder="annual / quarterly" />
      </ProbeField>
      <ProbeField label="fiscal_year">
        <ProbeInput value={fiscalYear} onChange={setFiscalYear} type="number" />
      </ProbeField>
      <ProbeField label="fiscal_quarter">
        <ProbeInput value={fiscalQuarter} onChange={setFiscalQuarter} type="number" />
      </ProbeField>
      <ProbeField label="period_end">
        <ProbeInput value={periodEnd} onChange={setPeriodEnd} />
      </ProbeField>
      <ProbeField label="filing_date">
        <ProbeInput value={filingDate} onChange={setFilingDate} />
      </ProbeField>
      <ProbeField label="limit">
        <ProbeInput value={limit} onChange={setLimit} type="number" />
      </ProbeField>
    </>
  )

  const run = () => {
    const t = ticker.trim() || 'AAPL'
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 4))
    const fy = fiscalYear.trim() ? parseInt(fiscalYear, 10) : undefined
    const fq = fiscalQuarter.trim() ? parseInt(fiscalQuarter, 10) : undefined
    const stmtOpts = {
      timeframe: timeframe.trim() || undefined,
      fiscal_year: Number.isFinite(fy) ? fy : undefined,
      fiscal_quarter: Number.isFinite(fq) ? fq : undefined,
      period_end: periodEnd.trim() || undefined,
      filing_date: filingDate.trim() || undefined,
      limit: lim,
    }
    switch (sub) {
      case 'income':
        return fetchMassiveStockIncomeStatements(t, stmtOpts)
      case 'balance':
        return fetchMassiveStockBalanceSheets(t, stmtOpts)
      case 'cashflow':
        return fetchMassiveStockCashFlowStatements(t, stmtOpts)
      case 'ratios':
        return fetchMassiveStockRatios(t, { limit: lim })
      case 'short_interest':
        return fetchMassiveStockShortInterest(t, {
          settlement_date: settlementDate.trim() || undefined,
          limit: lim,
        })
      case 'short_volume':
        return fetchMassiveStockShortVolume(t, {
          date: shortVolDate.trim() || undefined,
          limit: lim,
        })
      case 'float':
        return fetchMassiveStockFloat(t, { limit: lim })
      default:
        return fetchMassiveStockIncomeStatements(t, stmtOpts)
    }
  }

  const fields = (
    <>
      <ProbeField label="ticker">
        <ProbeInput value={ticker} onChange={setTicker} />
      </ProbeField>
      {sub === 'income' || sub === 'balance' || sub === 'cashflow' ? statementFields : null}
      {sub === 'short_interest' ? (
        <>
          <ProbeField label="settlement_date">
            <ProbeInput value={settlementDate} onChange={setSettlementDate} />
          </ProbeField>
          <ProbeField label="limit">
            <ProbeInput value={limit} onChange={setLimit} type="number" />
          </ProbeField>
        </>
      ) : null}
      {sub === 'short_volume' ? (
        <>
          <ProbeField label="date">
            <ProbeInput value={shortVolDate} onChange={setShortVolDate} />
          </ProbeField>
          <ProbeField label="limit">
            <ProbeInput value={limit} onChange={setLimit} type="number" />
          </ProbeField>
        </>
      ) : null}
      {sub === 'ratios' || sub === 'float' ? (
        <ProbeField label="limit">
          <ProbeInput value={limit} onChange={setLimit} type="number" />
        </ProbeField>
      ) : null}
    </>
  )

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
        options={FUND_OPTS}
        value={sub}
        onChange={v => setSub(v as FundSub)}
        className="mb-3"
      />
      <MassiveJsonProbeCard
        title={FUND_OPTS.find(o => o.value === sub)?.label ?? 'Fundamentals'}
        fields={fields}
        disabled={!configured}
        onExecute={run}
      />
    </MassiveServicePanel>
  )
}
