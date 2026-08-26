import { Link } from 'react-router-dom'
import { StatusLamp } from '@/components/StatusLamp'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { LampColor } from '@/lib/researchFreshness'
import type { VerdictSegment } from '@/hooks/useDailyVerdict'

export interface SourceLampItem {
  label: string
  lamp: LampColor
}

export interface VerdictStripProps {
  narrative: VerdictSegment
  risk: VerdictSegment
  opportunity: VerdictSegment
  actionHint?: { label: string; to: string }
  sourceLamps?: SourceLampItem[]
  footnote?: string
}

function VerdictRow({ segment }: { segment: VerdictSegment }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2">
        <StatusLamp lamp={segment.lamp} className="h-2 w-2 shrink-0" />
        <p className="text-dense-micro font-semibold uppercase tracking-wide text-muted-foreground">
          {segment.label}
        </p>
        {segment.to ? (
          <Button asChild variant="ghost" size="sm" className="h-5 px-1.5 text-dense-micro ml-auto">
            <Link to={segment.to}>Open</Link>
          </Button>
        ) : null}
      </div>
      <p className="text-dense-label font-medium leading-snug pl-4">{segment.text}</p>
      {segment.meta ? (
        <p className="text-dense-caption text-muted-foreground pl-4 leading-snug">{segment.meta}</p>
      ) : null}
    </div>
  )
}

function SourceLamp({ label, lamp }: SourceLampItem) {
  return (
    <span className="inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground">
      <StatusLamp lamp={lamp} className="h-2 w-2" />
      {label}
    </span>
  )
}

export function VerdictStrip({
  narrative,
  risk,
  opportunity,
  actionHint,
  sourceLamps,
  footnote,
}: VerdictStripProps) {
  return (
    <Card variant="elevated">
      <CardContent className="space-y-3 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-2 min-w-0 flex-1">
            <VerdictRow segment={narrative} />
            <VerdictRow segment={risk} />
            <VerdictRow segment={opportunity} />
          </div>
          {actionHint ? (
            <Button asChild variant="outline" size="sm" className="shrink-0 h-7 text-dense-meta">
              <Link to={actionHint.to}>{actionHint.label}</Link>
            </Button>
          ) : null}
        </div>
        {sourceLamps && sourceLamps.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-2">
            {sourceLamps.map((s) => (
              <SourceLamp key={s.label} label={s.label} lamp={s.lamp} />
            ))}
          </div>
        ) : null}
        {footnote ? (
          <p className="text-dense-micro text-muted-foreground">{footnote}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
