/**
 * Events — the market's own calendar, and the destination for Stock
 * Explorer's events board.
 *
 * Built 2026-09-23 against `Research Events.dc.html` at Rev 2026-09-23.8,
 * which is the design closing the last of Explorer's four tabs: SEPA and
 * Momentum went to Stock ratings, Rules was already a pair of working links,
 * and this is where the board goes.
 *
 * ## Why this could be built without waiting for the pipeline
 *
 * The design added a **four-state rule** in the same round, and the state DEV
 * is actually in — `unfed` — is one of them. All four stores answer `200`
 * with `0` rows and `events/batches` is `count: 0`, so the page says the
 * ingest has never run rather than drawing three empty panels that each imply
 * a quiet market. That is the whole reason the board no longer waits: the
 * honest reading of no data was designed.
 *
 * ## Book is the design's default face and is not built here
 *
 * The prototype has two faces. Book reads the calendar against the book —
 * *3 book legs expire*, *book: +50 sh*, *priced ±8.2% vs model ±6.4%* — and
 * nothing on this side has ever drawn it. Market is the face Explorer's board
 * becomes, so Market is what this page opens on, and Book is drawn disabled
 * with its reason rather than left out: a face the design has and this side
 * does not is owed, and a control with one option reads as a smaller idea.
 */
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader, PageShell } from '@/components/layout'
import { SegmentControl } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { Skeleton } from '@/components/ui/skeleton'
import {
  fetchEventBatches,
  fetchEventCalendar,
  fetchEventRadarEvents,
  fetchEventThemes,
} from '@/api/researchEngine'
import { fmtIsoDateToken } from '@/lib/format'
import { cn } from '@/lib/utils'
import { eventsStanding, type StoreReading } from './eventsStanding'
import { EventsBookFace } from './EventsBookFace'
import { EventsMarketFace } from './EventsMarketFace'

const BATCHES = '/research/events/batches'

const FACE_OPTIONS = [
  {
    value: 'book',
    label: 'Book',
    title: 'The calendar against the book — which legs cross a dated event, and what it is priced at.',
  },
  { value: 'market', label: 'Market', title: "The market's own events, themes and forward calendar" },
]

export default function EventsPage() {
  const [params, setParams] = useSearchParams()
  // The design's default face, now that both are built. `?face=market` keeps
  // every existing link to the other one working.
  const face = params.get('face') === 'market' ? 'market' : 'book'

  const batches = useQuery({
    queryKey: ['research', 'events', 'batches'],
    queryFn: fetchEventBatches,
    staleTime: 5 * 60_000,
  })
  const events = useQuery({
    queryKey: ['research', 'events', 'rows'],
    queryFn: () => fetchEventRadarEvents({ limit: 200 }),
    staleTime: 5 * 60_000,
  })
  const themes = useQuery({
    queryKey: ['research', 'events', 'themes'],
    queryFn: fetchEventThemes,
    staleTime: 5 * 60_000,
  })
  const calendar = useQuery({
    queryKey: ['research', 'events', 'calendar'],
    queryFn: fetchEventCalendar,
    staleTime: 5 * 60_000,
  })

  const stores: StoreReading[] = [
    { path: BATCHES, label: 'Batches', isError: batches.isError, isLoading: batches.isLoading, rows: batches.data?.rows?.length ?? null },
    { path: '/research/event-radar/events', label: 'Events', isError: events.isError, isLoading: events.isLoading, rows: events.data?.rows?.length ?? null },
    { path: '/research/events/themes', label: 'Themes', isError: themes.isError, isLoading: themes.isLoading, rows: themes.data?.rows?.length ?? null },
    { path: '/research/events/calendar', label: 'Forward calendar', isError: calendar.isError, isLoading: calendar.isLoading, rows: calendar.data?.rows?.length ?? null },
  ]

  const last = batches.data?.rows?.[0]
  const standing = eventsStanding(stores, {
    batchesPath: BATCHES,
    lastBatchAt: last ? fmtIsoDateToken(last.collected_at) : null,
  })

  const setFace = (v: string) => {
    const next = new URLSearchParams(params)
    if (v === 'market') next.set('face', 'market')
    else next.delete('face')
    setParams(next, { replace: true })
  }

  return (
    <PageShell className="space-y-3">
      <PageHeader
        breadcrumb={<p className="text-xs font-medium text-primary/90">Home</p>}
        title="Events"
        description="What the market has said and what it is about to say — the events the radar collected, the themes they fall into, and the dated ones still ahead."
        actions={
          <span className="flex flex-wrap items-center gap-2.5">
            <SegmentControl
              size="xs"
              ariaLabel="Face"
              value={face}
              onChange={setFace}
              options={FACE_OPTIONS}
            />
            {standing.state !== 'live' || standing.loading ? null : (
              <span className="flex items-center gap-1.5 text-dense-meta text-muted-foreground">
                <StatusLamp lamp="ok" variant="dot" />
                {batches.data?.rows?.length ?? 0} batches · last{' '}
                {last ? fmtIsoDateToken(last.collected_at) : '—'} ·{' '}
                {events.data?.rows?.length ?? 0} events
              </span>
            )}
          </span>
        }
      />

      {face === 'book' ? (
        <EventsBookFace radarUnfed={standing.state === 'unfed'} />
      ) : standing.loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 rounded" />
          ))}
        </div>
      ) : standing.state === 'live' ? (
        /* The design's own restructure, built 2026-09-24 on the Owner's ask:
           Importance / Direction / theme filters, the themes panel with its
           bull-neutral-bear stack, the forward calendar and the ingest rows.
           `EventRadarBody` stays the Explorer tab's body — nothing deleted. */
        <EventsMarketFace
          events={events.data?.rows ?? []}
          themes={themes.data?.rows ?? []}
          batches={batches.data?.rows ?? []}
          calendar={calendar.data?.rows ?? []}
        />
      ) : (
        <StoreStanding standing={standing} onRetry={() => { void batches.refetch(); void events.refetch(); void themes.refetch(); void calendar.refetch() }} />
      )}
    </PageShell>
  )
}

