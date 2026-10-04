/**
 * Put / call on the Flow face — the retired Order-sentiment section printed
 * PCR volume and PCR OI; the Symbol face had dropped both. Research's PCR
 * store keeps them daily with the four totals behind them, so the panel reads
 * today's pair, where each sits in its own year, and the year itself.
 *
 * The store has gaps (PLTR: 103 sessions between 2025-11 and 2026-09), so the
 * year is drawn by date and says how many sessions it holds; a percentile
 * over fewer than 20 readings is withheld, History's rule.
 *
 * And before August 2026 it was computed off chains of a handful of contracts
 * (PLTR's July OI totals: a median of 546 contracts, against 3.66M in August),
 * so it prints 48.00 and 0.00. A ratio whose totals are under 2% of the year's
 * 90th-percentile depth is not a put/call ratio: the panel leaves it out of the
 * line and the percentile, and says how many it left out. It does not repair
 * the store.
 *
 * Earnings (`flowEarnings.ts`): each print is an amber line on both years, by
 * date; a late estimate a faint one; the key names them and the next print.
 */
import { useQuery } from '@tanstack/react-query'
import { fetchPcrHistory, type PcrRow } from '@/api/research/pcr'
import { FaceKv } from '@/components/research/FaceKv'
import { useEarningsDates } from '@/hooks/useNarrative'
import { ordinal } from '@/lib/analyzeDepth'
import { cn } from '@/lib/utils'
import { shortDate } from '@/utils/earningsEstimate'
import { pcrYearEarnings, type PcrYearEarnings } from './flowEarnings'
import { THIN_SHARE, deepEnough, type PcrKey as Key } from './pcrDepth'

const cap = 'whitespace-nowrap text-dense-meta font-semibold text-muted-foreground'
const panelHead = 'flex flex-wrap items-center gap-2.5 border-b px-3 py-1.75 text-dense-body leading-normal'
const note = 'm-0 border-t border-border/60 px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty'
const MIN_READINGS = 20
const W = 600
const H = 64



function sharesAtOrBelow(values: number[], v: number | null): number | null {
  if (v == null || values.length < MIN_READINGS) return null
  return values.filter((x) => x <= v).length / values.length
}

const fmtInt = (v: number | null | undefined) =>
  v == null ? '—' : v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : String(v)

function YearLine({
  rows,
  k,
  first,
  last,
  earn,
}: {
  rows: PcrRow[]
  k: Key
  first: number
  last: number
  earn: PcrYearEarnings | null
}) {
  const pts = rows.flatMap((r) => (r[k] != null ? [{ t: Date.parse(r.trade_date), v: r[k] as number }] : []))
  if (pts.length < 2) return <div className="h-12 text-dense-micro text-muted-foreground">—</div>
  const vs = pts.map((p) => p.v)
  const lo = Math.min(...vs, 1)
  const hi = Math.max(...vs, 1)
  const span = hi - lo || 1
  const x = (t: number) => ((t - first) / Math.max(last - first, 1)) * (W - 4) + 2
  const y = (v: number) => H - 3 - ((v - lo) / span) * (H - 6)
  // Break the line where the store skips more than a week, so a gap reads as one.
  let d = ''
  pts.forEach((p, i) => {
    const gap = i > 0 && p.t - pts[i - 1].t > 7 * 86_400_000
    d += `${i === 0 || gap ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)} `
  })
  const tail = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-12 w-full" aria-hidden>
      <line x1="0" x2={W} y1={y(1)} y2={y(1)} stroke="var(--sk-line)" strokeDasharray="3 3" />
      {[...(earn?.prints ?? []).map((d) => ({ d, late: false })), ...(earn?.late ? [{ d: earn.late, late: true }] : [])].map(
        ({ d, late }) => (
          <line
            key={d}
            x1={x(Date.parse(d))}
            x2={x(Date.parse(d))}
            y1="0"
            y2={H}
            className="stroke-warning"
            strokeWidth="1.2"
            strokeDasharray="3 3"
            opacity={late ? 0.45 : 0.9}
            vectorEffect="non-scaling-stroke"
            data-pcr-earnings={late ? 'late' : 'print'}
          />
        ),
      )}
      <path d={d.trim()} fill="none" stroke="var(--sk-mute2, #98a2b0)" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />
      <circle cx={x(tail.t)} cy={y(tail.v)} r="2.6" fill="var(--foreground)" />
    </svg>
  )
}

