/**
 * Event Radar board — three acts: theme split, narrative timeline, macro gap/forward.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  EmptyState,
  denseTableNumCell,
} from '@/components/data-display'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  fetchEventThemes,
  fetchMacroGap,
  fetchMacroForward,
  type EventRadarRow,
} from '@/api/researchEngine'

interface ThemeSplitRow {
  theme: string
  bull: number
  neutral: number
  bear: number
  total: number
}

function buildThemeSplits(events: EventRadarRow[]): ThemeSplitRow[] {
  const map = new Map<string, ThemeSplitRow>()
  for (const e of events) {
    const theme = (e.theme || 'Unassigned').trim() || 'Unassigned'
    const row = map.get(theme) ?? { theme, bull: 0, neutral: 0, bear: 0, total: 0 }
    if (e.direction > 0) row.bull += 1
    else if (e.direction < 0) row.bear += 1
    else row.neutral += 1
    row.total += 1
    map.set(theme, row)
  }
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 12)
}

function ThemeSplitBars({ rows }: { rows: ThemeSplitRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No themed events"
        description="Process event batches to populate theme splits"
      />
    )
  }
  const maxTotal = Math.max(...rows.map((r) => r.total), 1)
  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const w = (r.total / maxTotal) * 100
        const bullPct = r.total > 0 ? (r.bull / r.total) * 100 : 0
        const bearPct = r.total > 0 ? (r.bear / r.total) * 100 : 0
        const neutralPct = r.total > 0 ? (r.neutral / r.total) * 100 : 0
        return (
          <div key={r.theme} className="space-y-0.5">
            <div className="flex items-center justify-between gap-2 text-dense-meta">
              <span className="truncate font-medium">{r.theme}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{r.total}</span>
            </div>
            <div
              className="flex h-3 overflow-hidden rounded-sm bg-muted"
              style={{ width: `${w}%`, minWidth: '40%' }}
              title={`Bull ${r.bull} · Neutral ${r.neutral} · Bear ${r.bear}`}
            >
              <div className="bg-profit h-full" style={{ width: `${bullPct}%` }} />
              <div className="bg-muted-foreground/40 h-full" style={{ width: `${neutralPct}%` }} />
              <div className="bg-loss h-full" style={{ width: `${bearPct}%` }} />
            </div>
          </div>
        )
      })}
      <p className="text-dense-micro text-muted-foreground pt-1">
        Green = bullish · Gray = neutral · Red = bearish (stacked by theme)
      </p>
    </div>
  )
}

function NarrativeTimeline({ events }: { events: EventRadarRow[] }) {
  const points = useMemo(() => {
    return events
      .map((e) => {
        const dateStr = e.event_date || e.collected_at?.slice(0, 10) || ''
        return { id: e.event_id, date: dateStr, label: e.subject || e.event_summary, direction: e.direction }
      })
      .filter((p) => p.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-40)
  }, [events])

  if (points.length === 0) {
    return (
      <EmptyState
        title="No dated events"
        description="Events need event_date or collected_at for timeline (R4 adds start/end windows)"
      />
    )
  }

  const minDate = points[0].date
  const maxDate = points[points.length - 1].date
  const span =
    minDate === maxDate ? 1 : new Date(maxDate).getTime() - new Date(minDate).getTime()

  return (
    <div className="space-y-2">
      <div className="relative h-8 rounded-md bg-muted/50">
        {points.map((p) => {
          const t = new Date(p.date).getTime() - new Date(minDate).getTime()
          const pct = span <= 0 ? 50 : (t / span) * 100
          const color =
            p.direction > 0 ? 'var(--color-profit, #22c55e)' : p.direction < 0 ? 'var(--color-loss, #ef4444)' : 'var(--muted-foreground)'
          return (
            <div
              key={p.id}
              className="absolute top-1/2 -translate-y-1/2 size-2 rounded-full"
              style={{ left: `calc(${pct}% - 4px)`, background: color }}
              title={`${p.date}: ${p.label}`}
            />
          )
        })}
      </div>
      <div className="flex justify-between text-dense-micro text-muted-foreground">
        <span>{minDate}</span>
        <span>{maxDate}</span>
      </div>
      <p className="text-dense-micro text-muted-foreground">
        Point timeline from event_date (duration bands in R4)
      </p>
    </div>
  )
}

function MacroPanel() {
  const gapQ = useQuery({ queryKey: ['macro-gap'], queryFn: () => fetchMacroGap(20) })
  const fwdQ = useQuery({ queryKey: ['macro-forward'], queryFn: () => fetchMacroForward(7) })

  const gapRows = gapQ.data?.rows ?? []
  const fwdRows = fwdQ.data?.rows ?? []

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Card variant="elevated">
        <CardHeader className="pb-2">
          <CardTitle className="text-dense-label">Macro gap (actual vs expected)</CardTitle>
        </CardHeader>
        <CardContent>
          {gapQ.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : gapRows.length === 0 ? (
            <EmptyState
              title="Macro pipeline pending"
              description="Drop CSV into Research-workspace macro/input/ or run macro_ingest Cron"
            />
          ) : (
            <DenseDataTable>
              <DenseTableHeader>
                <DenseTableHeadRow>
                  <DenseTableHead>Date</DenseTableHead>
                  <DenseTableHead>Indicator</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>Gap %</DenseTableHead>
                </DenseTableHeadRow>
              </DenseTableHeader>
              <DenseTableBody>
                {gapRows.slice(0, 8).map((r) => (
                  <DenseTableRow key={r.macro_id}>
                    <DenseTableCell className="text-dense-meta">{r.event_date}</DenseTableCell>
                    <DenseTableCell>{r.indicator}</DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>
                      {r.gap_pct != null ? `${(Number(r.gap_pct) * 100).toFixed(2)}%` : '—'}
                    </DenseTableCell>
                  </DenseTableRow>
                ))}
              </DenseTableBody>
            </DenseDataTable>
          )}
        </CardContent>
      </Card>
      <Card variant="elevated">
        <CardHeader className="pb-2">
          <CardTitle className="text-dense-label">Macro forward (7d)</CardTitle>
        </CardHeader>
        <CardContent>
          {fwdQ.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : fwdRows.length === 0 ? (
            <EmptyState
              title="No forward macro rows"
              description="Forward releases appear when macro CSV includes forward_flag rows"
            />
          ) : (
            <DenseDataTable>
              <DenseTableHeader>
                <DenseTableHeadRow>
                  <DenseTableHead>Date</DenseTableHead>
                  <DenseTableHead>Indicator</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>Expected</DenseTableHead>
                </DenseTableHeadRow>
              </DenseTableHeader>
              <DenseTableBody>
                {fwdRows.slice(0, 8).map((r) => (
                  <DenseTableRow key={r.macro_id}>
                    <DenseTableCell className="text-dense-meta">{r.event_date}</DenseTableCell>
                    <DenseTableCell>{r.indicator}</DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>
                      {r.expected_value != null ? String(r.expected_value) : '—'}
                    </DenseTableCell>
                  </DenseTableRow>
                ))}
              </DenseTableBody>
            </DenseDataTable>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function EventRadarDashboard({ events }: { events: EventRadarRow[] }) {
  const themesQ = useQuery({ queryKey: ['event-radar-themes-board'], queryFn: fetchEventThemes })
  const themeSplits = useMemo(() => buildThemeSplits(events), [events])

  return (
    <div className="space-y-3 mb-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card variant="elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-dense-label">Theme split (bull / neutral / bear)</CardTitle>
          </CardHeader>
          <CardContent>
            {themesQ.isLoading && events.length === 0 ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <ThemeSplitBars rows={themeSplits} />
            )}
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-dense-label">Narrative timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <NarrativeTimeline events={events} />
          </CardContent>
        </Card>
      </div>
      <MacroPanel />
    </div>
  )
}
