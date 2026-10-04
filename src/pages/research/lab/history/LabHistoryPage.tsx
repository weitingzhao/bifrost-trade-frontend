/**
 * History · method — the Method face of History (design
 * `Research History Method.dc.html`, route rev 2026-09-20.4; §16 refinement
 * at Rev .91).
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
import { ViewState } from '@bifrost/ui'
import { fetchStockDailyCloses } from '@/api/marketData/dailyBars'
import { AsofTag } from '@/components/AsofTag'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { PageFaceSwitch, PageHead, PageShell } from '@/components/layout'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { cap, mono, panel, panelHead, td, th } from '@/components/research/labFaceUi'
import { SymbolContextGuard } from '@/components/research/SymbolContextGuard'
import { VolCone, type ConeRow as VolConeRow } from '@/components/research/VolCone'
import { useSignalHealthSummary } from '@/hooks/useCopilotStanding'
import { useEarningsDates } from '@/hooks/useNarrative'
import { usePreviewState } from '@/hooks/usePreviewState'
import { useVrpHistory } from '@/hooks/useVrpData'
import { useResearchContext } from '@/hooks/useResearchContext'
import { healthFlag } from '@/lib/asofTag'
import { daysBack, todayIso } from '@/lib/researchFreshness'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/symbolTabs'
import { cn } from '@/lib/utils'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
import { ivReading, MARKET_IV_SYMBOL } from '@/utils/ivHistory'
import {
  coneRows,
  methodTable,
  percentileSpread,
  returnsFrom,
  type Estimator,
  type Overlap,
  type PctlMethod,
} from './labHistoryModel'

const LEAD =
  'The reading face answers where IV sits. This one answers what it sits inside — the estimator, the window, the percentile convention, and what each of them does to the number Trade quotes.'

/** The committed window — the one the reading face quotes. */
const COMMITTED = '6m'

/**
 * Where a rank or percentile sits, as a state (§14.7): it is not signed money,
 * so the design's rich / cheap stops borrowing the direction inks. Rich is a
 * seller's edge (the state green); cheap is under the floor a seller wants
 * (amber); the middle stays ink.
 */
