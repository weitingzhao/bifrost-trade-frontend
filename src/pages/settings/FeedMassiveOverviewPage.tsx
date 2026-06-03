import { Link } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/layout'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MassiveOverviewColumn } from '@/pages/settings/feed/massive/components/MassiveOverviewColumn'
import { MassiveStatusStrip } from '@/pages/settings/feed/massive/components/MassiveStatusStrip'
import { useMassiveStatus } from '@/pages/settings/feed/massive/hooks/useMassiveStatus'
import {
  groupedCommonFeedChecklistRows,
  groupedOptionFeedChecklistRows,
  tierOkForRow as optionTierOk,
  tradesOkForRow as optionTradesOk,
  effectiveChecklistProjectStatus as optionEffectiveStatus,
  shortServiceLabel as optionShortLabel,
} from '@/pages/settings/feed/massive/checklist/optionStatus'
import {
  groupedStockChecklistRows,
  tierOkForRow as stockTierOk,
  tradesOkForRow as stockTradesOk,
  effectiveChecklistProjectStatus as stockEffectiveStatus,
  shortServiceLabel as stockShortLabel,
} from '@/pages/settings/feed/massive/checklist/stockStatus'
import { MASSIVE_OVERVIEW_BASE } from '@/pages/settings/feed/massive/nav/anchors'

const OVERVIEW_INFO =
  'Summary of Polygon / Massive capabilities for Stocks, Options, and shared Common REST (Technical Indicators, Market Operations). Use the links below to open each feed page.'

const QUICK_LINKS = [{ to: '/settings/api', label: 'Massive API health' }] as const

export default function FeedMassiveOverviewPage() {
  const { data: massiveStatus } = useMassiveStatus()
  const configured = Boolean(massiveStatus?.configured)

  return (
    <PageShell className="space-y-4">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            Massive Overview
            <InfoTooltip text={OVERVIEW_INFO} />
          </span>
        }
        description="Polygon stock / option / common capabilities and connection status."
        actions={
          configured ? (
            <Badge
              variant="secondary"
              className="uppercase tracking-wide"
              title={massiveStatus?.delay_notice}
            >
              Delayed feed
            </Badge>
          ) : undefined
        }
      />

      <MassiveStatusStrip massiveStatus={massiveStatus} />

      <p className="text-sm text-muted-foreground">
        Capabilities are organized by feed: <strong className="text-foreground">Stocks</strong> (Massive
        Stocks REST), <strong className="text-foreground">Options</strong> (Massive Options REST / WS /
        Flat Files / Project), and <strong className="text-foreground">Common</strong> (shared REST for
        indicators and market reference).
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        <MassiveOverviewColumn
          title="Stocks"
          grouped={groupedStockChecklistRows()}
          openTo="/settings/feed/massive-stock"
          openLabel="Open Massive Stock"
          configured={configured}
          massiveStatus={massiveStatus}
          tierOkForRow={stockTierOk}
          tradesOkForRow={stockTradesOk}
          effectiveStatus={stockEffectiveStatus}
          shortLabel={stockShortLabel}
        />
        <MassiveOverviewColumn
          title="Options"
          grouped={groupedOptionFeedChecklistRows()}
          openTo="/settings/feed/massive-option"
          openLabel="Open Massive Option"
          configured={configured}
          massiveStatus={massiveStatus}
          tierOkForRow={optionTierOk}
          tradesOkForRow={optionTradesOk}
          effectiveStatus={optionEffectiveStatus}
          shortLabel={optionShortLabel}
        />
        <MassiveOverviewColumn
          title="Common"
          grouped={groupedCommonFeedChecklistRows()}
          openTo="/settings/feed/massive-comm"
          openLabel="Open Massive Common"
          configured={configured}
          massiveStatus={massiveStatus}
          tierOkForRow={optionTierOk}
          tradesOkForRow={optionTradesOk}
          effectiveStatus={optionEffectiveStatus}
          shortLabel={optionShortLabel}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {QUICK_LINKS.map(({ to, label }) => (
          <Button key={to} variant="outline" size="sm" asChild>
            <Link to={to}>{label}</Link>
          </Button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Bookmark this overview:{' '}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{MASSIVE_OVERVIEW_BASE}</code>
      </p>
    </PageShell>
  )
}
