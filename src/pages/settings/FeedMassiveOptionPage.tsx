import { PageHeader, PageShell } from '@/components/layout'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Badge } from '@/components/ui/badge'
import { MassiveOptionStatusStrip } from '@/pages/settings/feed/massive/components/MassiveOptionStatusStrip'
import { useMassiveFeedHashScroll } from '@/pages/settings/feed/massive/hooks/useMassiveFeedHashScroll'
import { useMassiveStatus } from '@/pages/settings/feed/massive/hooks/useMassiveStatus'
import { MassiveOptionFeedBody } from '@/pages/settings/feed/massive/option/MassiveOptionFeedBody'

const OPTION_PAGE_INFO =
  'Massive (Polygon) Options API coverage sheet and capability status. Greeks/IV live under Research → Option Coverage; shared REST (Technical Indicators, Market Operations) under Feed → Massive Common.'

export default function FeedMassiveOptionPage() {
  useMassiveFeedHashScroll()
  const { data: massiveStatus } = useMassiveStatus()
  const configured = Boolean(massiveStatus?.configured)

  return (
    <PageShell className="space-y-4">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            Massive — Option
            <InfoTooltip text={OPTION_PAGE_INFO} />
          </span>
        }
        description="Polygon options REST, WebSocket, flat files, and project workflows."
        actions={
          configured ? (
            <Badge variant="secondary" title={massiveStatus?.delay_notice}>
              Delayed feed
            </Badge>
          ) : null
        }
      />
      <MassiveOptionStatusStrip massiveStatus={massiveStatus} />
      <MassiveOptionFeedBody massiveStatus={massiveStatus} />
    </PageShell>
  )
}
