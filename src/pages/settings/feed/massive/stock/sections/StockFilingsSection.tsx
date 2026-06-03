import { useState } from 'react'
import { SegmentControl } from '@/components/data-display'
import {
  MassiveJsonProbeCard,
  ProbeField,
  ProbeInput,
} from '@/pages/settings/feed/massive/components/MassiveJsonProbeCard'
import { MassiveServicePanel } from '@/pages/settings/feed/massive/components/MassiveServicePanel'
import {
  fetchMassive10KSections,
  fetchMassive13FFilings,
  fetchMassive8KText,
  fetchMassiveEdgarIndex,
  fetchMassiveForm3,
  fetchMassiveForm4,
  fetchMassiveRiskCategories,
  fetchMassiveRiskFactors,
} from '@/api/massive/stockFeed'
import type { ChecklistRow, EffectiveServiceStatus } from '@/pages/settings/feed/massive/checklist/types'

type FilingsSub =
  | 'edgar'
  | '10k'
  | '8k'
  | '13f'
  | 'risk_factors'
  | 'risk_categories'
  | 'form3'
  | 'form4'

export function StockFilingsSection({
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
  const [sub, setSub] = useState<FilingsSub>('edgar')
  const [ticker, setTicker] = useState('AAPL')
  const [cik, setCik] = useState('')
  const [limit, setLimit] = useState('50')
  const [dateGte, setDateGte] = useState('')
  const [dateLte, setDateLte] = useState('')

  const opts = [
    { value: 'edgar', label: 'Edgar Index' },
    { value: '10k', label: '10-K Sections' },
    { value: '8k', label: '8-K Text' },
    { value: '13f', label: '13-F' },
    { value: 'risk_factors', label: 'Risk Factors' },
    { value: 'risk_categories', label: 'Risk Categories' },
    { value: 'form3', label: 'Form 3' },
    { value: 'form4', label: 'Form 4' },
  ]

  const lim = Math.min(10000, Math.max(1, parseInt(limit, 10) || 50))
  const dateOpts = {
    filing_date_gte: dateGte.trim() || undefined,
    filing_date_lte: dateLte.trim() || undefined,
    limit: lim,
  }

  const run = () => {
    const t = ticker.trim() || undefined
    switch (sub) {
      case 'edgar':
        return fetchMassiveEdgarIndex({ ticker: t, cik: cik.trim() || undefined, ...dateOpts })
      case '10k':
        return fetchMassive10KSections({ ticker: t, cik: cik.trim() || undefined, ...dateOpts })
      case '8k':
        return fetchMassive8KText({ ticker: t, cik: cik.trim() || undefined, ...dateOpts })
      case '13f':
        return fetchMassive13FFilings({ filer_cik: cik.trim() || undefined, ...dateOpts })
      case 'risk_factors':
        return fetchMassiveRiskFactors({ ticker: t, cik: cik.trim() || undefined, ...dateOpts })
      case 'risk_categories':
        return fetchMassiveRiskCategories({ limit: lim })
      case 'form3':
        return fetchMassiveForm3({ tickers: t, ...dateOpts })
      case 'form4':
        return fetchMassiveForm4({ tickers: t, ...dateOpts })
      default:
        return fetchMassiveEdgarIndex({ ticker: t, ...dateOpts })
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
        ariaLabel="Filings sub-tabs"
        options={opts}
        value={sub}
        onChange={v => setSub(v as FilingsSub)}
        className="mb-3"
      />
      <MassiveJsonProbeCard
        title={opts.find(o => o.value === sub)?.label ?? 'Filings'}
        fields={
          <>
            <ProbeField label="ticker">
              <ProbeInput value={ticker} onChange={setTicker} />
            </ProbeField>
            <ProbeField label="cik">
              <ProbeInput value={cik} onChange={setCik} />
            </ProbeField>
            <ProbeField label="filing_date_gte">
              <ProbeInput value={dateGte} onChange={setDateGte} />
            </ProbeField>
            <ProbeField label="filing_date_lte">
              <ProbeInput value={dateLte} onChange={setDateLte} />
            </ProbeField>
            <ProbeField label="limit">
              <ProbeInput value={limit} onChange={setLimit} type="number" />
            </ProbeField>
          </>
        }
        disabled={!configured}
        onExecute={run}
      />
    </MassiveServicePanel>
  )
}
