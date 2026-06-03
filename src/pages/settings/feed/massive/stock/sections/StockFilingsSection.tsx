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

const FILING_OPTS: { value: FilingsSub; label: string }[] = [
  { value: 'edgar', label: 'Edgar Index' },
  { value: '10k', label: '10-K Sections' },
  { value: '8k', label: '8-K Text' },
  { value: '13f', label: '13-F Filings' },
  { value: 'risk_factors', label: 'Risk Factors' },
  { value: 'risk_categories', label: 'Risk Categories' },
  { value: 'form3', label: 'Form 3' },
  { value: 'form4', label: 'Form 4' },
]

function limN(raw: string, fallback: number, max = 10000) {
  return Math.min(max, Math.max(1, parseInt(raw, 10) || fallback))
}

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

  const [eiTicker, setEiTicker] = useState('AAPL')
  const [eiCik, setEiCik] = useState('')
  const [eiFormType, setEiFormType] = useState('')
  const [eiDateGte, setEiDateGte] = useState('')
  const [eiDateLte, setEiDateLte] = useState('')
  const [eiLimit, setEiLimit] = useState('100')

  const [k10Ticker, setK10Ticker] = useState('AAPL')
  const [k10Cik, setK10Cik] = useState('')
  const [k10Section, setK10Section] = useState('')
  const [k10DateGte, setK10DateGte] = useState('')
  const [k10DateLte, setK10DateLte] = useState('')
  const [k10PeGte, setK10PeGte] = useState('')
  const [k10PeLte, setK10PeLte] = useState('')
  const [k10Limit, setK10Limit] = useState('5')

  const [k8Ticker, setK8Ticker] = useState('AAPL')
  const [k8Cik, setK8Cik] = useState('')
  const [k8FormType, setK8FormType] = useState('')
  const [k8DateGte, setK8DateGte] = useState('')
  const [k8DateLte, setK8DateLte] = useState('')
  const [k8Limit, setK8Limit] = useState('5')

  const [f13Cik, setF13Cik] = useState('')
  const [f13DateGte, setF13DateGte] = useState('')
  const [f13DateLte, setF13DateLte] = useState('')
  const [f13Limit, setF13Limit] = useState('50')

  const [rfTicker, setRfTicker] = useState('AAPL')
  const [rfCik, setRfCik] = useState('')
  const [rfDateGte, setRfDateGte] = useState('')
  const [rfDateLte, setRfDateLte] = useState('')
  const [rfLimit, setRfLimit] = useState('20')

  const [rcPrimary, setRcPrimary] = useState('')
  const [rcSecondary, setRcSecondary] = useState('')
  const [rcTertiary, setRcTertiary] = useState('')
  const [rcLimit, setRcLimit] = useState('200')

  const [f3Issuer, setF3Issuer] = useState('')
  const [f3Owner, setF3Owner] = useState('')
  const [f3Tickers, setF3Tickers] = useState('AAPL')
  const [f3DateGte, setF3DateGte] = useState('')
  const [f3DateLte, setF3DateLte] = useState('')
  const [f3Limit, setF3Limit] = useState('50')

  const [f4Issuer, setF4Issuer] = useState('')
  const [f4Owner, setF4Owner] = useState('')
  const [f4Tickers, setF4Tickers] = useState('AAPL')
  const [f4TxCode, setF4TxCode] = useState('')
  const [f4DateGte, setF4DateGte] = useState('')
  const [f4DateLte, setF4DateLte] = useState('')
  const [f4Limit, setF4Limit] = useState('50')

  const dateRange = (gte: string, lte: string, limit: string, fallback: number) => ({
    filing_date_gte: gte.trim() || undefined,
    filing_date_lte: lte.trim() || undefined,
    limit: limN(limit, fallback),
  })

  const run = () => {
    switch (sub) {
      case 'edgar':
        return fetchMassiveEdgarIndex({
          ticker: eiTicker.trim() || undefined,
          cik: eiCik.trim() || undefined,
          form_type: eiFormType.trim() || undefined,
          ...dateRange(eiDateGte, eiDateLte, eiLimit, 100),
        })
      case '10k':
        return fetchMassive10KSections({
          ticker: k10Ticker.trim() || undefined,
          cik: k10Cik.trim() || undefined,
          section: k10Section.trim() || undefined,
          period_end_gte: k10PeGte.trim() || undefined,
          period_end_lte: k10PeLte.trim() || undefined,
          ...dateRange(k10DateGte, k10DateLte, k10Limit, 5),
        })
      case '8k':
        return fetchMassive8KText({
          ticker: k8Ticker.trim() || undefined,
          cik: k8Cik.trim() || undefined,
          form_type: k8FormType.trim() || undefined,
          ...dateRange(k8DateGte, k8DateLte, k8Limit, 5),
        })
      case '13f':
        return fetchMassive13FFilings({
          filer_cik: f13Cik.trim() || undefined,
          ...dateRange(f13DateGte, f13DateLte, f13Limit, 50),
        })
      case 'risk_factors':
        return fetchMassiveRiskFactors({
          ticker: rfTicker.trim() || undefined,
          cik: rfCik.trim() || undefined,
          ...dateRange(rfDateGte, rfDateLte, rfLimit, 20),
        })
      case 'risk_categories':
        return fetchMassiveRiskCategories({
          primary_category: rcPrimary.trim() || undefined,
          secondary_category: rcSecondary.trim() || undefined,
          tertiary_category: rcTertiary.trim() || undefined,
          limit: limN(rcLimit, 200, 999),
        })
      case 'form3':
        return fetchMassiveForm3({
          issuer_cik: f3Issuer.trim() || undefined,
          owner_cik: f3Owner.trim() || undefined,
          tickers: f3Tickers.trim() || undefined,
          ...dateRange(f3DateGte, f3DateLte, f3Limit, 50),
        })
      case 'form4':
        return fetchMassiveForm4({
          issuer_cik: f4Issuer.trim() || undefined,
          owner_cik: f4Owner.trim() || undefined,
          tickers: f4Tickers.trim() || undefined,
          transaction_code: f4TxCode.trim() || undefined,
          ...dateRange(f4DateGte, f4DateLte, f4Limit, 50),
        })
      default:
        return fetchMassiveEdgarIndex({ ticker: 'AAPL', limit: 100 })
    }
  }

  const fields = () => {
    switch (sub) {
      case 'edgar':
        return (
          <>
            <ProbeField label="ticker">
              <ProbeInput value={eiTicker} onChange={setEiTicker} />
            </ProbeField>
            <ProbeField label="cik">
              <ProbeInput value={eiCik} onChange={setEiCik} />
            </ProbeField>
            <ProbeField label="form_type">
              <ProbeInput value={eiFormType} onChange={setEiFormType} />
            </ProbeField>
            <ProbeField label="filing_date_gte">
              <ProbeInput value={eiDateGte} onChange={setEiDateGte} />
            </ProbeField>
            <ProbeField label="filing_date_lte">
              <ProbeInput value={eiDateLte} onChange={setEiDateLte} />
            </ProbeField>
            <ProbeField label="limit">
              <ProbeInput value={eiLimit} onChange={setEiLimit} type="number" />
            </ProbeField>
          </>
        )
      case '10k':
        return (
          <>
            <ProbeField label="ticker">
              <ProbeInput value={k10Ticker} onChange={setK10Ticker} />
            </ProbeField>
            <ProbeField label="cik">
              <ProbeInput value={k10Cik} onChange={setK10Cik} />
            </ProbeField>
            <ProbeField label="section">
              <ProbeInput value={k10Section} onChange={setK10Section} />
            </ProbeField>
            <ProbeField label="period_end_gte">
              <ProbeInput value={k10PeGte} onChange={setK10PeGte} />
            </ProbeField>
            <ProbeField label="period_end_lte">
              <ProbeInput value={k10PeLte} onChange={setK10PeLte} />
            </ProbeField>
            <ProbeField label="filing_date_gte">
              <ProbeInput value={k10DateGte} onChange={setK10DateGte} />
            </ProbeField>
            <ProbeField label="filing_date_lte">
              <ProbeInput value={k10DateLte} onChange={setK10DateLte} />
            </ProbeField>
            <ProbeField label="limit">
              <ProbeInput value={k10Limit} onChange={setK10Limit} type="number" />
            </ProbeField>
          </>
        )
      case '8k':
        return (
          <>
            <ProbeField label="ticker">
              <ProbeInput value={k8Ticker} onChange={setK8Ticker} />
            </ProbeField>
            <ProbeField label="cik">
              <ProbeInput value={k8Cik} onChange={setK8Cik} />
            </ProbeField>
            <ProbeField label="form_type">
              <ProbeInput value={k8FormType} onChange={setK8FormType} />
            </ProbeField>
            <ProbeField label="filing_date_gte">
              <ProbeInput value={k8DateGte} onChange={setK8DateGte} />
            </ProbeField>
            <ProbeField label="filing_date_lte">
              <ProbeInput value={k8DateLte} onChange={setK8DateLte} />
            </ProbeField>
            <ProbeField label="limit">
              <ProbeInput value={k8Limit} onChange={setK8Limit} type="number" />
            </ProbeField>
          </>
        )
      case '13f':
        return (
          <>
            <ProbeField label="filer_cik">
              <ProbeInput value={f13Cik} onChange={setF13Cik} />
            </ProbeField>
            <ProbeField label="filing_date_gte">
              <ProbeInput value={f13DateGte} onChange={setF13DateGte} />
            </ProbeField>
            <ProbeField label="filing_date_lte">
              <ProbeInput value={f13DateLte} onChange={setF13DateLte} />
            </ProbeField>
            <ProbeField label="limit">
              <ProbeInput value={f13Limit} onChange={setF13Limit} type="number" />
            </ProbeField>
          </>
        )
      case 'risk_factors':
        return (
          <>
            <ProbeField label="ticker">
              <ProbeInput value={rfTicker} onChange={setRfTicker} />
            </ProbeField>
            <ProbeField label="cik">
              <ProbeInput value={rfCik} onChange={setRfCik} />
            </ProbeField>
            <ProbeField label="filing_date_gte">
              <ProbeInput value={rfDateGte} onChange={setRfDateGte} />
            </ProbeField>
            <ProbeField label="filing_date_lte">
              <ProbeInput value={rfDateLte} onChange={setRfDateLte} />
            </ProbeField>
            <ProbeField label="limit">
              <ProbeInput value={rfLimit} onChange={setRfLimit} type="number" />
            </ProbeField>
          </>
        )
      case 'risk_categories':
        return (
          <>
            <ProbeField label="primary_category">
              <ProbeInput value={rcPrimary} onChange={setRcPrimary} />
            </ProbeField>
            <ProbeField label="secondary_category">
              <ProbeInput value={rcSecondary} onChange={setRcSecondary} />
            </ProbeField>
            <ProbeField label="tertiary_category">
              <ProbeInput value={rcTertiary} onChange={setRcTertiary} />
            </ProbeField>
            <ProbeField label="limit">
              <ProbeInput value={rcLimit} onChange={setRcLimit} type="number" />
            </ProbeField>
          </>
        )
      case 'form3':
        return (
          <>
            <ProbeField label="issuer_cik">
              <ProbeInput value={f3Issuer} onChange={setF3Issuer} />
            </ProbeField>
            <ProbeField label="owner_cik">
              <ProbeInput value={f3Owner} onChange={setF3Owner} />
            </ProbeField>
            <ProbeField label="tickers">
              <ProbeInput value={f3Tickers} onChange={setF3Tickers} />
            </ProbeField>
            <ProbeField label="filing_date_gte">
              <ProbeInput value={f3DateGte} onChange={setF3DateGte} />
            </ProbeField>
            <ProbeField label="filing_date_lte">
              <ProbeInput value={f3DateLte} onChange={setF3DateLte} />
            </ProbeField>
            <ProbeField label="limit">
              <ProbeInput value={f3Limit} onChange={setF3Limit} type="number" />
            </ProbeField>
          </>
        )
      case 'form4':
        return (
          <>
            <ProbeField label="issuer_cik">
              <ProbeInput value={f4Issuer} onChange={setF4Issuer} />
            </ProbeField>
            <ProbeField label="owner_cik">
              <ProbeInput value={f4Owner} onChange={setF4Owner} />
            </ProbeField>
            <ProbeField label="tickers">
              <ProbeInput value={f4Tickers} onChange={setF4Tickers} />
            </ProbeField>
            <ProbeField label="transaction_code">
              <ProbeInput value={f4TxCode} onChange={setF4TxCode} />
            </ProbeField>
            <ProbeField label="filing_date_gte">
              <ProbeInput value={f4DateGte} onChange={setF4DateGte} />
            </ProbeField>
            <ProbeField label="filing_date_lte">
              <ProbeInput value={f4DateLte} onChange={setF4DateLte} />
            </ProbeField>
            <ProbeField label="limit">
              <ProbeInput value={f4Limit} onChange={setF4Limit} type="number" />
            </ProbeField>
          </>
        )
      default:
        return null
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
        options={FILING_OPTS}
        value={sub}
        onChange={v => setSub(v as FilingsSub)}
        className="mb-3"
      />
      <MassiveJsonProbeCard
        title={FILING_OPTS.find(o => o.value === sub)?.label ?? 'Filings'}
        fields={fields()}
        disabled={!configured}
        onExecute={run}
      />
    </MassiveServicePanel>
  )
}
