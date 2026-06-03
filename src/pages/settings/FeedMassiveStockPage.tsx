import { PageShell } from '@/components/layout'
import { MassiveRefJobProvider } from '@/components/massive/MassiveRefJobProvider'
import { MassiveStockStatusStrip } from '@/pages/settings/feed/massive/components/MassiveStockStatusStrip'
import { useMassiveStatus } from '@/pages/settings/feed/massive/hooks/useMassiveStatus'
import { MassiveStockFeedBody } from '@/pages/settings/feed/massive/stock/MassiveStockFeedBody'

export default function FeedMassiveStockPage() {
  const { data: massiveStatus } = useMassiveStatus()

  return (
    <PageShell className="space-y-4">
      <MassiveRefJobProvider>
        <MassiveStockStatusStrip massiveStatus={massiveStatus} />
        <MassiveStockFeedBody massiveStatus={massiveStatus} />
      </MassiveRefJobProvider>
    </PageShell>
  )
}
