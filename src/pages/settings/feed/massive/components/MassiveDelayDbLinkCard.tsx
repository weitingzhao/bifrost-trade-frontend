import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'

export function MassiveDelayDbLinkCard() {
  return (
    <Card variant="elevated">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div>
          <p className="text-sm font-medium">Massive Delay (DB)</p>
          <p className="text-xs text-muted-foreground">
            PostgreSQL-backed delayed stock data and ticker reference jobs (shared with Data Coverage).
          </p>
        </div>
        <Link
          to="/settings/coverage/stock-massive"
          className="text-sm font-medium text-primary hover:underline"
        >
          Open coverage page
        </Link>
      </CardContent>
    </Card>
  )
}
