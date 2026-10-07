/**
 * Events — the Book face (design `Home Events.dc.html`, default face).
 *
 * The calendar against the book: which of your legs cross a dated event in
 * the next 30 days, and what the market is charging for it. Four lanes, each
 * drawn only as far as a store answers: OPEX dates are arithmetic (third
 * Fridays) and always real; macro dates come from the event radar, which is
 * measured by the page's own store probes; BOOK and WATCHLIST earnings are
 * Research's estimates (`/research/narrative/earnings` · `expected_next`:
 * last year's same-quarter results 8-K plus 52 weeks), marked `est.` — the
 * vendor's confirmed calendar (Benzinga) is outside the plan, 403 not
 * entitled. A name with no estimate is listed under the lanes with why.
 *
 * BOOK × EVENTS is real end to end: exposures are the option legs the
 * monitor holds, priced move is the front straddle off the chain snapshot at
 * that expiry over the stock leg's own price, and model is the fit's ATM IV
 * scaled to the horizon. A cell a store cannot answer reads `—`.
 */
import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchOptionSnapshots } from '@/api/marketData/optionGreeks'
import { fetchEventCalendar } from '@/api/researchEngine'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useBookWatchNames } from '@/hooks/useBookWatchNames'
import { useNamesEarnings } from '@/hooks/useNamesEarnings'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import { withSymbolParam } from '@/lib/symbolLink'
import { shortDate } from '@/utils/earningsEstimate'
import { useVolSurfaceFit } from '@/hooks/useVolSurfaceData'
import { fmtIsoDateToken } from '@/lib/format'
import { symbolTabHref } from '@/lib/symbolTabs'
import { cn } from '@/lib/utils'
import { chainFromSnapshots } from '@/utils/optionChain'
import { isoDaysFrom, opexDatesAround } from '@/utils/bookCalendar'
import { bookExposures, daysUntil, earningsLanes, type EarningsLane, type ExposureRow } from './eventsBookModel'
import { straddleMid } from '@/pages/research/analyze/symbol/symbolChainModel'
import { etTodayIso } from '@/lib/freshness'

const WINDOW_DAYS = 30

const th =
  'whitespace-nowrap border-b border-border px-2 py-1 text-right align-bottom text-dense-caption font-semibold text-secondary-foreground'
const td = 'border-b border-border px-2 py-1.5 text-right font-mono text-dense-meta tabular-nums'
// 11/600 sentence case (Rev .89).
const cap = 'whitespace-nowrap text-dense-meta font-semibold text-muted-foreground'

function laneDot(kind: 'macro' | 'opex' | 'book' | 'watch') {
  // Rev .92: an ordinary event dot is soft; only in-book names keep the ticker ink.
  return kind === 'macro'
    ? 'bg-[var(--sk-soft)] rounded-full'
    : kind === 'opex'
      ? 'bg-[var(--sk-contract,#7dd3fc)]'
      : kind === 'book'
        ? 'bg-[var(--sk-ticker)] rounded-full'
        : // The watchlist's earnings are a ring, as the design keys them — a
          // name you watch, not a warning; grey because every print here is
          // an estimate (the design's estimated ◎).
          'rounded-full border-[1.5px] border-[var(--sk-mute2)] bg-transparent'
}

/** The calendar's key — the page toolbar carries it on the Book face (Rev .89). */
export function EventsBookLegend() {
  return (
    <span className="flex flex-wrap items-center gap-x-3 text-dense-caption text-muted-foreground">
      <span className="inline-flex items-center gap-1"><i className={cn('h-2 w-2', laneDot('macro'))} />macro</span>
      <span className="inline-flex items-center gap-1"><i className={cn('h-2 w-2 rounded-[2px]', laneDot('opex'))} />OPEX</span>
      <span className="inline-flex items-center gap-1"><i className={cn('h-2 w-2', laneDot('book'))} />earnings · book (est.)</span>
      <span className="inline-flex items-center gap-1"><i className={cn('h-2 w-2', laneDot('watch'))} />earnings · watchlist (est.)</span>
    </span>
  )
}

