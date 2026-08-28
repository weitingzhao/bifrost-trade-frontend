import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader, PageShell } from '@/components/layout'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  EmptyState,
  SegmentControl,
  denseTableNumCell,
} from '@/components/data-display'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  fetchEventRadarEvents,
  fetchEventBatches,
  fetchEventThemes,
  fetchEventCalendar,
  type EventRadarRow,
} from '@/api/researchEngine'
import { EventRadarDashboard } from '@/components/research/EventRadarDashboard'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { SaveAsHypothesisButton } from '@/components/research/SaveAsHypothesisButton'

type ViewMode = 'events' | 'themes' | 'calendar'

function directionTag(d: number) {
  if (d > 0) return <DenseTag variant="success">Bullish</DenseTag>
  if (d < 0) return <DenseTag variant="danger">Bearish</DenseTag>
  return <DenseTag variant="neutral">Neutral</DenseTag>
}

/** Pipeline importance scale: 1=low, 2=medium, 3=high. */
function importanceTag(imp: number | null) {
  if (imp == null) return '—'
  if (imp >= 3) return <DenseTag variant="danger">High</DenseTag>
  if (imp >= 2) return <DenseTag variant="warning">Medium</DenseTag>
  return <DenseTag variant="neutral">Low</DenseTag>
}

function sentimentBar(score: number) {
  const clamped = Math.max(-10, Math.min(10, score))
  const pct = ((clamped + 10) / 20) * 100
  return (
    <svg width={60} height={12} viewBox="0 0 60 12" role="img" aria-label={`Sentiment ${score}`}>
      <rect x={0} y={2} width={60} height={8} rx={2} fill="var(--border)" />
      <rect x={0} y={2} width={(pct / 100) * 60} height={8} rx={2} fill={score >= 0 ? 'var(--color-profit, #22c55e)' : 'var(--color-loss, #ef4444)'} />
    </svg>
  )
}