/**
 * One panel for all four stores, which is the design's rule.
 *
 * Each block asking its own store and drawing its own empty state was what
 * this board used to do, and on an unfed pipeline it produced three shells
 * that each read as "the market was quiet".
 */
function StoreStanding({
  standing,
  onRetry,
}: {
  standing: ReturnType<typeof eventsStanding>
  onRetry: () => void
}) {
  const failed = standing.state === 'failed'
  return (
    <section className="overflow-hidden rounded-lg border border-border" aria-label="Event pipeline">
      <div className="space-y-2 border-b border-border bg-secondary px-3 py-3">
        <p className="flex flex-wrap items-center gap-2">
          <StatusLamp lamp={failed ? 'fail' : 'gray'} variant="dot" />
          <span className="text-dense-body font-semibold text-foreground">{standing.title}</span>
          {failed ? (
            <button type="button" onClick={onRetry} className="text-dense-meta text-primary hover:underline">
              Retry
            </button>
          ) : null}
        </p>
        <p className="max-w-[90ch] text-dense-meta leading-relaxed text-muted-foreground">
          {standing.detail}
        </p>
        {standing.state === 'unfed' ? (
          <p className="max-w-[90ch] text-dense-caption leading-relaxed text-muted-foreground">
            The radar is fed by the event pipeline, not by this page. Drop .txt / .md / .json into{' '}
            <span className="font-mono text-foreground/80">事件雷达工作流/input/</span> and the cron
            ingest fills <span className="font-mono text-foreground/80">research.event_radar</span> —
            the four readings below are what a fed board would return.
          </p>
        ) : null}
      </div>

      <table className="w-full border-collapse">
        <tbody>
          {standing.stores.map((s) => (
            <tr key={s.path} className="border-b border-border/60 last:border-b-0">
              <td className="px-3 py-1.5">
                <StatusLamp lamp={s.isError ? 'fail' : 'gray'} variant="dot" />
              </td>
              <td className="px-1 py-1.5 text-dense-meta text-foreground">{s.label}</td>
              <td className="px-1 py-1.5 font-mono text-dense-caption text-muted-foreground">
                {s.path}
              </td>
              <td className={cn('px-3 py-1.5 text-right font-mono text-dense-caption', s.isError ? 'text-danger' : 'text-muted-foreground')}>
                {s.isError
                  ? 'no answer'
                  : s.rows == null
                    ? '—'
                    : standing.state === 'unfed'
                      ? 'answered, 0 rows · never fed'
                      : s.rows === 0
                        ? 'answered, 0 rows in window'
                        : `answered · ${s.rows} rows`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
