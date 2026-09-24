/**
 * History · method — the Method face of History (design
 * `Research History Method.dc.html`, route rev 2026-09-20.4).
 *
 * The reading face answers where IV sits; this one answers what it sits
 * inside — the estimator, the window, the sampling and the percentile
 * convention, and what each of them does to the number Trade quotes. The same
 * IV30 is held fixed while the reader moves the denominator: realised vol is
 * recomputed from the store's own OHLC bars under close-to-close, Parkinson
 * or Garman–Klass, at 252 or 260, overlapping or not, and ranked under three
 * percentile conventions across four windows.
 *
 * Nothing here changes what Trade reports: the reading face quotes the
 * committed method, and a change made here is a proposal until accepted.
 */
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchStockDailyCloses } from '@/api/marketData/dailyBars'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { PageFaceSwitch, PageHeader, PageShell } from '@/components/layout'
import { SymbolContextGuard } from '@/components/research/SymbolContextGuard'
import { VolCone, type ConeRow as VolConeRow } from '@/components/research/VolCone'
import { useVrpHistory } from '@/hooks/useVrpData'
import { useResearchContext } from '@/hooks/useResearchContext'
import { daysBack, todayIso } from '@/lib/researchFreshness'
import { cn } from '@/lib/utils'
import { ivReading } from '@/utils/ivHistory'
import {
  coneRows,
  methodTable,
  percentileSpread,
  returnsFrom,
  type Estimator,
  type Overlap,
  type PctlMethod,
} from './labHistoryModel'

const cap =
  'whitespace-nowrap text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground'
const mono = 'font-mono tabular-nums'
const panel =
  'min-w-0 rounded-[10px] border border-[var(--sk-line0)] bg-[var(--sk-raised)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--sk-ink)_4%,transparent)]'
const panelHead =
  'flex flex-wrap items-center gap-2.5 rounded-t-[9px] border-b border-[var(--sk-line0)] bg-[var(--sk-raised2)] px-3 py-1.75 text-dense-body leading-normal'
const th =
  'whitespace-nowrap border-b border-border px-2 py-1 text-right align-bottom text-dense-caption font-semibold text-secondary-foreground'
const td =
  'whitespace-nowrap border-b border-border/55 px-2 py-1.25 text-right font-mono text-xs tabular-nums'

interface Control<T extends string | number> {
  label: string
  note: string
  value: T
  set: (v: T) => void
  options: { value: T; label: string }[]
  /** Options the data cannot serve, with the reason. */
  disabledNote?: string | null
}

