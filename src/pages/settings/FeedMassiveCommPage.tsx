import { PageHeader, PageShell } from '@/components/layout'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Badge } from '@/components/ui/badge'
import { MassiveCommStatusStrip } from '@/pages/settings/feed/massive/components/MassiveCommStatusStrip'
import { useMassiveFeedHashScroll } from '@/pages/settings/feed/massive/hooks/useMassiveFeedHashScroll'
import { useMassiveStatus } from '@/pages/settings/feed/massive/hooks/useMassiveStatus'
import { MassiveCommFeedBody } from '@/pages/settings/feed/massive/comm/MassiveCommFeedBody'

const COMM_PAGE_INFO =
  'Shared Massive REST capabilities for both options and stocks: Technical Indicators and Market Operations.'

export default function FeedMassiveCommPage() {
  useMassiveFeedHashScroll()
  const { data: massiveStatus } = useMassiveStatus()
  const configured = Boolean(massiveStatus?.configured)

  return (
    <PageShell className="space-y-4">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            Massive — Comm
            <InfoTooltip text={COMM_PAGE_INFO} />
          </span>
        }
        description="Shared Massive REST: technical indicators and market operations."
        actions={
          configured ? (
            <Badge variant="secondary" title={massiveStatus?.delay_notice}>
              Delayed feed
            </Badge>
          ) : null
        }
      />
      <MassiveCommStatusStrip massiveStatus={massiveStatus} />
      <MassiveCommFeedBody massiveStatus={massiveStatus} />
    </PageShell>
  )
}
