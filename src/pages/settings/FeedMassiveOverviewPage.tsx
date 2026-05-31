import { Link } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/layout'
import { Button } from '@/components/ui/button'

const LINKS = [
  { to: '/settings/feed/massive-stock', label: 'Stock' },
  { to: '/settings/feed/massive-option', label: 'Option' },
  { to: '/settings/feed/massive-comm', label: 'Common' },
  { to: '/settings/api', label: 'Massive API health' },
] as const

export default function FeedMassiveOverviewPage() {
  return (
    <PageShell className="space-y-4">
      <PageHeader
        title="Massive — Overview"
        description="Polygon stock / option / common capabilities and health."
      />
      <div className="flex flex-wrap gap-2">
        {LINKS.map(({ to, label }) => (
          <Button key={to} variant="outline" size="sm" asChild>
            <Link to={to}>{label}</Link>
          </Button>
        ))}
      </div>
    </PageShell>
  )
}
