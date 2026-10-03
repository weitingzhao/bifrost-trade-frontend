/**
 * The two blocks of the Daily Brief the digest does not carry — Overnight and
 * Today & next — read from the stores that own them (§15.6: the data exists,
 * so it is on the page).
 *
 * Measured 2026-09-26 before building: the forward calendar
 * (`/research/events/calendar`) answers with dated rows since the Events page
 * was fed (09-24), so the block that said "no calendar" was wrong; the
 * night's fills, signal health and the decay alerts are three reads other
 * pages already make, so the brief quotes them through the same queries and
 * cannot disagree with them. The book's overnight mark is the one row still
 * owed: β-Δ is computed inside Risk's own page, not a shared read yet.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionPanel } from '@/components/layout'
import { DenseTag, type DenseTagVariant } from '@/components/data-display'
import { fetchExecutionsRange } from '@/api/trading'
import { fetchEventCalendar } from '@/api/researchEngine'
import { useSignalHealthSummary } from '@/hooks/useCopilotStanding'
import { useDecayRoster } from '@/hooks/useDecayRoster'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { healthFlag } from '@/lib/asofTag'
import { fmtIsoDateToken } from '@/lib/format'
import { cn } from '@/lib/utils'
import { expiryIso, isoDaysFrom, opexDatesAround } from '@/utils/bookCalendar'

/** How far back "overnight" reaches: the last session and the night after it. */
const OVERNIGHT_HOURS = 36
/** How far back the fills read reaches, so a quiet night can name the last fill. */
const LOOKBACK_DAYS = 14
/** How far ahead "today & next" reads. */
const AHEAD_DAYS = 10

interface BriefRow {
  tag: string
  variant: DenseTagVariant
  text: string
  dest: { to: string; label: string }
}

function Rows({ rows }: { rows: readonly BriefRow[] }) {
  return (
    <div className="flex flex-col">
      {rows.map((r) => (
        <div
          key={r.tag}
          className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-baseline gap-3 border-b border-border px-3 py-2 last:border-b-0"
        >
          <span>
            <DenseTag variant={r.variant} size="cell">
              {r.tag}
            </DenseTag>
          </span>
          <span className="text-dense-meta leading-relaxed text-[var(--sk-soft)] text-pretty">{r.text}</span>
          <Link to={r.dest.to} className="whitespace-nowrap text-dense-meta text-primary hover:underline">
            {r.dest.label} →
          </Link>
        </div>
      ))}
    </div>
  )
}

function names(list: readonly string[], max = 4): string {
  const shown = list.slice(0, max).join(' · ')
  return list.length > max ? `${shown} +${list.length - max}` : shown
}

export function BriefOvernight() {
  const [sinceTs] = useMemoNow(OVERNIGHT_HOURS)
  // Two weeks back, so a quiet night can still say when the last fill was —
  // "none since the 22nd" and "none in a day and a half" mean different things.
  const [lookbackTs] = useMemoNow(LOOKBACK_DAYS * 24)
  const fills = useQuery({
    queryKey: ['trading', 'executions', 'brief-overnight', lookbackTs],
    queryFn: () => fetchExecutionsRange({ from_ts: lookbackTs, source_scope: 'performance_book' }),
    staleTime: 60_000,
  })
  const health = useSignalHealthSummary()
  const roster = useDecayRoster()

  const fillRow: BriefRow = useMemo(() => {
    const all = fills.data?.items ?? []
    const items = all.filter((e) => e.time != null && e.time >= sinceTs)
    const newest = all.reduce<number | null>((m, e) => (e.time != null && (m == null || e.time > m) ? e.time : m), null)
    const syms = [...new Set(items.map((e) => (e.symbol ?? '').trim().toUpperCase()).filter(Boolean))]
    const text = fills.isLoading
      ? 'Reading the fills…'
      : fills.isError
        ? 'The fills did not load — the Ledger has them.'
        : items.length === 0
          ? `No fill in the last ${OVERNIGHT_HOURS} hours — ${
              newest != null
                ? `the newest on file is ${fmtIsoDateToken(new Date(newest * 1000).toISOString().slice(0, 10))}`
                : `none in the last ${LOOKBACK_DAYS} days either`
            }.`
          : `${items.length} ${items.length === 1 ? 'fill' : 'fills'} in the last ${OVERNIGHT_HOURS} hours · ${names(syms)}.`
    return { tag: 'FILLS', variant: 'neutral', text, dest: { to: '/portfolio/ledger', label: 'Ledger' } }
  }, [fills.data, fills.isLoading, fills.isError, sinceTs])

  const flag = healthFlag(health.data, { loading: health.isLoading, error: health.isError })
  const pipelineRow: BriefRow = {
    tag: 'PIPELINE',
    variant: health.data && flag == null ? 'state-green' : flag?.tone === 'warning' ? 'warning' : 'neutral',
    text:
      health.data && flag == null
        ? 'Signal health reads ok — every lens is fresh.'
        : flag
          ? `${flag.flag} — ${flag.detail}.`
          : 'Reading signal health…',
    dest: { to: '/research/signal-health', label: 'Signal Health' },
  }

  const alerts = roster.alerts
  const decayRow: BriefRow = {
    tag: 'DECAY',
    variant: alerts.length > 0 ? 'warning' : 'neutral',
    text:
      roster.loading && roster.rows.length === 0
        ? 'Reading the decay roster…'
        : roster.allFailed
          ? 'The decay roster did not load — no alert shown is not the same as none.'
          : alerts.length === 0
            ? 'No decay alert is active.'
            : `${alerts.length} decay ${alerts.length === 1 ? 'alert' : 'alerts'} active — ${names(alerts.map((a) => a.name), 3)}.`,
    dest: { to: '/research/signal-decay', label: 'Signal Decay' },
  }

  // Owed, and said: β-Δ and the book's move are computed inside Risk's own
  // page, not a read another page can share yet.
  const bookRow: BriefRow = {
    tag: 'BOOK',
    variant: 'state-blue',
    text: 'The book’s overnight move and β-Δ are Risk’s reading — not quoted here until it is a shared read.',
    dest: { to: '/risk/portfolio', label: 'Risk' },
  }

  return (
    <SectionPanel cap="Overnight" title="book + pipeline" note={`the last ${OVERNIGHT_HOURS} hours`}>
      <Rows rows={[bookRow, fillRow, pipelineRow, decayRow]} />
    </SectionPanel>
  )
}

