import { Alert, AlertDescription } from '@/components/ui/alert'
import { SegmentControl } from '@/components/data-display'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Badge } from '@/components/ui/badge'
import { MassiveCapabilityChipNav } from '@/pages/settings/feed/massive/components/MassiveCapabilityChipNav'
import { MassiveDelayDbLinkCard } from '@/pages/settings/feed/massive/components/MassiveDelayDbLinkCard'
import { MassiveDeliveryChannelTabs } from '@/pages/settings/feed/massive/components/MassiveDeliveryChannelTabs'
import { MassiveStocksCoverageBanner } from '@/pages/settings/feed/massive/components/MassiveStocksCoverageBanner'
import { STOCK_CHECKLIST_ROWS } from '@/pages/settings/feed/massive/checklist/stockChecklistRows'
import type { ChecklistRow } from '@/pages/settings/feed/massive/checklist/types'
import {
  STOCK_REST_SECTION_LABELS,
  STOCK_REST_SECTION_ORDER,
  type StockRestSectionId,
} from '@/pages/settings/feed/massive/stock/stockRestSections'
import { stockRowById, stockRowEffective } from '@/pages/settings/feed/massive/stock/stockRowStatus'
import { useMassiveStockPageNav } from '@/pages/settings/feed/massive/stock/useMassiveStockPageNav'
import { StockAggregatesSection } from '@/pages/settings/feed/massive/stock/sections/StockAggregatesSection'
import { StockFilingsSection } from '@/pages/settings/feed/massive/stock/sections/StockFilingsSection'
import { StockFundamentalsSection } from '@/pages/settings/feed/massive/stock/sections/StockFundamentalsSection'
import { StockNewsSection } from '@/pages/settings/feed/massive/stock/sections/StockNewsSection'
import { StockPlaceholderSection } from '@/pages/settings/feed/massive/stock/sections/StockPlaceholderSection'
import { StockTickersSection } from '@/pages/settings/feed/massive/stock/sections/StockTickersSection'
import type { MassiveStatusResponse } from '@/types/optionDiscovery'

function RestSectionPanel({
  sectionId,
  massiveStatus,
  configured,
  nav,
}: {
  sectionId: StockRestSectionId
  massiveStatus: MassiveStatusResponse | null | undefined
  configured: boolean
  nav: ReturnType<typeof useMassiveStockPageNav>
}) {
  const row = stockRowById(sectionId)
  if (!row) return null
  const eff = stockRowEffective(row, massiveStatus)
  const common = {
    row,
    effectiveStatus: eff,
    expanded: nav.capExpanded[sectionId] === true,
    highlighted: nav.highlightedId === sectionId,
    onToggle: () => nav.toggleCap(sectionId),
    configured,
  }

  switch (sectionId) {
    case 'stock-tickers':
      return (
        <StockTickersSection
          {...common}
          subTab={nav.tickersSubTab}
          onSubTabChange={sub => {
            nav.setTickersSubTab(sub)
            nav.navigateToTickersSub(sub)
          }}
        />
      )
    case 'stock-aggregates':
      return <StockAggregatesSection {...common} />
    case 'stock-fundamentals':
      return <StockFundamentalsSection {...common} />
    case 'stock-filings':
      return <StockFilingsSection {...common} />
    case 'stock-news':
      return <StockNewsSection {...common} />
    case 'stock-snapshots':
    case 'stock-trades-quotes':
      return <StockPlaceholderSection {...common} />
    case 'stock-corporate-actions':
      return <StockPlaceholderSection {...common} linkToOption />
    default:
      return null
  }
}

function ChannelPlaceholderPanels({
  rows,
  massiveStatus,
  nav,
  activeId,
}: {
  rows: ChecklistRow[]
  massiveStatus: MassiveStatusResponse | null | undefined
  nav: ReturnType<typeof useMassiveStockPageNav>
  activeId: string
}) {
  const row = rows.find(r => r.id === activeId) ?? rows[0]
  if (!row) return null
  return (
    <StockPlaceholderSection
      row={row}
      effectiveStatus={stockRowEffective(row, massiveStatus)}
      expanded={nav.capExpanded[row.id] === true}
      highlighted={nav.highlightedId === row.id}
      onToggle={() => nav.toggleCap(row.id)}
    />
  )
}

export function MassiveStockFeedBody({
  massiveStatus,
}: {
  massiveStatus: MassiveStatusResponse | null | undefined
}) {
  const configured = Boolean(massiveStatus?.configured)
  const nav = useMassiveStockPageNav()
  const wsRows = STOCK_CHECKLIST_ROWS.filter(r => r.group === 'ws')
  const flatRows = STOCK_CHECKLIST_ROWS.filter(r => r.group === 'flat')

  const restOptions = STOCK_REST_SECTION_ORDER.map(id => ({
    value: id,
    label: STOCK_REST_SECTION_LABELS[id],
  }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Feed / Massive Stock</h2>
        <InfoTooltip text="Massive (Polygon) Stocks API coverage sheet and capability status. Shared REST (Technical Indicators, Market Operations) lives under Feed → Massive Common; corporate actions sync UI remains under Feed → Massive Option. Stock-specific endpoints are planned." />
        {configured ? (
          <Badge variant="secondary" title={massiveStatus?.delay_notice}>
            Delayed feed
          </Badge>
        ) : null}
      </div>

      {!configured ? (
        <Alert variant="destructive">
          <AlertDescription>
            Massive API is not configured. Set server.massive_port and API keys in config, then restart the Massive
            server.
          </AlertDescription>
        </Alert>
      ) : null}

      <MassiveStocksCoverageBanner />

      <MassiveCapabilityChipNav
        rowEffective={row => stockRowEffective(row, massiveStatus)}
        onChipClick={nav.navigateToCap}
      />

      <MassiveDelayDbLinkCard />

      <MassiveDeliveryChannelTabs value={nav.channelTab} onChange={nav.setChannelTab} />

      {nav.channelTab === 'rest' ? (
        <div className="space-y-4">
          <SegmentControl
            ariaLabel="REST sections"
            options={restOptions}
            value={nav.restSection}
            onChange={v => {
              const id = v as StockRestSectionId
              nav.setRestSection(id)
              nav.navigateToCap(id)
            }}
          />
          <RestSectionPanel
            sectionId={nav.restSection}
            massiveStatus={massiveStatus}
            configured={configured}
            nav={nav}
          />
        </div>
      ) : null}

      {nav.channelTab === 'ws' ? (
        <div className="space-y-4">
          <SegmentControl
            ariaLabel="WebSocket sections"
            options={wsRows.map(r => ({ value: r.id, label: r.service }))}
            value={nav.wsSection}
            onChange={v => {
              nav.setWsSection(v)
              nav.navigateToCap(v)
            }}
          />
          <ChannelPlaceholderPanels
            rows={wsRows}
            massiveStatus={massiveStatus}
            nav={nav}
            activeId={nav.wsSection}
          />
        </div>
      ) : null}

      {nav.channelTab === 'flat' ? (
        <div className="space-y-4">
          <SegmentControl
            ariaLabel="Flat file sections"
            options={flatRows.map(r => ({ value: r.id, label: r.service }))}
            value={nav.flatSection}
            onChange={v => {
              nav.setFlatSection(v)
              nav.navigateToCap(v)
            }}
          />
          <ChannelPlaceholderPanels
            rows={flatRows}
            massiveStatus={massiveStatus}
            nav={nav}
            activeId={nav.flatSection}
          />
        </div>
      ) : null}
    </div>
  )
}
