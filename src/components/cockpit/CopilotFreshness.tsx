import { HealthLamp } from '@bifrost/ui'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useSignalHealthSummary } from '@/hooks/useCopilotStanding'
import { computeAccountSyncLamp } from '@/utils/daemonLamps'
import { lensCell } from '@/components/cockpit/freshnessRule'

/**
 * How old the ground is, on the line above the composer.
 *
 * Design: `design/trade/Research Copilot.dc.html` — `book · chain · lenses`,
 * three lamps under the context chips, so the answer you are about to ask for
 * arrives with the staleness of what it will be built from.
 *
 * No thresholds are invented here. `book` reads the same
 * `computeAccountSyncLamp` the daemon page reads, and `lenses` reads the
 * feature batch's own `overall` — the batch judges itself against its own SLA
 * and this renders that judgement. Deciding here what counts as stale would
 * put a second opinion on screen next to the first.
 *
 * `chain` has no reading at all: monitor status carries
 * `quotes_redis_reader_ok` — whether the reader is up, not how old the last
 * tick is. So it is grey and says `not measured`, which is a different claim
 * from `ok` and from `stale`, and is left visible rather than dropped: a quote
 * feed that has stopped while its connection stays up is a real failure this
 * line cannot currently see.
 */

function clockOf(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function Cell({ lamp, label, value, title }: {
  lamp: string
  label: string
  value: string
  title: string
}) {
  return (
    <span className="inline-flex items-center gap-1" title={title}>
      <HealthLamp lamp={lamp} variant="dot" className="h-1.5 w-1.5" />
      <span>{label}</span>
      <span className="font-mono tabular-nums text-muted-foreground/70">{value}</span>
    </span>
  )
}

export function CopilotFreshness() {
  const { data: status } = useMonitorStatus()
  const lenses = useSignalHealthSummary()

  const book = computeAccountSyncLamp(status)
  const bookTs = status?.account_sync_daemon?.heartbeat?.last_ts ?? null

  const lens = lensCell({
    isPending: lenses.isPending,
    isError: lenses.isError,
    overall: lenses.data?.overall,
    asOf: lenses.data?.as_of,
  })

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-2 pt-1 text-dense-micro text-muted-foreground">
      <span className="uppercase tracking-[0.08em] text-muted-foreground/60">Freshness</span>
      <Cell
        lamp={book.lamp === 'none' ? 'gray' : book.lamp}
        label="book"
        value={bookTs != null ? clockOf(bookTs) : '—'}
        title={book.title}
      />
      <span aria-hidden className="text-border">·</span>
      <Cell
        lamp="gray"
        label="chain"
        value="not measured"
        title="Monitor reports whether the quotes reader is up, not how old the last tick is. A feed that stopped while its connection held would not show here."
      />
      <span aria-hidden className="text-border">·</span>
      <Cell
        lamp={lens.lamp}
        label="lenses"
        value={lens.value}
        title={
          lenses.data
            ? `Feature batch reports "${lenses.data.overall}" against its own SLA`
            : 'Feature freshness could not be read'
        }
      />
    </p>
  )
}