interface CalRow {
  key: string
  when: string
  today: boolean
  text: string
  held: string[]
}

export function BriefCalendar() {
  const [today] = useMemoToday()
  const calendar = useQuery({
    queryKey: ['research', 'events', 'calendar'],
    queryFn: fetchEventCalendar,
    staleTime: 5 * 60_000,
  })
  const status = useMonitorStatus()

  const rows: CalRow[] = useMemo(() => {
    const until = isoDaysFrom(today, AHEAD_DAYS)
    const held = new Set<string>()
    const optExpiries: string[] = []
    for (const a of status.data?.portfolio?.accounts ?? [])
      for (const p of a.positions ?? []) {
        if (!p.symbol || !p.position) continue
        held.add(p.symbol.toUpperCase())
        if ((p.secType ?? '').toUpperCase() === 'OPT') {
          const exp = expiryIso(p)
          if (exp) optExpiries.push(exp)
        }
      }
    const out: CalRow[] = []
    for (const r of calendar.data?.rows ?? []) {
      const d = (r.event_date ?? '').slice(0, 10)
      if (!d || d < today || d > until) continue
      const syms = r.affected_symbols
        .split(/[,\s]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
      out.push({
        key: r.event_id,
        when: d,
        today: d === today,
        text: (r.event_summary || r.subject).replace(/:\s*$/, ''),
        held: syms.filter((s) => held.has(s)),
      })
    }
    for (const opex of opexDatesAround(today, 2)) {
      if (opex < today || opex > until) continue
      const legs = optExpiries.filter((e) => e === opex).length
      out.push({
        key: `opex-${opex}`,
        when: opex,
        today: opex === today,
        text: `Monthly OPEX — ${legs === 0 ? 'no leg of the book expires on it' : `${legs} ${legs === 1 ? 'leg' : 'legs'} of the book expire on it`}.`,
        held: [],
      })
    }
    return out.sort((a, b) => a.when.localeCompare(b.when))
  }, [calendar.data, status.data, today])

  const later = (calendar.data?.rows ?? []).filter((r) => (r.event_date ?? '') > isoDaysFrom(today, AHEAD_DAYS)).length

  return (
    <SectionPanel
      cap="Today & next"
      title="events touching the book"
      note={`the next ${AHEAD_DAYS} days`}
      action={
        <Link to="/research/events" className="text-dense-meta text-primary hover:underline">
          Events →
        </Link>
      }
    >
      {calendar.isLoading ? (
        <p className="px-3 py-2.5 text-dense-meta text-muted-foreground">Reading the calendar…</p>
      ) : calendar.isError ? (
        <p className="px-3 py-2.5 text-dense-meta text-muted-foreground">
          The forward calendar did not load — Events reads the same store.
        </p>
      ) : rows.length === 0 ? (
        <p className="px-3 py-2.5 text-dense-meta text-muted-foreground">
          Nothing dated in the next {AHEAD_DAYS} days{later > 0 ? ` — ${later} further out on Events` : ''}.
        </p>
      ) : (
        <div className="flex flex-col">
          {rows.map((r) => (
            <div
              key={r.key}
              className="grid grid-cols-[88px_minmax(0,1fr)] items-baseline gap-3 border-b border-border px-3 py-2 last:border-b-0"
            >
              <span
                className={cn('font-mono text-dense-caption', r.today ? 'text-warning' : 'text-muted-foreground')}
              >
                {r.today ? 'today' : fmtIsoDateToken(r.when)}
              </span>
              <span className="flex flex-wrap items-baseline gap-x-2 text-dense-meta leading-relaxed text-[var(--sk-soft)]">
                {r.text}
                {r.held.length > 0 ? (
                  <span className="font-mono text-dense-caption text-entity-symbol" title="In the book">
                    ● {r.held.join(' · ')}
                  </span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionPanel>
  )
}

/** A fixed "now" per mount — the reading should not creep while the page is open. */
function useMemoNow(hoursBack: number): [number] {
  const [ts] = useState(() => Math.floor(Date.now() / 1000) - hoursBack * 3600)
  return [ts]
}

function useMemoToday(): [string] {
  const [iso] = useState(() => new Date().toISOString().slice(0, 10))
  return [iso]
}
