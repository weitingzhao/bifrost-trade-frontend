import { PageHeader, PageShell } from '@/components/layout'
import { MassiveFeedAnchorOutline } from '@/pages/settings/feed/massive/components/MassiveFeedAnchorOutline'
import { MassiveStatusStrip } from '@/pages/settings/feed/massive/components/MassiveStatusStrip'
import { useMassiveFeedHashScroll } from '@/pages/settings/feed/massive/hooks/useMassiveFeedHashScroll'
import { useMassiveStatus } from '@/pages/settings/feed/massive/hooks/useMassiveStatus'
import { MASSIVE_FEED_BRANCHES } from '@/pages/settings/feed/massive/nav/massiveSidebarConfig'

const COMM_GROUPS = MASSIVE_FEED_BRANCHES.find(b => b.id === 'comm')!.groups

export default function FeedMassiveCommPage() {
  useMassiveFeedHashScroll()
  const { data: massiveStatus } = useMassiveStatus()

  return (
    <PageShell className="space-y-4">
      <PageHeader
        title="Massive — Comm"
        description="Shared Massive REST: technical indicators and market operations."
      />
      <MassiveStatusStrip massiveStatus={massiveStatus} />
      <MassiveFeedAnchorOutline groups={COMM_GROUPS} />
    </PageShell>
  )
}