function placeInk(v: number | null): string {
  if (v == null) return 'text-muted-foreground'
  if (v >= 70) return 'text-[var(--sk-state-green)]'
  if (v <= 30) return 'text-warning'
  return 'text-foreground'
}

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
  const preview = usePreviewState()
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
  const marketQ = useVrpHistory(sym === MARKET_IV_SYMBOL ? '' : MARKET_IV_SYMBOL, 252)
  const earningsQ = useEarningsDates(sym)
  const health = useSignalHealthSummary()
  const committed = useMemo(
    () =>
      vrpQ.data
        ? ivReading(vrpQ.data, COMMITTED, {
            market: sym === MARKET_IV_SYMBOL ? undefined : marketQ.data,
            earnings: earningsQ.data?.dates,
          })
        : null,
    [vrpQ.data, sym, marketQ.data, earningsQ.data]
  )

  const rets = useMemo(() => returnsFrom(barsQ.data ?? []), [barsQ.data])
  const ohlcDays = useMemo(
    () => rets.filter((r) => r.h != null && r.l != null && r.o != null).length,
    [rets]
  )
  // The store writes IV30 as a fraction; every realised figure on this page
  // is in vol points, so the one number held fixed converts once, here.
  const iv = committed?.iv30 != null ? committed.iv30 * 100 : null
  const rv20 = committed?.rv20 != null ? committed.rv20 * 100 : null

  const table = useMemo(
    () =>
      iv != null && rets.length > 0 ? methodTable(rets, iv, tenor, est, ann, overlap, qm) : [],
    [rets, iv, tenor, est, ann, overlap, qm]
  )
  const spread = percentileSpread(table)
  // The sample the design reads is the committed window's — the other three
  // nest inside or around it, so summing them counted the same days twice.
  const six = table.find((r) => r.window === COMMITTED) ?? null
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
      label: 'Realised-vol estimator',
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
      label: 'Annualisation',
      note: 'Trading days per year. A 260 convention reads about 1.6% higher than 252 on the same series — small, but it moves a band edge.',
      value: String(ann),
      set: (v) => setAnn(Number(v) as 252 | 260),
      options: [
        { value: '252', label: '252' },
        { value: '260', label: '260' },
      ],
    },
    {
      label: 'Window sampling',
      note: 'Overlapping windows share most of their days, so the sample size is nominal, not effective. Non-overlapping is honest and much smaller.',
      value: overlap,
      set: (v) => setOverlap(v as Overlap),
      options: [
        { value: 'overlap', label: 'overlapping' },
        { value: 'none', label: 'non-overlapping' },
      ],
    },
    {
      label: 'Percentile definition',
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
      label: 'Tenor for the rank',
      note: 'The horizon whose realised-vol distribution IV30 is compared against. Comparing 30-day implied to another tenor is a choice, not a default.',
      value: String(tenor),
      set: (v) => setTenor(Number(v) as typeof tenor),
      options: [10, 20, 30, 60, 90].map((t) => ({ value: String(t), label: `${t}d` })),
    },
  ]

  // §17.1: the vrp store gives the number held fixed and the bars give the
  // denominator — either failing leaves nothing to compare.
  const vrpState = sourceState(vrpQ)
  const barsState = sourceState(barsQ)
  const failedQ = vrpState === 'failed' ? vrpQ : barsQ
  const staleQ = vrpState === 'stale' ? vrpQ : barsQ
  const pageState =
    preview === 'loading' || preview === 'failed' || preview === 'stale'
      ? preview
      : vrpState === 'failed' || barsState === 'failed'
        ? 'failed'
        : vrpState === 'loading' || barsState === 'loading'
          ? 'loading'
          : vrpState === 'stale' || barsState === 'stale'
            ? 'stale'
            : 'ready'

  const estName = est === 'cc' ? 'close-close' : est === 'park' ? 'Parkinson' : 'Garman-Klass'
  const qmName = qm === 'nearest' ? 'nearest-rank' : qm === 'hazen' ? 'Hazen' : 'linear'

  return (
    <PageShell padding="compact" className="space-y-3">
      {/* §16.10: the lead behind ⓘ, the committed reading's session as the
          stamp, judged by Research as the reading face's is. */}
      <PageHead
        title="History · method"
        info={LEAD}
        stamp={
          <AsofTag
            asof={committed?.asOf ?? null}
            flag={healthFlag(health.data, { loading: health.isLoading, error: health.isError })}
            judgedBy="Research"
            href="/research/signal-health"
          />
        }
        actions={
          sym && iv != null ? (
            <AskCopilotButton
              originPage="lab-history"
              originLabel="History · method"
              symbol={sym}
              snapshot={compactSnapshot({
                iv30: iv,
                method: { est, ann, overlap, qm, tenor },
                spread,
                windows: table.map((r) => ({ w: r.window, rank: r.rank, pctl: r.percentile, eff: r.effN })),
              })}
              suggestedPrompt={`Holding ${sym}'s IV30 fixed, how much of this rank is the window choice rather than the market?`}
            />
          ) : null
        }
      />

      <div data-sr-toolbar="">
        <PageFaceSwitch path="/research/lab/history" />
        <span data-sr-tb="sep" />
        {/* The prototype's own pastel violet, as Backtest's lab mark. */}
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 mat-tag font-mono text-dense-micro font-semibold tracking-[0.05em] text-[var(--sk-series-violet)]"
          title="Method face — how the number is made. Analysis only; no order can be placed from here."
        >
          ◆ METHOD · NO ORDERS
        </span>
        <Link
          to="/research/history"
          title="The reading face — what the market says. Same subject, same endpoint."
          className="ml-auto whitespace-nowrap font-mono text-dense-meta text-primary hover:underline"
        >
          Reading → /research/history
        </Link>
      </div>

      <SymbolContextGuard
        symbol={sym}
        description="The method face recomputes one name's denominator. Pick a symbol, then come back here."
      >
        {pageState === 'stale' ? (
          <ViewState
            kind="stale"
            title="Couldn’t refresh the readings"
            detail={staleDetail(staleQ, 'a session landed since may be missing.')}
            onAction={() => {
              void vrpQ.refetch()
              void barsQ.refetch()
            }}
          />
        ) : null}

        {pageState === 'loading' ? (
          <section className="overflow-hidden mat-card">
            <ViewState kind="loading" title="Loading the bars and the committed reading" rows={6} cols={7} />
          </section>
        ) : pageState === 'failed' ? (
          <section className="overflow-hidden mat-card">
            <ViewState
              kind="failed"
              title={vrpState === 'failed' ? 'Couldn’t load the committed reading' : 'Couldn’t load the bars'}
              detail={failedDetail(
                failedQ,
                'Nothing was recomputed — this is not a name without a rank.'
              )}
              onAction={() => {
                void vrpQ.refetch()
                void barsQ.refetch()
              }}
            />
          </section>
        ) : iv == null ? (
          <section className="overflow-hidden mat-card">
            <ViewState
              kind="empty"
              title={`No IV30 to hold fixed for ${sym}`}
              detail={`The vrp store holds no IV30 for ${sym}${
                committed?.suspects.length ? ' it is willing to stand behind (suspect readings withheld)' : ''
              } — there is nothing to hold fixed while the denominator moves.`}
            />
          </section>
        ) : (
          <>
            {/* The verdict the reading face quotes, from the same store. */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border px-3 py-1.5 mat-card">
              <Link
                to={withSymbolParam(SYMBOL_PATH, sym)}
                className={cn(mono, 'type-section font-bold text-entity-symbol hover:underline')}
              >
                {sym}
              </Link>
              <span
                className={cap}
                title="The committed reading, from the vrp store — the same source Trade quotes."
              >
                Verdict · same source as Trade
              </span>
              {[
                { label: 'IV30', value: iv.toFixed(1), ink: 'text-foreground' },
                { label: 'RV20', value: rv20 != null ? rv20.toFixed(1) : '—', ink: rv20 != null ? 'text-foreground' : 'text-muted-foreground' },
                {
                  label: 'percentile · as Trade quotes it',
                  value: committed?.percentile != null ? String(committed.percentile) : '—',
                  ink: placeInk(committed?.percentile ?? null),
                },
              ].map((v) => (
                <span key={v.label} className="flex flex-col gap-px whitespace-nowrap">
                  <span className={cn(mono, 'text-dense-body font-semibold', v.ink)}>{v.value}</span>
                  <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>{v.label}</span>
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-start gap-3">
              <aside className={cn(panel, 'flex max-w-[26rem] flex-[1_1_18rem] flex-col')} aria-label="Method">
                <header className={panelHead}>
                  <span className={cap}>Method</span>
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
                  {/* The sample sits under the controls, as the prototype draws it. */}
                  <div className="flex flex-col gap-1.5 border-t border-border pt-2.5">
                    <span className={cap}>Sample · {COMMITTED} window</span>
                    <div className="flex items-center justify-between text-dense-meta">
                      <span>windows drawn</span>
                      <span className={mono}>{six?.n ?? '—'}</span>
                    </div>
                    <div className="flex items-center justify-between text-dense-meta">
                      <span>effective n</span>
                      <DenseTag size="cell" variant={six != null && six.effN < 20 ? 'warning' : 'neutral'}>
                        {six?.effN ?? '—'}
                      </DenseTag>
                    </div>
                    <p className="m-0 text-dense-caption leading-normal text-muted-foreground text-pretty">
                      {rets.length} sessions of bars · {ohlcDays} with OHLC.{' '}
                      {overlap === 'overlap'
                        ? `Overlapping ${tenor}d windows share most of their days — the effective count is the honest one.`
                        : `Independent ${tenor}d windows — honest, and small enough that one quiet month moves a band edge.`}
                    </p>
                  </div>
                </div>
              </aside>

              <div className="flex min-w-0 flex-[999_1_34rem] flex-col gap-3">
                <section className={panel} aria-label="Same IV30, different answers">
                  <header className={panelHead}>
                    <span className="text-dense-body font-semibold">Same IV30, different answers</span>
                    <span className="text-dense-meta text-muted-foreground">
                      IV30 = {iv.toFixed(1)} held fixed · only the denominator moves
                    </span>
                    <span className="ml-auto">
                      <DenseTag size="cell" variant={(spread ?? 0) > 25 ? 'warning' : 'neutral'}>
                        spread {spread != null ? `${spread.toFixed(0)} pts` : '—'}
                      </DenseTag>
                    </span>
                  </header>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px]">
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
                          // Outside the sample is a mark in amber, not a
                          // number pretending to be a percentile.
                          const out =
                            r.rank != null && (r.rank > 100 || r.rank < 0)
                              ? r.rank > 100
                                ? 'out ↑'
                                : 'out ↓'
                              : null
                          const isCommitted = r.window === COMMITTED
                          return (
                            <tr
                              key={r.window}
                              // The committed window is a row state (Rev .154 --sr-row).
                              className={
                                isCommitted ? '[--sr-row:color-mix(in_srgb,var(--sk-accent)_6%,transparent)]' : undefined
                              }
                            >
                              <td
                                className={cn(
                                  td,
                                  'text-left',
                                  isCommitted ? 'font-bold text-primary' : 'text-secondary-foreground'
                                )}
                                title={isCommitted ? 'The committed window — the one the reading face quotes.' : undefined}
                              >
                                {r.window}
                              </td>
                              <td className={cn(td, 'text-dense-body font-semibold', out ? 'text-warning' : placeInk(r.rank))}>
                                {out ?? (r.rank != null ? r.rank.toFixed(0) : '—')}
                              </td>
                              <td
                                className={cn(td, 'text-dense-body font-semibold', out ? 'text-warning' : placeInk(r.percentile))}
                              >
                                {out ?? (r.percentile != null ? r.percentile.toFixed(0) : '—')}
                              </td>
                              <td className={cn(td, 'text-muted-foreground')}>{r.min?.toFixed(1) ?? '—'}</td>
                              <td className={cn(td, 'text-muted-foreground')}>{r.median?.toFixed(1) ?? '—'}</td>
                              <td className={cn(td, 'text-muted-foreground')}>{r.max?.toFixed(1) ?? '—'}</td>
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
                  </div>
                  <p className="m-0 border-t border-border px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
                    IV rank is where {iv.toFixed(1)} sits between the window’s extremes; IV percentile is the
                    share of the window below it — two questions, which a single outlier month answers very
                    differently. The committed reading is the {COMMITTED} window under the store’s own
                    method; every other cell is this page recomputing. A spread across the windows is the
                    window choice talking, not the market.
                  </p>
                </section>

                <section className={panel} aria-label="Cone under the chosen method">
                  <header className={panelHead}>
                    <span className="text-dense-body font-semibold">Cone under the chosen method</span>
                    <span className={cn(mono, 'text-dense-meta text-muted-foreground')}>
                      {estName} · ann {ann} · {overlap === 'overlap' ? 'overlapping' : 'non-overlapping'} · {qmName}
                    </span>
                  </header>
                  <div className="px-3 pb-2 pt-2.5">
                    <VolCone rows={cone} />
                  </div>
                  <p className="m-0 border-t border-border px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
                    Bands are the 20–80 and 5–95 of realised vol per tenor under this method; the dot
                    is today’s IV30 at its own tenor. The reading face’s cone stays the committed one
                    — this cone moves with the controls.
                  </p>
                </section>
              </div>
            </div>
          </>
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
