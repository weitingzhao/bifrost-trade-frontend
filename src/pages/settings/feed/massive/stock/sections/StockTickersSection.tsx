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

function parseActive(raw: string): boolean | undefined {
  const t = raw.trim().toLowerCase()
  if (t === 'true') return true
  if (t === 'false') return false
  return undefined
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
  const [allTicker, setAllTicker] = useState('')
  const [allMarket, setAllMarket] = useState('')
  const [allType, setAllType] = useState('')
  const [allExchange, setAllExchange] = useState('')
  const [allSearch, setAllSearch] = useState('')
  const [allActive, setAllActive] = useState('')
  const [allDate, setAllDate] = useState('')
  const [allLimit, setAllLimit] = useState('100')
  const [allCursor, setAllCursor] = useState('')

  const [ovTicker, setOvTicker] = useState('AAPL')
  const [ovDate, setOvDate] = useState('')

  const [typesAssetClass, setTypesAssetClass] = useState('')
  const [typesLocale, setTypesLocale] = useState('')

  const [relTicker, setRelTicker] = useState('AAPL')

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
          description="GET /v3/reference/tickers — filter universe; use cursor for pagination."
          fields={
            <>
              <ProbeField label="ticker">
                <ProbeInput value={allTicker} onChange={setAllTicker} />
              </ProbeField>
              <ProbeField label="search">
                <ProbeInput value={allSearch} onChange={setAllSearch} />
              </ProbeField>
              <ProbeField label="market">
                <ProbeInput value={allMarket} onChange={setAllMarket} placeholder="stocks" />
              </ProbeField>
              <ProbeField label="type">
                <ProbeInput value={allType} onChange={setAllType} />
              </ProbeField>
              <ProbeField label="exchange">
                <ProbeInput value={allExchange} onChange={setAllExchange} />
              </ProbeField>
              <ProbeField label="active">
                <ProbeInput value={allActive} onChange={setAllActive} placeholder="true / false" />
              </ProbeField>
              <ProbeField label="date">
                <ProbeInput value={allDate} onChange={setAllDate} placeholder="YYYY-MM-DD" />
              </ProbeField>
              <ProbeField label="limit">
                <ProbeInput value={allLimit} onChange={setAllLimit} type="number" />
              </ProbeField>
              <ProbeField label="cursor">
                <ProbeInput value={allCursor} onChange={setAllCursor} />
              </ProbeField>
            </>
          }
          disabled={!configured}
          onExecute={() =>
            fetchMassiveReferenceTickers({
              ticker: allTicker.trim() || undefined,
              search: allSearch.trim() || undefined,
              market: allMarket.trim() || undefined,
              type: allType.trim() || undefined,
              exchange: allExchange.trim() || undefined,
              active: parseActive(allActive),
              date: allDate.trim() || undefined,
              limit: Math.min(1000, Math.max(1, parseInt(allLimit, 10) || 100)),
              cursor: allCursor.trim() || undefined,
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
                <ProbeInput value={ovTicker} onChange={setOvTicker} />
              </ProbeField>
              <ProbeField label="date">
                <ProbeInput value={ovDate} onChange={setOvDate} placeholder="YYYY-MM-DD" />
              </ProbeField>
            </>
          }
          disabled={!configured}
          onExecute={() =>
            fetchMassiveTickerDetail(ovTicker.trim() || 'AAPL', {
              date: ovDate.trim() || undefined,
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
                <ProbeInput value={typesAssetClass} onChange={setTypesAssetClass} />
              </ProbeField>
              <ProbeField label="locale">
                <ProbeInput value={typesLocale} onChange={setTypesLocale} placeholder="us" />
              </ProbeField>
            </>
          }
          disabled={!configured}
          onExecute={() =>
            fetchMassiveTickerTypes({
              asset_class: typesAssetClass.trim() || undefined,
              locale: typesLocale.trim() || undefined,
            })
          }
        />
      ) : null}
      {subTab === 'related_tickers' ? (
        <MassiveJsonProbeCard
          title="Related Tickers"
          fields={
            <ProbeField label="ticker">
              <ProbeInput value={relTicker} onChange={setRelTicker} />
            </ProbeField>
          }
          disabled={!configured}
          onExecute={() => fetchMassiveRelatedCompanies(relTicker.trim() || 'AAPL')}
        />
      ) : null}
    </MassiveServicePanel>
  )
}