export default function LabHistoryPage() {
  const { symbol } = useResearchContext()
  const sym = symbol.trim().toUpperCase()
  const today = todayIso()
  const [est, setEst] = useState<Estimator>('cc')
  const [ann, setAnn] = useState<252 | 260>(252)
  const [overlap, setOverlap] = useState<Overlap>('overlap')
  const [qm, setQm] = useState<PctlMethod>('linear')
  const [tenor, setTenor] = useState<10 | 20 | 30 | 60 | 90>(30)

  // ~2y of sessions plus slack — the widest window the table draws.
  const barsQ = useQuery({
    queryKey: ['market', 'daily-bars-ohlc', sym, today],
    queryFn: () => fetchStockDailyCloses(sym, daysBack(today, 790), today),
    enabled: Boolean(sym),
    staleTime: 10 * 60_000,
  })
  const vrpQ = useVrpHistory(sym, 252)
  const committed = useMemo(() => (vrpQ.data ? ivReading(vrpQ.data, '6m') : null), [vrpQ.data])

  const rets = useMemo(() => returnsFrom(barsQ.data ?? []), [barsQ.data])
  const ohlcDays = useMemo(
    () => rets.filter((r) => r.h != null && r.l != null && r.o != null).length,
    [rets]
  )
  // The store writes IV30 as a fraction; every realised figure on this page
  // is in vol points, so the one number held fixed converts once, here.
  const iv = committed?.iv30 != null ? committed.iv30 * 100 : null

  const table = useMemo(
    () =>
      iv != null && rets.length > 0 ? methodTable(rets, iv, tenor, est, ann, overlap, qm) : [],
    [rets, iv, tenor, est, ann, overlap, qm]
  )
  const spread = percentileSpread(table)
  const cone = useMemo<VolConeRow[]>(
    () =>
      coneRows(rets, est, ann, overlap).map((c) => ({
        days: c.tenor,
        p05: c.p5,
        p20: c.p20,
        p50: c.p50,
        p80: c.p80,
        p95: c.p95,
        n: 0,
        // The one implied point this face holds fixed: IV30 at the 30d tenor.
        ivToday: c.tenor === 30 ? iv : null,
        place: 'unread',
      })),
    [rets, est, ann, overlap, iv]
  )

  const controls: Control<string>[] = [
    {
      label: 'realised-vol estimator',
      note: 'Close-to-close uses only the close; the range estimators read the whole bar and are three to five times more efficient on the same number of days.',
      value: est,
      set: (v) => setEst(v as Estimator),
      options: [
        { value: 'cc', label: 'close-close' },
        { value: 'park', label: 'Parkinson' },
        { value: 'gk', label: 'Garman-Klass' },
      ],
      disabledNote:
        ohlcDays === 0 && rets.length > 0
          ? 'no OHLC in the store for this name — range estimators cannot run'
          : null,
    },
    {
      label: 'annualisation',
      note: 'Trading days per year. A 260 convention reads about 1.6% higher than 252 on the same series — small, but it moves a band edge.',
      value: String(ann),
      set: (v) => setAnn(Number(v) as 252 | 260),
      options: [
        { value: '252', label: '252' },
        { value: '260', label: '260' },
      ],
    },
    {
      label: 'window sampling',
      note: 'Overlapping windows share most of their days, so the sample size is nominal, not effective. Non-overlapping is honest and much smaller.',
      value: overlap,
      set: (v) => setOverlap(v as Overlap),
      options: [
        { value: 'overlap', label: 'overlapping' },
        { value: 'none', label: 'non-overlapping' },
      ],
    },
    {
      label: 'percentile definition',
      note: 'Three conventions for the same question. They disagree most in the tails, which is exactly where a band edge lives.',
      value: qm,
      set: (v) => setQm(v as PctlMethod),
      options: [
        { value: 'linear', label: 'linear' },
        { value: 'nearest', label: 'nearest' },
        { value: 'hazen', label: 'Hazen' },
      ],
    },
    {
      label: 'tenor for the rank',
      note: 'The horizon whose realised-vol distribution IV30 is compared against. Comparing 30-day implied to another tenor is a choice, not a default.',
      value: String(tenor),
      set: (v) => setTenor(Number(v) as typeof tenor),
      options: [10, 20, 30, 60, 90].map((t) => ({ value: String(t), label: `${t}d` })),
    },
  ]

  return (
    <PageShell padding="compact" className="space-y-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 max-w-[84ch] flex-[1_1_28rem]">
          <PageHeader
            breadcrumb={<p className="text-xs font-medium text-primary/90">Research / Analyze</p>}
            title="History · method"
            titleSize="large"
            description="The reading face answers where IV sits. This one answers what it sits inside — the estimator, the window, the percentile convention, and what each of them does to the number Trade quotes."
          />
        </div>
        <div className="pt-1.5">
          <PageFaceSwitch path="/research/lab/history" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 rounded-md border border-border bg-[var(--sk-raised)] px-3 py-1.75">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-[5px] border px-2 py-0.5 font-mono text-dense-caption tracking-[0.05em]',
            'border-[color-mix(in_srgb,var(--sk-accent)_40%,transparent)] bg-[rgb(var(--sk-accent-rgb)/0.08)] text-[var(--sk-accent)]'
          )}
          title="Method face — how the number is made. Analysis only; no order can be placed from here (D10)."
        >
          ◆ METHOD · NO ORDERS
        </span>
        <span
          className={cn(mono, 'text-dense-meta text-secondary-foreground')}
          title="The committed reading, from the vrp store — the same source Trade quotes."
        >
          verdict · same source as trade: IV30 {iv != null ? iv.toFixed(1) : '—'}
          {committed?.percentile != null ? ` at the ${committed.percentile}th` : ''}
          {committed?.asOf ? ` · asof ${committed.asOf}` : ''}
        </span>
        <Link
          to="/research/history"
          className="ml-auto whitespace-nowrap text-dense-meta text-primary hover:underline"
        >
          Reading → /research/history
        </Link>
      </div>

      <SymbolContextGuard
        symbol={sym}
        description="The method face recomputes one name's denominator. Pick a symbol, then come back here."
      >
        {barsQ.isLoading || vrpQ.isLoading ? (
          <p className="p-3 text-dense-meta text-muted-foreground">Reading the bars…</p>
        ) : iv == null ? (
          <p className="p-3 text-dense-meta text-muted-foreground">
            The vrp store holds no IV30 for {sym}
            {committed?.suspects.length
              ? ' it is willing to stand behind (suspect readings withheld)'
              : ''}{' '}
            — there is nothing to hold fixed while the denominator moves.
          </p>
        ) : (
          <div className="flex flex-wrap items-start gap-3">
            <aside className="flex min-w-0 max-w-[26rem] flex-[1_1_18rem] flex-col gap-3">
              <section className={panel} aria-label="Method">
                <header className={panelHead}>
                  <span className={cap}>method</span>
                </header>
                <div className="flex flex-col gap-3 px-3 py-2.5">
                  {controls.map((c) => (
                    <div key={c.label} className="flex flex-col gap-1">
                      <span className={cap}>{c.label}</span>
                      <SegmentControl
                        ariaLabel={c.label}
                        size="xs"
                        value={c.value}
                        onChange={(v) => c.set(v)}
                        options={c.options}
                      />
                      <p className="m-0 text-dense-caption leading-normal text-muted-foreground text-pretty">
                        {c.disabledNote ?? c.note}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
              <section className={panel} aria-label="Sample">
                <header className={panelHead}>
                  <span className={cap}>sample</span>
                </header>
                <div
                  className={cn(
                    mono,
                    'flex flex-col gap-1 px-3 py-2.5 text-dense-meta text-secondary-foreground'
                  )}
                >
                  <span>
                    {rets.length} sessions of bars · {ohlcDays} with OHLC
                  </span>
                  <span>
                    windows drawn: {table.reduce((a, r) => a + r.n, 0)} · effective{' '}
                    {table.reduce((a, r) => a + r.effN, 0)}
                  </span>
                  <span className="text-muted-foreground">
                    overlapping windows share days — the effective count is the honest one
                  </span>
                </div>
              </section>
            </aside>

            <div className="flex min-w-0 flex-[999_1_34rem] flex-col gap-3">
              <section className={panel} aria-label="Same IV30, different answers">
                <header className={panelHead}>
                  <span className={cap}>Same IV30, different answers</span>
                  <span className="text-dense-meta text-muted-foreground">
                    IV30 = {iv.toFixed(1)} held fixed · only the denominator moves
                  </span>
                  <span className="ml-auto">
                    <DenseTag size="cell" variant={(spread ?? 0) > 25 ? 'warning' : 'neutral'}>
                      spread {spread != null ? `${spread.toFixed(0)} pts` : '—'}
                    </DenseTag>
                  </span>
                </header>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={cn(th, 'text-left')}>window</th>
                      <th className={th}>IV rank</th>
                      <th className={th}>IV percentile</th>
                      <th className={th}>min RV</th>
                      <th className={th}>median</th>
                      <th className={th}>max RV</th>
                      <th className={th}>eff n</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.map((r) => {
                      // The design's rules: >=70 reads rich (profit), <=30 cheap
                      // (loss); outside the sample is a mark in amber, not a
                      // number pretending to be a percentile.
                      const out =
                        r.rank != null && (r.rank > 100 || r.rank < 0)
                          ? r.rank > 100
                            ? 'out ↑'
                            : 'out ↓'
                          : null
                      const colOf = (v: number | null) =>
                        v == null
                          ? 'text-muted-foreground'
                          : v >= 70
                            ? 'text-profit'
                            : v <= 30
                              ? 'text-loss'
                              : 'text-foreground'
                      const committed = r.window === '6m'
                      return (
                        <tr
                          key={r.window}
                          className={committed ? 'bg-[color-mix(in_oklab,var(--primary)_6%,transparent)]' : undefined}
                        >
                          <td
                            className={cn(
                              td,
                              'text-left font-sans',
                              committed ? 'font-bold text-primary' : 'text-secondary-foreground'
                            )}
                            title={committed ? 'The committed window — the one the reading face quotes.' : undefined}
                          >
                            {r.window}
                          </td>
                          <td
                            className={cn(td, 'text-dense-body font-semibold', out ? 'text-warning' : colOf(r.rank))}
                          >
                            {out ?? (r.rank != null ? r.rank.toFixed(0) : '—')}
                          </td>
                          <td
                            className={cn(td, 'text-dense-body font-semibold', out ? 'text-warning' : colOf(r.percentile))}
                          >
                            {out ?? (r.percentile != null ? r.percentile.toFixed(0) : '—')}
                          </td>
                          <td className={cn(td, 'text-muted-foreground')}>
                            {r.min?.toFixed(1) ?? '—'}
                          </td>
                          <td className={cn(td, 'text-muted-foreground')}>
                            {r.median?.toFixed(1) ?? '—'}
                          </td>
                          <td className={cn(td, 'text-muted-foreground')}>
                            {r.max?.toFixed(1) ?? '—'}
                          </td>
                          <td
                            className={cn(td, r.effN < 20 ? 'text-warning' : 'text-muted-foreground')}
                            title={r.effN < 20 ? 'Under 20 independent windows — thin.' : undefined}
                          >
                            {r.effN}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <p className="m-0 px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
                  The committed reading is the 6m window under the store’s own method; every other
                  cell is this page recomputing. A spread across the windows is the window choice
                  talking, not the market.
                </p>
              </section>

              <section className={panel} aria-label="Cone under the chosen method">
                <header className={panelHead}>
                  <span className={cap}>Cone under the chosen method</span>
                  <span className="ml-auto text-dense-meta text-muted-foreground">
                    {est === 'cc' ? 'close-close' : est === 'park' ? 'Parkinson' : 'Garman-Klass'} ·{' '}
                    {ann} · {overlap === 'overlap' ? 'overlapping' : 'non-overlapping'}
                  </span>
                </header>
                <div className="px-3 pb-2 pt-2.5">
                  <VolCone rows={cone} />
                </div>
                <p className="m-0 border-t border-border/60 px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
                  Bands are the 20–80 and 5–95 of realised vol per tenor under this method; the dot
                  is today’s IV30 at its own tenor. The reading face’s cone stays the committed one
                  — this cone moves with the controls.
                </p>
              </section>
            </div>
          </div>
        )}
      </SymbolContextGuard>

      <p className="m-0 text-dense-meta leading-normal text-muted-foreground text-pretty">
        Nothing here changes what Trade reports. The reading face quotes the committed method; a
        change made here is a proposal until it is accepted, so the two faces never quietly
        disagree.
      </p>
    </PageShell>
  )
}
