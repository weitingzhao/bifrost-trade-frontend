import { PageHeader, PageShell } from '@/components/layout'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { OptionCoverageBody } from '@/pages/settings/coverage/option/OptionCoverageBody'

export default function CoverageOptionPage() {
  return (
    <PageShell className="space-y-4">
      <PageHeader
        title="Data Coverage — Option"
        description="Daily option pipeline status, Greeks/IV coverage, and Massive snapshot tools."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings/coverage/overview">Overview</Link>
          </Button>
        }
      />
      <OptionCoverageBody />
    </PageShell>
  )
}