export default function EventRadarPage() {
  const [view, setView] = useState<ViewMode>('events')
  const [importanceFilter, setImportanceFilter] = useState<string>('all')

  const eventsQ = useQuery({
    queryKey: ['event-radar-events'],
    queryFn: () => fetchEventRadarEvents({ limit: 200 }),
  })
  const themesQ = useQuery({
    queryKey: ['event-radar-themes'],
    queryFn: fetchEventThemes,
    enabled: view === 'themes',
  })
  const calendarQ = useQuery({
    queryKey: ['event-radar-calendar'],
    queryFn: fetchEventCalendar,
    enabled: view === 'calendar',
  })
  const batchesQ = useQuery({
    queryKey: ['event-radar-batches'],
    queryFn: fetchEventBatches,
  })

  const allEvents = useMemo(
    () => eventsQ.data?.rows ?? [],
    [eventsQ.data?.rows],
  )
  const filteredEvents = useMemo(() => {
    if (importanceFilter === 'all') return allEvents
    // Pipeline scale: 3=high, 2=medium, 1=low
    const want =
      importanceFilter === 'high' ? 3 : importanceFilter === 'medium' ? 2 : 1
    return allEvents.filter((r) => (r.importance ?? 0) === want)
  }, [allEvents, importanceFilter])

  const latestBatchId =
    (batchesQ.data?.rows ?? [])[0]?.batch_id ?? null
  const topEventSymbols = useMemo(() => {
    const set = new Set<string>()
    for (const row of filteredEvents.slice(0, 8)) {
      for (const raw of (row.affected_symbols ?? '').split(/[,\s]+/)) {
        const s = raw.trim().toUpperCase()
        if (s) set.add(s)
      }
      if (set.size >= 6) break
    }
    return Array.from(set)
  }, [filteredEvents])

  return (
    <PageShell>
      <PageHeader
        title="Event Radar"
        description="Event table, theme aggregates, and forward calendar"
        actions={
          <div className="flex items-center gap-1.5">
            <AskCopilotButton
              originPage="event-radar"
              originLabel="Event Radar"
              symbol={topEventSymbols[0]}
              snapshot={compactSnapshot({
                view,
                importance: importanceFilter,
                batch_id: latestBatchId,
                top_symbols: topEventSymbols,
              })}
              suggestedPrompt="Which events on this radar look most material, and which symbols should I watch?"
            />
            <SaveAsHypothesisButton
              originPage="event-radar"
              defaultTitle="Event Radar hypothesis"
              defaultSymbols={topEventSymbols}
              defaultTags={['events']}
              originRef={{
                view,
                importance: importanceFilter,
                batch_id: latestBatchId,
              }}
            />
          </div>
        }
      />

      <div className="flex items-center gap-4 mb-4">
        <SegmentControl
          value={view}
          onChange={(v) => setView(v as ViewMode)}
          options={[
            { value: 'events', label: 'Events' },
            { value: 'themes', label: 'Themes' },
            { value: 'calendar', label: 'Calendar' },
          ]}
        />
        {view === 'events' && (
          <SegmentControl
            value={importanceFilter}
            onChange={setImportanceFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
          />
        )}
        {batchesQ.data && (
          <span className="text-dense-meta text-muted-foreground ml-auto">
            {batchesQ.data.count} batches
          </span>
        )}
      </div>

      <EventRadarDashboard events={allEvents} />

      {view === 'events' && (
        <>
          {eventsQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <EmptyState
              title={
                allEvents.length === 0
                  ? 'No events yet'
                  : 'No events match filters'
              }
              description={
                allEvents.length === 0
                  ? 'Drop .txt / .md / .json into Research-workspace 事件雷达工作流/input/. Cron ingest upserts research.event_radar (D10 advisory).'
                  : 'Try All importance or clear the current filter.'
              }
            />
          ) : (
            <DenseDataTable>
              <DenseTableHeader>
                <DenseTableHeadRow>
                  <DenseTableHead>Source</DenseTableHead>
                  <DenseTableHead>Subject</DenseTableHead>
                  <DenseTableHead>Event</DenseTableHead>
                  <DenseTableHead>Symbols</DenseTableHead>
                  <DenseTableHead>Direction</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>Certainty</DenseTableHead>
                  <DenseTableHead>Sentiment</DenseTableHead>
                  <DenseTableHead>Theme</DenseTableHead>
                  <DenseTableHead>Importance</DenseTableHead>
                  <DenseTableHead>Date</DenseTableHead>
                </DenseTableHeadRow>
              </DenseTableHeader>
              <DenseTableBody>
                {filteredEvents.map((row: EventRadarRow) => (
                  <DenseTableRow key={row.event_id}>
                    <DenseTableCell className="max-w-[100px] truncate">
                      {row.source}
                    </DenseTableCell>
                    <DenseTableCell className="max-w-[120px] truncate">
                      {row.subject}
                    </DenseTableCell>
                    <DenseTableCell className="max-w-[200px] truncate">
                      {row.event_summary}
                    </DenseTableCell>
                    <DenseTableCell className="max-w-[80px] truncate">
                      {row.affected_symbols}
                    </DenseTableCell>
                    <DenseTableCell>{directionTag(row.direction)}</DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>
                      {row.certainty ?? '—'}
                    </DenseTableCell>
                    <DenseTableCell>{sentimentBar(row.sentiment)}</DenseTableCell>
                    <DenseTableCell>
                      {row.theme ? <DenseTag variant="neutral">{row.theme}</DenseTag> : '—'}
                    </DenseTableCell>
                    <DenseTableCell>{importanceTag(row.importance)}</DenseTableCell>
                    <DenseTableCell className="text-dense-meta text-muted-foreground">
                      {row.collected_at ?? '—'}
                    </DenseTableCell>
                  </DenseTableRow>
                ))}
              </DenseTableBody>
            </DenseDataTable>
          )}
        </>
      )}

      {view === 'themes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {themesQ.isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))
          ) : !themesQ.data?.rows?.length ? (
            <EmptyState title="No themes" description="Process events to generate theme aggregates" />
          ) : (
            themesQ.data.rows.map((t) => (
              <Card key={t.theme} variant="elevated">
                <CardHeader className="pb-1">
                  <CardTitle className="text-dense-label">{t.theme}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-4 text-dense-meta">
                  <span>{t.count} events</span>
                  <span>
                    Direction:{' '}
                    <span
                      className={
                        t.direction_avg > 0
                          ? 'text-profit'
                          : t.direction_avg < 0
                            ? 'text-loss'
                            : 'text-muted-foreground'
                      }
                    >
                      {t.direction_avg > 0 ? '+' : ''}
                      {t.direction_avg}
                    </span>
                  </span>
                  <span>Sentiment: {t.sentiment_avg}</span>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {view === 'calendar' && (
        <>
          {calendarQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !calendarQ.data?.rows?.length ? (
            <EmptyState title="No upcoming events" description="No forward-looking events detected" />
          ) : (
            <DenseDataTable>
              <DenseTableHeader>
                <DenseTableHeadRow>
                  <DenseTableHead>Date</DenseTableHead>
                  <DenseTableHead>Subject</DenseTableHead>
                  <DenseTableHead>Event</DenseTableHead>
                  <DenseTableHead>Symbols</DenseTableHead>
                  <DenseTableHead>Direction</DenseTableHead>
                  <DenseTableHead>Importance</DenseTableHead>
                  <DenseTableHead>Theme</DenseTableHead>
                </DenseTableHeadRow>
              </DenseTableHeader>
              <DenseTableBody>
                {calendarQ.data.rows.map((row: EventRadarRow) => (
                  <DenseTableRow key={row.event_id}>
                    <DenseTableCell className="text-dense-meta">
                      {row.collected_at ?? '—'}
                    </DenseTableCell>
                    <DenseTableCell className="max-w-[120px] truncate">
                      {row.subject}
                    </DenseTableCell>
                    <DenseTableCell className="max-w-[200px] truncate">
                      {row.event_summary}
                    </DenseTableCell>
                    <DenseTableCell>{row.affected_symbols}</DenseTableCell>
                    <DenseTableCell>{directionTag(row.direction)}</DenseTableCell>
                    <DenseTableCell>{importanceTag(row.importance)}</DenseTableCell>
                    <DenseTableCell>
                      {row.theme ? <DenseTag variant="neutral">{row.theme}</DenseTag> : '—'}
                    </DenseTableCell>
                  </DenseTableRow>
                ))}
              </DenseTableBody>
            </DenseDataTable>
          )}
        </>
      )}
    </PageShell>
  )
}
