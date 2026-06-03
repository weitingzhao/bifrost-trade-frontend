import { useState } from 'react'
import { SegmentControl } from '@/components/data-display'
import {
  MassiveJsonProbeCard,
  ProbeField,
  ProbeInput,
} from '@/pages/settings/feed/massive/components/MassiveJsonProbeCard'
import { MassiveServicePanel } from '@/pages/settings/feed/massive/components/MassiveServicePanel'
import {
  fetchMassiveReferenceTickers,
  fetchMassiveRelatedCompanies,
  fetchMassiveTickerDetail,
  fetchMassiveTickerTypes,
} from '@/api/massive/stockFeed'
import type { ChecklistRow, EffectiveServiceStatus } from '@/pages/settings/feed/massive/checklist/types'
import {
  MASSIVE_STOCK_TICKERS_SUB_TABS,
  type MassiveStockTickersSubTab,
} from '@/pages/settings/feed/massive/nav/stockTabUtils'
import { MassiveTickerReferenceDbSection } from '@/components/massive/MassiveTickerReferenceDbSection'

const TICKERS_SUB_LABELS: Record<MassiveStockTickersSubTab, string> = {
  all_tickers: 'All Tickers',
  ticker_overview: 'Ticker Overview',
  ticker_types: 'Ticker Types',
  related_tickers: 'Related Tickers',
  reference_db: 'Reference DB',
}

export function StockTickersSection({
  row,
  effectiveStatus,
  expanded,
  highlighted,
  onToggle,
  subTab,
  onSubTabChange,
  configured,
}: {
  row: ChecklistRow
  effectiveStatus: EffectiveServiceStatus
  expanded: boolean
  highlighted?: boolean
  onToggle: () => void
  subTab: MassiveStockTickersSubTab
  onSubTabChange: (sub: MassiveStockTickersSubTab) => void
  configured: boolean
}) {
  const [tkTicker, setTkTicker] = useState('AAPL')
  const [tkSearch, setTkSearch] = useState('')
  const [tkMarket, setTkMarket] = useState('stocks')
  const [tkLimit, setTkLimit] = useState('10')
  const [tkActive, setTkActive] = useState('true')
  const [tkDate, setTkDate] = useState('')
  const [tkType, setTkType] = useState('')
  const [tkAssetClass, setTkAssetClass] = useState('stocks')
  const [tkLocale, setTkLocale] = useState('us')

  const subOptions = MASSIVE_STOCK_TICKERS_SUB_TABS.map(id => ({
    value: id,
    label: TICKERS_SUB_LABELS[id],
  }))

  return (
    <MassiveServicePanel
      row={row}
      effectiveStatus={effectiveStatus}
      expanded={expanded}
      highlighted={highlighted}
      onToggle={onToggle}
    >
      <SegmentControl
        ariaLabel="Tickers sub-tabs"
        options={subOptions}
        value={subTab}
        onChange={v => onSubTabChange(v as MassiveStockTickersSubTab)}
        className="mb-3"
      />
      {subTab === 'reference_db' ? (
        <MassiveTickerReferenceDbSection />
      ) : null}
      {subTab === 'all_tickers' ? (
        <MassiveJsonProbeCard
          title="All Tickers"
          fields={
            <>
              <ProbeField label="ticker">
                <ProbeInput value={tkTicker} onChange={setTkTicker} placeholder="optional filter" />
              </ProbeField>
              <ProbeField label="search">
                <ProbeInput value={tkSearch} onChange={setTkSearch} />
              </ProbeField>
              <ProbeField label="market">
                <ProbeInput value={tkMarket} onChange={setTkMarket} />
              </ProbeField>
              <ProbeField label="type">
                <ProbeInput value={tkType} onChange={setTkType} />
              </ProbeField>
              <ProbeField label="active">
                <ProbeInput value={tkActive} onChange={setTkActive} />
              </ProbeField>
              <ProbeField label="limit">
                <ProbeInput value={tkLimit} onChange={setTkLimit} type="number" />
              </ProbeField>
            </>
          }
          disabled={!configured}
          onExecute={() =>
            fetchMassiveReferenceTickers({
              ticker: tkTicker.trim() || undefined,
              search: tkSearch.trim() || undefined,
              market: tkMarket.trim() || undefined,
              type: tkType.trim() || undefined,
              active: tkActive.trim() === 'true' ? true : tkActive.trim() === 'false' ? false : undefined,
              limit: Math.min(1000, Math.max(1, parseInt(tkLimit, 10) || 10)),
            })
          }
        />
      ) : null}
      {subTab === 'ticker_overview' ? (
        <MassiveJsonProbeCard
          title="Ticker Overview"
          fields={
            <>
              <ProbeField label="ticker">
                <ProbeInput value={tkTicker} onChange={setTkTicker} />
              </ProbeField>
              <ProbeField label="date">
                <ProbeInput value={tkDate} onChange={setTkDate} placeholder="YYYY-MM-DD" />
              </ProbeField>
            </>
          }
          disabled={!configured}
          onExecute={() =>
            fetchMassiveTickerDetail(tkTicker.trim() || 'AAPL', {
              date: tkDate.trim() || undefined,
            })
          }
        />
      ) : null}
      {subTab === 'ticker_types' ? (
        <MassiveJsonProbeCard
          title="Ticker Types"
          fields={
            <>
              <ProbeField label="asset_class">
                <ProbeInput value={tkAssetClass} onChange={setTkAssetClass} />
              </ProbeField>
              <ProbeField label="locale">
                <ProbeInput value={tkLocale} onChange={setTkLocale} />
              </ProbeField>
            </>
          }
          disabled={!configured}
          onExecute={() =>
            fetchMassiveTickerTypes({
              asset_class: tkAssetClass.trim() || undefined,
              locale: tkLocale.trim() || undefined,
            })
          }
        />
      ) : null}
      {subTab === 'related_tickers' ? (
        <MassiveJsonProbeCard
          title="Related Tickers"
          fields={
            <ProbeField label="ticker">
              <ProbeInput value={tkTicker} onChange={setTkTicker} />
            </ProbeField>
          }
          disabled={!configured}
          onExecute={() => fetchMassiveRelatedCompanies(tkTicker.trim() || 'AAPL')}
        />
      ) : null}
    </MassiveServicePanel>
  )
}