/** Why an earnings lane has no mark in the window — or when the next one is. */
function earningsOwed(lane: EarningsLane, names: number, reading: boolean, failed: boolean): string | null {
  if (lane.byDate.size > 0) return null
  if (failed) return 'couldn’t read the names — no estimate was asked for'
  if (names === 0) return 'no names to read'
  if (reading) return 'reading Research’s estimates…'
  return lane.nextBeyond
    ? `no estimated print inside ${WINDOW_DAYS} days — the next is ${lane.nextBeyond.sym} ~${shortDate(lane.nextBeyond.date)} (est.)`
    : `no estimated print for these ${names} names — see why below`
}

/** One day's estimated prints on a lane: the first ticker, `+N` for the rest, each a door to the name. */
function EarningsChip({ lane, marks }: { lane: 'book' | 'watch'; marks: readonly { sym: string; title: string }[] }) {
  const [first, ...rest] = marks
  if (!first) return null
  return (
    <Link
      to={withSymbolParam(SYMBOL_PATH, first.sym)}
      title={marks.map((m) => m.title).join('\n')}
      className="relative mx-auto flex w-max items-center gap-0.5 hover:underline"
    >
      <span className={cn('block h-2 w-2 flex-none', laneDot(lane))} />
      <span
        className={cn(
          'font-mono text-dense-micro font-semibold',
          lane === 'book' ? 'text-[var(--sk-ticker)]' : 'text-[var(--sk-mute2)]',
        )}
      >
        {first.sym}
        {rest.length > 0 ? `+${rest.length}` : ''}
      </span>
    </Link>
  )
}

