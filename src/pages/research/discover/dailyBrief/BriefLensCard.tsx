/**
 * One Daily Brief card = one exhibit: the same band, label, meaning and
 * track record the hub view's verdict strip shows for this lens, with the
 * card's own line of numbers and the hub view it opens.
 * research-loop-automation C3.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DenseTag } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { DailyBriefEventsCard, DailyBriefLensCard } from '@/api/researchEngine'
import { asOfLine, cardCaveat } from '@/lib/dailyBrief'
import { labelForBand, toneForBand, trackRecordLine } from '@/lib/lensVerdict'
import { cn } from '@/lib/utils'

function tagVariant(tone: string | null): 'danger' | 'warning' | 'success' | 'neutral' {
  if (tone === 'danger' || tone === 'warning' || tone === 'success') return tone
  return 'neutral'
}

export function BriefLensCard({
  title,
  card,
  openTo,
  emphasis = 'default',
  children,
}: {
  title: string
  card: DailyBriefLensCard | DailyBriefEventsCard
  openTo: string
  emphasis?: 'primary' | 'default'
  children?: ReactNode
}) {
  const lens = 'lens' in card ? card : null
  const bandLabel = lens?.band ? labelForBand(lens.lens, lens.band) : null
  const tone = lens?.band ? toneForBand(lens.lens, lens.band) : null
  const record = lens ? trackRecordLine(lens.track_record, lens.band) : null
  const caveat = lens ? cardCaveat(lens) : null
  const asOf = lens ? asOfLine(lens) : null
  return (
    <Card variant="elevated" className={cn(emphasis === 'primary' && 'ring-1 ring-primary/20 shadow-sm')}>
      <CardContent className="space-y-1.5 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <StatusLamp lamp={card.lamp} className="h-2.5 w-2.5 shrink-0" />
            <p className="truncate text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
            {bandLabel ? <DenseTag variant={tagVariant(tone)}>{bandLabel}</DenseTag> : null}
          </div>
          <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-dense-meta">
            <Link to={openTo}>Open</Link>
          </Button>
        </div>
        <p className="text-dense-label font-medium leading-snug">{card.verdict}</p>
        {lens?.means ? <p className="text-dense-meta leading-snug text-muted-foreground">{lens.means}</p> : null}
        {record ? <p className="text-dense-caption text-muted-foreground">{record}</p> : null}
        {caveat ? <p className="text-dense-caption italic text-muted-foreground">{caveat}</p> : null}
        {asOf ? <p className="text-dense-micro text-muted-foreground">{asOf}</p> : null}
        {children}
      </CardContent>
    </Card>
  )
}
