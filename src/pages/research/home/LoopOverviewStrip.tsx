/**
 * The Loop, end to end, and where it is thin.
 *
 * Research has a page for every segment and none for the circuit, so the one
 * question the whole system exists to answer — is this thing learning? — has no
 * home. It is answerable: proposals that never get decided cannot be acted on,
 * and positions never scored cannot feed back into the rules. Each of those
 * pages looks fine on its own while the circuit is open.
 *
 * The segments are drawn at equal weight rather than scaled to their counts. A
 * volume-proportional ring would make a busy front half look like a healthy
 * system, which is exactly the impression this view exists to correct.
 */
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useLoopOverview, type LoopSegment } from '@/hooks/useLoopOverview'

/** Where each segment lives, so the overview dives into the page that owns it. */
const SEGMENT_HREF: Record<LoopSegment['id'], string> = {
  system: '/research/loop/harness',
  screen: '/research/loop/harness',
  decide: '/research/loop/decisions',
  act: '/research/loop/hypotheses',
  learn: '/research/signal-decay',
}

function SegmentCell({ segment, isLast }: { segment: LoopSegment; isLast: boolean }) {
  return (
    <>
      <Link
        to={SEGMENT_HREF[segment.id]}
        className={cn(
          'group min-w-0 flex-1 rounded-md border px-2.5 py-2 transition-colors',
          segment.starved
            ? 'border-warning/40 bg-warning/5 hover:bg-warning/10'
            : 'border-border/60 bg-secondary/40 hover:bg-secondary/70',
        )}
      >
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              'text-dense-body font-semibold tabular-nums',
              segment.starved ? 'text-warning' : 'text-foreground',
            )}
          >
            {segment.value ?? '—'}
          </span>
          <span className="text-dense-caption text-muted-foreground">{segment.unit}</span>
          {segment.starved ? (
            <AlertTriangle className="size-3 shrink-0 text-warning" aria-hidden />
          ) : null}
        </div>
        <p className="truncate text-dense-meta font-medium group-hover:underline">
          {segment.label}
        </p>
        <p className="truncate text-dense-caption text-muted-foreground/70" title={segment.detail}>
          {segment.detail}
        </p>
      </Link>
      {!isLast ? (
        <ArrowRight
          className="size-3 shrink-0 self-center text-muted-foreground/40"
          aria-hidden
        />
      ) : null}
    </>
  )
}

export function LoopOverviewStrip() {
  const loop = useLoopOverview()

  if (loop.isLoading) {
    return <Skeleton className="h-28 w-full rounded-md" />
  }

  const firstStarved = loop.segments.find((s) => s.starved)
  const { raised, taken } = loop.feedback

  return (
    <Card variant="elevated">
      <CardContent className="space-y-2 px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-dense-body font-semibold">The loop</h2>
          <span className="text-dense-caption text-muted-foreground">
            last {loop.windowDays} days · rules → screen → decide → act → learn
          </span>
        </div>

        <div className="flex min-w-0 items-stretch gap-1.5 overflow-x-auto">
          {loop.segments.map((s, i) => (
            <SegmentCell key={s.id} segment={s} isLast={i === loop.segments.length - 1} />
          ))}
        </div>

        {/* The edge that closes the circuit. It is drawn separately because it
            runs backwards — results are supposed to change the rules — and
            because it is the one most likely to be carrying nothing. */}
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/50 px-2.5 py-1.5">
          <RotateCcw className="size-3 shrink-0 text-muted-foreground/60" aria-hidden />
          <Link
            to="/research/loop/decisions"
            className="text-dense-meta font-medium hover:underline"
          >
            Back into your rules
          </Link>
          <span className="text-dense-caption text-muted-foreground">
            {raised} suggestion{raised === 1 ? '' : 's'} raised · {taken} taken up
          </span>
          {raised > 0 && taken === 0 ? (
            <span className="text-dense-caption text-warning">
              — the loop proposes changes to itself and none has been adopted, so the
              rules have not moved
            </span>
          ) : null}
        </div>

        {firstStarved ? (
          <p className="text-dense-caption text-warning">
            Thinnest at <span className="font-medium">{firstStarved.label}</span> —{' '}
            {firstStarved.detail}. Everything downstream of it is starved of input, so a
            busy front half is not evidence the system is working.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
