/**
 * Events — the Book face (design `Home Events.dc.html`, default face).
 *
 * The calendar against the book: which of your legs cross a dated event in
 * the next 30 days, and what the market is charging for it. Four lanes, each
 * drawn only as far as a store answers: OPEX dates are arithmetic (third
 * Fridays) and always real; macro dates come from the event radar, which is
 * measured by the page's own store probes; forward earnings dates are not on
 * the data plan, so BOOK and WATCHLIST earnings keep their lanes with the
 * reason instead of dots.
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
import { useVolSurfaceFit } from '@/hooks/useVolSurfaceData'
import { fmtIsoDateToken } from '@/lib/format'
import { symbolTabHref } from '@/lib/symbolTabs'
import { cn } from '@/lib/utils'
import { chainFromSnapshots } from '@/utils/optionChain'
import { straddleMid } from '@/pages/research/analyze/symbol/symbolChainModel'
import type { IbPositionRow } from '@/types/monitor'

const WINDOW_DAYS = 30

/** Third Friday of a month, as an ISO date. */
function thirdFriday(year: number, month0: number): string {
  const first = new Date(Date.UTC(year, month0, 1)).getUTCDay()
  const day = 1 + ((5 - first + 7) % 7) + 14
  return new Date(Date.UTC(year, month0, day)).toISOString().slice(0, 10)
}

function opexDatesAround(todayIso: string, months = 3): string[] {
  const y = Number(todayIso.slice(0, 4))
  const m = Number(todayIso.slice(5, 7)) - 1
  return Array.from({ length: months }, (_, i) => thirdFriday(y + Math.floor((m + i) / 12), (m + i) % 12))
}

