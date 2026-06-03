import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  MASSIVE_OPTIONS_COVERAGE_PLAN_URL,
  postMassiveOptionsApiCoverageSync,
} from '@/api/massive/optionFeed'

export function MassiveOptionsCoverageBanner() {
  const [embeddedOpen, setEmbeddedOpen] = useState(false)
  const [syncBusy, setSyncBusy] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  return (
    <Card
      variant="elevated"
      id="feed-massive-api-coverage"
      aria-label="Massive Options API coverage sheet"
    >
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold">Official API vs project coverage</p>
            <p className="text-xs text-muted-foreground">
              Massive / Polygon Options endpoints, use cases, checklist mapping, and implementation status. Same
              viewer is available under MkDocs Research → Massive API coverage.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={MASSIVE_OPTIONS_COVERAGE_PLAN_URL} target="_blank" rel="noopener noreferrer">
                Open in new tab
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={syncBusy}
              onClick={async () => {
                setSyncBusy(true)
                setSyncMsg(null)
                try {
                  const res = await postMassiveOptionsApiCoverageSync()
                  setSyncMsg(
                    res.ok
                      ? 'Synced coverage HTML to frontend/public/plans.'
                      : (res.error ?? 'Sync failed'),
                  )
                } catch (e: unknown) {
                  setSyncMsg(e instanceof Error ? e.message : 'Sync failed')
                } finally {
                  setSyncBusy(false)
                }
              }}
            >
              {syncBusy ? 'Syncing…' : 'Sync HTML'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEmbeddedOpen(v => !v)}
              aria-expanded={embeddedOpen}
            >
              {embeddedOpen ? 'Hide embedded viewer' : 'Show embedded viewer'}
            </Button>
          </div>
        </div>
        {syncMsg ? <p className="text-xs text-muted-foreground">{syncMsg}</p> : null}
        {embeddedOpen ? (
          <div className="overflow-hidden rounded-md border border-border">
            <iframe
              title="Massive Options API coverage sheet"
              src={`${MASSIVE_OPTIONS_COVERAGE_PLAN_URL}?embed=1`}
              className="h-[min(70vh,640px)] w-full bg-background"
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