function Row({
  label,
  rows: all,
  k,
  first,
  last,
  earn,
}: {
  label: string
  rows: PcrRow[]
  k: Key
  first: number
  last: number
  earn: PcrYearEarnings | null
}) {
  const { kept: rows, thin } = deepEnough(all, k)
  const vals = rows.map((r) => r[k] as number)
  const newest = all[all.length - 1]
  const today = newest && rows.includes(newest) ? newest[k] : null
  const share = sharesAtOrBelow(vals, today)
  const sorted = [...vals].sort((a, b) => a - b)
  return (
    <div className="grid grid-cols-1 items-center gap-x-3 gap-y-1 sm:grid-cols-[150px_minmax(0,1fr)]">
      <div className="flex flex-col gap-0.5">
        <span className={cap}>{label}</span>
        <span className="font-mono text-dense-body font-semibold tabular-nums">{today != null ? today.toFixed(2) : '—'}</span>
        <span
          className={cn(
            'font-mono text-dense-micro tabular-nums',
            share == null ? 'text-muted-foreground' : share >= 0.8 ? 'text-warning' : share <= 0.2 ? 'text-[var(--sk-soft)]' : 'text-secondary-foreground',
          )}
          title="The share of this year's readings at or below today."
        >
          {share != null ? `${ordinal(Math.round(share * 100))} pctl · n ${vals.length}` : `n ${vals.length} — too few for a percentile`}
        </span>
        {sorted.length > 0 ? (
          <span className="font-mono text-dense-micro text-muted-foreground tabular-nums">
            1y {sorted[0].toFixed(2)}–{sorted[sorted.length - 1].toFixed(2)}
          </span>
        ) : null}
        {thin > 0 ? (
          <span
            className="text-dense-micro text-warning"
            title={`Ratios whose put + call totals were under ${THIN_SHARE * 100}% of the year's 90th-percentile depth — computed off a handful of contracts.`}
          >
            {thin} thin reading{thin === 1 ? '' : 's'} left out
          </span>
        ) : null}
      </div>
      <YearLine rows={rows} k={k} first={first} last={last} earn={earn} />
    </div>
  )
}

export function SymbolFlowPcr({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase()
  const q = useQuery({
    queryKey: ['research-engine', 'pcr-history', sym, 365],
    queryFn: () => fetchPcrHistory(sym, 365),
    enabled: Boolean(sym),
    staleTime: 30 * 60_000,
  })
  const rows = q.data ?? []
  const latest = rows[rows.length - 1]
  const first = rows.length > 0 ? Date.parse(rows[0].trade_date) : 0
  const last = latest ? Date.parse(latest.trade_date) : 0
  const earnQ = useEarningsDates(sym)
  const earn =
    rows.length > 0 && latest
      ? pcrYearEarnings(
          rows[0].trade_date.slice(0, 10),
          latest.trade_date.slice(0, 10),
          earnQ.data?.dates ?? [],
          earnQ.data?.expected_next ?? null
        )
      : null

  return (
    <>
      <header className={panelHead}>
        <span className={cap}>Put / call</span>
        <span className="text-dense-body font-semibold">volume and open interest · {latest?.trade_date ?? '—'}</span>
        <span className="ml-auto text-dense-caption text-muted-foreground">
          source · PCR store · {rows.length} session{rows.length === 1 ? '' : 's'} in 1y
        </span>
      </header>
      {q.isLoading ? (
        <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">Loading the put/call history…</p>
      ) : q.isError ? (
        <p className="m-0 px-3 py-3 text-dense-meta text-destructive">
          {q.error instanceof Error ? q.error.message : 'The PCR route failed.'}
        </p>
      ) : rows.length === 0 ? (
        <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">The PCR store holds no session for {sym}.</p>
      ) : (
        <>
          <div className="flex flex-col gap-3 px-3 py-2.5">
            <Row label="PCR · volume" rows={rows} k="pcr_volume" first={first} last={last} earn={earn} />
            <Row label="PCR · open interest" rows={rows} k="pcr_oi" first={first} last={last} earn={earn} />
            {earn && (earn.prints.length > 0 || earn.pending) ? (
              <div className="flex flex-wrap justify-between gap-x-2 font-mono text-dense-micro text-warning" aria-label="Earnings on the put/call year">
                <span title="Results 8-K (Item 2.02) filing dates inside the year — the amber lines.">
                  {earn.prints.length > 0 ? `E ${earn.prints.map((d) => shortDate(d)).join(' · ')}` : ''}
                </span>
                {earn.pending ? (
                  <span title={earn.pending.title} data-pcr-pending={earn.pending.late ? 'late' : 'next'}>
                    {earn.pending.label}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2.5 border-t border-border/40 px-3 py-2.5 sm:grid-cols-4">
            <FaceKv label="put volume" value={fmtInt(latest?.total_put_volume)} cls="text-loss" />
            <FaceKv label="call volume" value={fmtInt(latest?.total_call_volume)} cls="text-profit" />
            <FaceKv label="put OI" value={fmtInt(latest?.total_put_oi)} cls="text-loss" />
            <FaceKv label="call OI" value={fmtInt(latest?.total_call_oi)} cls="text-profit" />
          </div>
        </>
      )}
      <p className={note}>
        Above 1 more puts than calls; the dashed line is 1. Volume is the session&rsquo;s own, OI the book
        carried into it, so the pair tells new hedging from standing hedges. Gaps in the line are sessions the
        store did not record or ratios too thin to be one (the store computed PCR off a handful of contracts
        before August 2026); a percentile needs {MIN_READINGS} readings. Amber lines are earnings — results
        8-K filings, by date.
      </p>
    </>
  )
}