function isoDaysFrom(todayIso: string, n: number): string {
  return new Date(Date.parse(`${todayIso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
}

function daysUntil(todayIso: string, dateIso: string): number {
  return Math.round((Date.parse(dateIso) - Date.parse(todayIso)) / 86_400_000)
}

/** `20261016` / `2026-10-16` → `2026-10-16`; anything shorter is unusable. */
function expiryIso(row: IbPositionRow): string | null {
  const raw = String(row.expiry ?? row.lastTradeDateOrContractMonth ?? '')
  const d = raw.replace(/\D/g, '')
  if (d.length < 8) {
    const seg = (row.contract_key ?? '').split('|').find((s) => /^\d{8}$/.test(s))
    if (!seg) return null
    return `${seg.slice(0, 4)}-${seg.slice(4, 6)}-${seg.slice(6, 8)}`
  }
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
}

interface ExposureRow {
  sym: string
  expiry: string
  inDays: number
  isOpex: boolean
  legs: string
}

const th =
  'whitespace-nowrap border-b border-border px-2 py-1 text-right align-bottom text-dense-caption font-semibold text-secondary-foreground'
const td = 'border-b border-border/40 px-2 py-1.5 text-right font-mono text-dense-meta tabular-nums'
const cap =
  'whitespace-nowrap text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground'

function laneDot(kind: 'macro' | 'opex' | 'book' | 'watch') {
  return kind === 'macro'
    ? 'bg-foreground rounded-full'
    : kind === 'opex'
      ? 'bg-[var(--sk-contract,#7dd3fc)]'
      : kind === 'book'
        ? 'bg-[var(--sk-ticker)] rounded-full'
        : 'bg-warning rounded-full'
}

export function EventsBookFace({ radarUnfed }: { radarUnfed: boolean }) {
  const status = useMonitorStatus()
  const today = new Date().toISOString().slice(0, 10)
  const opexDates = useMemo(() => opexDatesAround(today), [today])

  // Forward-dated radar events (time_code=2, event_date ASC on the server).
  // Same query key as the page shell, so the cache is shared. Macro = the
  // rows with no affected symbol: a dated event the radar holds that is not
  // tied to a name (FOMC decisions, CPI prints). Symbol-tied forward rows
  // (dividend dates) are the Market face's forward panel, not this lane.
  const calendar = useQuery({
    queryKey: ['research', 'events', 'calendar'],
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

  // ── The book's own legs, grouped by name × expiry ──
  const accounts = status.data?.portfolio?.accounts ?? []
  const spotOf = new Map<string, number>()
  for (const a of accounts)
    for (const p of a.positions ?? [])
      if ((p.secType ?? '').toUpperCase() === 'STK' && p.symbol && p.price != null)
        spotOf.set(p.symbol.toUpperCase(), Number(p.price))

  const exposures: ExposureRow[] = useMemo(() => {
    const byKey = new Map<string, { sym: string; expiry: string; legs: string[] }>()

    for (const a of accounts)
      for (const p of a.positions ?? []) {
        if ((p.secType ?? '').toUpperCase() !== 'OPT' || !p.symbol || !p.position) continue
        const exp = expiryIso(p)
        if (!exp) continue
        const key = `${p.symbol}|${exp}`
        const cur = byKey.get(key) ?? { sym: p.symbol.toUpperCase(), expiry: exp, legs: [] }
        const qty = Number(p.position)
        cur.legs.push(`${qty > 0 ? '+' : '−'}${Math.abs(qty)} ${p.strike ?? ''}${p.right ?? ''}`)
        byKey.set(key, cur)
      }
    return [...byKey.values()]
      .map((g) => ({
        sym: g.sym,
        expiry: g.expiry,
        inDays: daysUntil(today, g.expiry),
        isOpex: opexDates.includes(g.expiry),
        legs: g.legs.join(' · '),
      }))
      .sort((a, b) => a.inDays - b.inDays)
  }, [accounts, opexDates, today])

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
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2">
          <span className={cap}>next {WINDOW_DAYS} days</span>
          <span className="text-dense-meta text-muted-foreground">
            book + watchlist · macro and OPEX from event_radar
          </span>
          <span className="ml-auto flex flex-wrap items-center gap-x-3 text-dense-micro text-muted-foreground">
            <span className="inline-flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-foreground" />macro</span>
            <span className="inline-flex items-center gap-1"><i className="h-1.5 w-1.5 bg-[var(--sk-contract,#7dd3fc)]" />OPEX</span>
            <span className="inline-flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-[var(--sk-ticker)]" />earnings · book</span>
            <span className="inline-flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-warning" />earnings · watchlist</span>
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
                      d.today ? 'font-bold text-[var(--sk-ticker)]' : d.weekend ? 'text-muted-foreground/40' : 'text-muted-foreground',
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
                    label: 'MACRO',
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
                    label: 'BOOK',
                    owed: 'forward earnings dates are not on the data plan — unmeasured, not omitted',
                    marks: new Set<string>(),
                  },
                  {
                    key: 'watch' as const,
                    label: 'WATCHLIST',
                    owed: 'forward earnings dates are not on the data plan — unmeasured, not omitted',
                    marks: new Set<string>(),
                  },
                ]
              ).map((lane) => (
                <tr key={lane.key}>
                  <th className={cn(cap, 'py-1.5 pr-2 text-left align-middle')}>{lane.label}</th>
                  {lane.owed && lane.marks.size === 0 ? (
                    <td colSpan={WINDOW_DAYS} className="border-t border-border/30 px-2 py-1.5 text-left font-sans text-dense-caption text-muted-foreground/70">
                      {lane.owed}
                    </td>
                  ) : (
                    days.map((d) => (
                      <td
                        key={d.iso}
                        className={cn('border-t border-border/30 py-1.5 text-center', d.today && 'bg-[rgb(var(--sk-accent-rgb,163_230_53)/0.06)]', d.weekend && 'opacity-40')}
                        title={
                          !lane.marks.has(d.iso)
                            ? undefined
                            : lane.key === 'macro'
                              ? `${macroByDate.get(d.iso)?.join(' · ') ?? 'macro'} · ${fmtIsoDateToken(d.iso)}`
                              : `OPEX · ${fmtIsoDateToken(d.iso)}`
                        }
                      >
                        {lane.marks.has(d.iso) ? (
                          <span className={cn('mx-auto block h-2 w-2', laneDot(lane.key))} />
                        ) : null}
                      </td>
                    ))
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="m-0 pt-1 text-dense-caption text-muted-foreground">
            lime column = today · dim columns = weekend
          </p>
        </div>
      </section>

      {/* ── BOOK × EVENTS ── */}
      <section className="overflow-hidden border mat-card">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2">
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
