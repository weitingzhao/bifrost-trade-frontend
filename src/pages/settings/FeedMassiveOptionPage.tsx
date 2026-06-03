import { PageHeader, PageShell } from '@/components/layout'
import { MassiveFeedAnchorOutline } from '@/pages/settings/feed/massive/components/MassiveFeedAnchorOutline'
import { MassiveStatusStrip } from '@/pages/settings/feed/massive/components/MassiveStatusStrip'
import { useMassiveFeedHashScroll } from '@/pages/settings/feed/massive/hooks/useMassiveFeedHashScroll'
import { useMassiveStatus } from '@/pages/settings/feed/massive/hooks/useMassiveStatus'
import { MASSIVE_FEED_BRANCHES } from '@/pages/settings/feed/massive/nav/massiveSidebarConfig'

const OPTION_GROUPS = MASSIVE_FEED_BRANCHES.find(b => b.id === 'option')!.groups

export default function FeedMassiveOptionPage() {
  useMassiveFeedHashScroll()
  const { data: massiveStatus } = useMassiveStatus()

  return (
    <PageShell className="space-y-4">
      <PageHeader
        title="Massive — Option"
        description="Polygon options REST, WebSocket, flat files, and project workflows."
      />
      <MassiveStatusStrip massiveStatus={massiveStatus} />
      <MassiveFeedAnchorOutline groups={OPTION_GROUPS} />
    </PageShell>
  )
}