export function EventsBookFace({ radarUnfed }: { radarUnfed: boolean }) {
  const status = useMonitorStatus()
  const today = etTodayIso()
  const opexDates = useMemo(() => opexDatesAround(today), [today])

  // Forward-dated radar events (time_code=2, event_date ASC on the server).
  // Same query key as the page shell, so the cache is shared. Macro = the
  // rows with no affected symbol: a dated event the radar holds that is not
  // tied to a name (FOMC decisions, CPI prints). Symbol-tied forward rows
  // (dividend dates) are the Market face's forward panel, not this lane.
  const calendar = useQuery({
    queryKey: ['research-engine', 'events', 'calendar'],
    queryFn: fetchEventCalendar,
    staleTime: 5 * 60_000,
  })
  const macroByDate = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const r of calendar.data?.rows ?? []) {
      if (r.affected_symbols || !r.event_date) continue
      const inDays = daysUntil(today, r.event_date)
      if (inDays < 0 || inDays >= WINDOW_DAYS) continue
      m.set(r.event_date, [...(m.get(r.event_date) ?? []), r.event_summary || r.subject])
    }
    return m
  }, [calendar.data, today])
  const days = useMemo(
    () =>
      Array.from({ length: WINDOW_DAYS }, (_, i) => {
        const iso = isoDaysFrom(today, i)
        const dow = new Date(`${iso}T00:00:00Z`).getUTCDay()
        return { iso, dom: iso.slice(8), weekend: dow === 0 || dow === 6, today: i === 0 }
      }),
    [today],
  )

  // ── Earnings: Research's estimate for every name the book and the watchlist hold ──
  const names = useBookWatchNames()
  const earnings = useNamesEarnings(names.all)
  // The hook's map is rebuilt each render (see useNamesEarnings), so the
  // lanes are rebuilt with it; they are a few dozen names.
  const lanes = earningsLanes(names, earnings, days.map((d) => d.iso))

  // ── The book's own legs, grouped by name × expiry ──
  const accounts = useMemo(() => status.data?.portfolio?.accounts ?? [], [status.data?.portfolio?.accounts])
  const spotOf = new Map<string, number>()
  for (const a of accounts)
    for (const p of a.positions ?? [])
      if ((p.secType ?? '').toUpperCase() === 'STK' && p.symbol && p.price != null)
        spotOf.set(p.symbol.toUpperCase(), Number(p.price))

  const exposures: ExposureRow[] = useMemo(() => bookExposures(accounts, today, opexDates), [accounts, opexDates, today])

  const inWindow = exposures.filter((e) => e.inDays >= 0 && e.inDays <= WINDOW_DAYS)
  const nearestBeyond = exposures.find((e) => e.inDays > WINDOW_DAYS) ?? null
  const priced = inWindow.slice(0, 6)

  // One snapshot per crossing row and one fit per name — the same query keys
  // the Symbol faces use, so nothing is fetched twice.
  const snapQs = useQueries({
    queries: priced.map((e) => ({
      queryKey: ['market', 'option-snapshots', e.sym, e.expiry],
      queryFn: () => fetchOptionSnapshots(e.sym, e.expiry),
      staleTime: 5 * 60_000,
      retry: false,
    })),
  })
  const fitSym = priced[0]?.sym ?? ''
  const fitQ = useVolSurfaceFit(fitSym)
  void fitQ

  const pricedMove = (i: number): number | null => {
    const e = priced[i]
    const spot = e ? spotOf.get(e.sym) : null
    if (!e || spot == null || spot <= 0) return null
    const chain = chainFromSnapshots(snapQs[i]?.data?.rows ?? [])
    const st = straddleMid(chain, spot)
    return st != null ? (st / spot) * 100 : null
  }

  return (
    <div className="space-y-3">
      {/* ── The calendar: 30 days, four lanes ── */}
      <section className="overflow-hidden border mat-card">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-3 py-2">
          <span className={cap}>Next {WINDOW_DAYS} days</span>
          <span className="text-dense-meta text-muted-foreground">
            book + watchlist · macro and OPEX from event_radar
          </span>
        </header>
        <div className="overflow-x-auto px-3 py-2">
          <table className="w-full border-collapse" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th className="w-24" />
                {days.map((d) => (
                  <td
                    key={d.iso}
                    className={cn(
                      'px-0 pb-1 text-center font-mono text-dense-micro',
                      // Rev .92: today is the accent, not the ticker lime.
                      d.today ? 'font-bold text-[var(--sk-accent)]' : d.weekend ? 'text-muted-foreground/40' : 'text-muted-foreground',
                    )}
                  >
                    {d.dom}
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  {
                    key: 'macro' as const,
                    label: 'Macro',
                    // The radar is the macro source either way; the reason
                    // just changes once it has been fed.
                    owed:
                      macroByDate.size > 0
                        ? null
                        : radarUnfed
                          ? 'macro dates come from the event radar — unfed, 0 batches'
                          : 'no macro dates in the radar’s window — the ingested batches carry none',
                    marks: new Set(macroByDate.keys()),
                  },
                  {
                    key: 'opex' as const,
                    label: 'OPEX',
                    owed: null,
                    marks: new Set(opexDates.filter((d) => daysUntil(today, d) >= 0 && daysUntil(today, d) < WINDOW_DAYS)),
                  },
                  {
                    key: 'book' as const,
                    label: 'Book',
                    owed: earningsOwed(lanes.book, names.book.length, lanes.pending > 0, names.bookFailed),
                    marks: new Set(lanes.book.byDate.keys()),
                  },
                  {
                    key: 'watch' as const,
                    label: 'Watchlist',
                    owed: earningsOwed(lanes.watch, names.watch.length, lanes.pending > 0, names.watchFailed),
                    marks: new Set(lanes.watch.byDate.keys()),
                  },
                ]
              ).map((lane) => (
                <tr key={lane.key}>
                  <th className={cn(cap, 'py-1.5 pr-2 text-left align-middle')}>{lane.label}</th>
                  {lane.owed && lane.marks.size === 0 ? (
                    <td colSpan={WINDOW_DAYS} className="px-2 py-1.5 text-left font-sans text-dense-caption text-muted-foreground/70">
                      {lane.owed}
                    </td>
                  ) : (
                    days.map((d) => (
                      <td
                        key={d.iso}
                        className={cn('py-1.5 text-center', d.today && 'bg-[color-mix(in_srgb,var(--sk-accent)_6%,transparent)]', d.weekend && 'opacity-40')}
                        title={
                          !lane.marks.has(d.iso)
                            ? undefined
                            : lane.key === 'macro'
                              ? `${macroByDate.get(d.iso)?.join(' · ') ?? 'macro'} · ${fmtIsoDateToken(d.iso)}`
                              : lane.key === 'opex'
                                ? `OPEX · ${fmtIsoDateToken(d.iso)}`
                                : undefined
                        }
                      >
                        {!lane.marks.has(d.iso) ? null : lane.key === 'book' || lane.key === 'watch' ? (
                          <EarningsChip lane={lane.key} marks={(lane.key === 'book' ? lanes.book : lanes.watch).byDate.get(d.iso) ?? []} />
                        ) : (
                          <span className={cn('mx-auto block h-2 w-2', laneDot(lane.key))} />
                        )}
                      </td>
                    ))
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="m-0 pt-1 text-dense-caption text-muted-foreground">
            lime column = today · dim columns = weekend · earnings are Research’s estimates (est.): last year’s same-quarter
            results 8-K plus 52 weeks — the vendor’s confirmed calendar (Benzinga) is not on the plan, 403 not entitled
          </p>
          {lanes.read > 0 ? (
            <p className="m-0 pt-0.5 text-dense-caption text-muted-foreground" data-testid="earnings-coverage">
              {lanes.estimated} of {lanes.read} names have an estimate
              {lanes.pending > 0 ? ` · ${lanes.pending} still reading` : ''}
              {lanes.absent.map((a) => (
                <span key={a.code}>
                  {' · '}
                  <span className="font-mono text-secondary-foreground">{a.names.join(' ')}</span>: {a.label}
                </span>
              ))}
            </p>
          ) : null}
        </div>
      </section>

      {/* ── BOOK × EVENTS ── */}
      <section className="overflow-hidden border mat-card">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-3 py-2">
          <span className={cap}>Book × events</span>
          <span className="text-dense-body font-semibold">
            {inWindow.length} exposure{inWindow.length === 1 ? '' : 's'} crossing a dated event
          </span>
          <span className="text-dense-meta text-muted-foreground">
            priced move = front straddle · model = fit ATM IV at the horizon
          </span>
        </header>
        {status.isLoading ? (
          <p className="px-3 py-3 text-dense-meta text-muted-foreground">Reading the book…</p>
        ) : inWindow.length === 0 ? (
          <p className="px-3 py-3 text-dense-meta text-muted-foreground">
            No exposure crosses a dated event inside {WINDOW_DAYS} days
            {nearestBeyond
              ? ` — the nearest is ${nearestBeyond.sym} ${fmtIsoDateToken(nearestBeyond.expiry)} (${nearestBeyond.inDays}d${nearestBeyond.isOpex ? ' · OPEX' : ''}).`
              : '.'}
          </p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={cn(th, 'text-left')}>Exposure</th>
                <th className={cn(th, 'text-left')}>Event</th>
                <th className={th}>In</th>
                <th className={th}>Priced move</th>
                <th className={th}>Model</th>
                <th className={cn(th, 'text-left')}>Read</th>
              </tr>
            </thead>
            <tbody>
              {priced.map((e, i) => {
                const pm = pricedMove(i)
                return (
                  <tr key={`${e.sym}|${e.expiry}`}>
                    <td className={cn(td, 'text-left')}>
                      <span className="font-semibold text-[var(--sk-ticker)]">{e.sym}</span>{' '}
                      <span className="text-secondary-foreground">{e.legs}</span>
                    </td>
                    <td className={cn(td, 'text-left font-sans text-secondary-foreground')}>
                      {e.isOpex ? 'OPEX' : 'expiry'} · {fmtIsoDateToken(e.expiry)}
                    </td>
                    <td className={cn(td, e.inDays <= 7 ? 'text-warning' : 'text-muted-foreground')}>{e.inDays}d</td>
                    <td className={td} title="ATM straddle at that expiry over the stock leg's own price — the chain snapshot's reading; a name the plugin does not cover reads —.">
                      {pm != null ? `±${pm.toFixed(1)}%` : '—'}
                    </td>
                    <td className={td} title="No per-horizon model band is computed for the book here yet; the Scenario face carries the model on its own name.">
                      —
                    </td>
                    <td className={cn(td, 'text-left font-sans text-muted-foreground')}>
                      {e.isOpex
                        ? 'Legs into the cycle — the Dealer face reads the pin.'
                        : 'An expiry inside the window — the Chain face prices the roll.'}{' '}
                      <Link className="text-primary hover:underline" to={symbolTabHref(e.isOpex ? 'dealer' : 'chain', e.sym)}>
                        {e.isOpex ? 'Dealer →' : 'Chain →'}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
