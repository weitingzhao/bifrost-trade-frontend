/**
 * The Journal's Day view (design `Book Journal.dc.html` Day tab, Owner
 * 2026-09-26; store K6): the raw trail of one trading day — notes, visits,
 * fills, Inbox cards, Copilot threads — read from the stores it happened in,
 * beside that day's memory changes.
 *
 * The design's right column opens with the distill's **end-of-day prose
 * summary**, every sentence citing its traces. No engine writes prose yet —
 * that panel names the gap instead of inventing sentences (§20; the memory
 * changes below it are live).
 */
import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchJournalDay, type DayTrace } from '@/api/research/journal'
import { ViewState } from '@bifrost/ui'
import { failedDetail } from '@/lib/viewState'
import { etTodayIso } from '@/lib/freshness'
import { positionsUi } from '@/components/positions/positionsUi'
import { cn } from '@/lib/utils'

const KIND_INK: Record<DayTrace['kind'], string> = {
  note: 'text-foreground',
  thread: 'text-[var(--sk-trade,#c084fc)]',
  fill: 'text-muted-foreground',
  visit: 'text-muted-foreground',
  decision: 'text-warning',
}

function localDay(iso: string): string {
  // The trace's clock, as the trader reads it: HH:MM local to the browser.
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function DayView() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  // A New York day, always: opened bare it is today in New York. Left to the
  // server, no `date` means the server process's own local date — on a UTC
  // host that is tomorrow from 20:00 ET.
  const day = params.get('day') || etTodayIso()

  const dayQ = useQuery({
    queryKey: ['research-engine', 'journal', 'day', day],
    queryFn: () => fetchJournalDay(day),
    refetchInterval: 120_000,
    retry: 1,
  })

  const traces = useMemo(() => dayQ.data?.traces ?? [], [dayQ.data])
  const changes = dayQ.data?.changes ?? []
  const date = dayQ.data?.date ?? day

  const setDay = (value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set('day', value)
    else next.delete('day')
    setParams(next, { replace: true })
  }

  return (
    <>
      <div data-sr-toolbar="">
        <span data-sr-tb="label">Day</span>
        <input
          type="date"
          aria-label="Day"
          className={cn(positionsUi.input, 'h-6')}
          value={date}
          onChange={(e) => setDay(e.target.value)}
        />
        <span data-sr-tb="sep" />
        <span className="text-dense-micro text-muted-foreground">
          ⌥N adds a note from any page
        </span>
      </div>

      {dayQ.isLoading ? (
        <section className="overflow-hidden mat-card">
          <ViewState kind="loading" title="Reading the day" rows={8} cols={4} />
        </section>
      ) : dayQ.isError ? (
        <section className="overflow-hidden mat-card">
          <ViewState
            kind="failed"
            title="Couldn’t read the day"
            detail={failedDetail(dayQ, 'The journal stores did not answer.')}
            onAction={() => void dayQ.refetch()}
          />
        </section>
      ) : (
        <div className="flex flex-wrap items-start gap-3">
          <section className="min-w-0 flex-[999_1_32.5rem] overflow-hidden mat-card">
            <header className="flex flex-wrap items-baseline gap-2 border-b border-border px-3 py-2.5">
              <h2 className="text-dense-body font-semibold">Trail</h2>
              <span className="text-dense-meta text-muted-foreground">
                {date} · {traces.length} trace{traces.length === 1 ? '' : 's'}
              </span>
            </header>
            {traces.length === 0 ? (
              <ViewState
                kind="empty"
                title="Nothing on this day"
                detail="No notes, visits, fills, Inbox cards or threads carry this date."
              />
            ) : (
              <div className="flex flex-col">
                {traces.map((t, i) => (
                  <button
                    key={`${t.at}-${i}`}
                    type="button"
                    onClick={() => (t.to ? navigate(t.to) : undefined)}
                    className={cn(
                      'grid grid-cols-[44px_64px_minmax(0,1fr)] items-baseline gap-2.5 px-3 py-1.5 text-left',
                      i > 0 && 'border-t border-border/50',
                      t.to && 'cursor-pointer hover:bg-[color-mix(in_srgb,var(--sk-ink)_5%,transparent)]',
                    )}
                  >
                    <span className="font-mono text-dense-micro text-muted-foreground">
                      {localDay(t.at)}
                    </span>
                    <span>
                      <span className={cn('mat-tag text-dense-micro', KIND_INK[t.kind])}>
                        {t.kind}
                      </span>
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-dense-body leading-snug [overflow-wrap:anywhere]">
                        {t.text}
                      </span>
                      <span className="text-dense-micro text-muted-foreground">{t.where}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <div className="flex min-w-0 flex-[1_1_21rem] flex-col gap-3">
            <section className="overflow-hidden mat-card">
              <header className="border-b border-border px-3 py-2.5">
                <h2 className="text-dense-body font-semibold">End of day</h2>
              </header>
              {/* The design's cited prose summary — owed by name: no engine
                  writes sentences yet, and an invented one would read as a
                  judgment nobody made. */}
              <p className="px-3 py-3 text-dense-meta leading-relaxed text-muted-foreground">
                The distill's end-of-day summary — a few sentences, each citing the traces it
                rests on — is owed. The trail on the left and the memory changes below are the
                measured parts of this page.
              </p>
            </section>

            <section className="overflow-hidden mat-card">
              <header className="flex items-baseline border-b border-border px-3 py-2.5">
                <h2 className="text-dense-body font-semibold">Memory changes</h2>
                <button
                  type="button"
                  onClick={() => navigate('/research/agent-personas/you')}
                  className="ml-auto text-dense-meta text-primary hover:underline"
                >
                  You →
                </button>
              </header>
              {changes.length === 0 ? (
                <p className="px-3 py-3 text-dense-meta text-muted-foreground">
                  No memory moved on this day. The distill runs after each close.
                </p>
              ) : (
                <div className="flex flex-col">
                  {changes.map(([id, change, topic], i) => (
                    <div key={id} className={cn('flex items-baseline', i > 0 && 'border-t border-border/50')}>
                      <button
                        type="button"
                        onClick={() => navigate(`/research/agent-personas/you?m=${id}`)}
                        className="grid min-w-0 flex-1 grid-cols-[44px_auto_minmax(0,1fr)] items-baseline gap-2.5 py-2 pl-3 text-left hover:bg-[color-mix(in_srgb,var(--sk-ink)_5%,transparent)]"
                      >
                        <span className="font-mono text-dense-micro font-bold">{id}</span>
                        <span className="text-dense-micro text-[var(--sk-soft)]">{change}</span>
                        <span className="truncate text-dense-meta text-muted-foreground">
                          {topic}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/research/trace?m=' + encodeURIComponent(id))}
                        title={`Trace ${id} — where it came from, what it caused`}
                        className="flex-none px-3 py-2 text-dense-meta text-primary hover:underline"
                      >
                        Trace
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  )
}
