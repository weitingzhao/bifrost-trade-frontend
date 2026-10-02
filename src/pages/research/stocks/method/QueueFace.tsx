/**
 * Today's candidates — the Method face of Ratings · Stocks (design
 * `Research Stock Ratings Method.dc.html`, route rev 2026-09-22.6; §16
 * refinement at Rev .91).
 *
 * The night batch produced a queue; this page shows it with the evidence
 * behind each name, in the batch's own state: live, empty (a result, not a
 * blank), or failed (holding yesterday's queue, and saying so). Analysis only
 * — crossing to Trade is what places an order (D10).
 *
 * The hero's evidence is read per name from the stores that own it (measured
 * 2026-09-26): the forecast session, the playbook trigger record in the
 * forecast's scenario, max pain from the pin lens, the dealer flip from the
 * gex lens, and the loop personas' written verdict from the newest candidate
 * batch that carries the name. The first build called the first three and the
 * draft "not on the plan"; each answers on DEV.
 */
import { METHOD_INFO, METHOD_PATH, METHOD_TITLE, type MethodHead } from './methodHead'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button, ViewState } from '@bifrost/ui'
import {
  fetchForecastSessions,
  fetchPlaybookHitRate,
  fetchSepaCandidates,
  fetchSepaDaily,
} from '@/api/researchEngine'
import { fetchSepaScreenerWide } from '@/api/research/sepaScreenerWide'
import { fetchDailyClosesMulti } from '@/api/marketData/dailyBars'
import { fetchCandidateOutcomeRows } from '@/api/research/candidateOutcome'
import { postWatchlistItem } from '@/api/market'
import { pnlColorClass } from '@/utils/dailyChange'
import { fetchOrchestrationStatus } from '@/api/research/orchestration'
import { fetchCandidateOutcomeSummary } from '@/api/research/candidateOutcome'
import { fetchUniverseReach } from '@/api/research/universeReach'
import { fetchIvPercentile } from '@/api/research/ivRadar'
import { AsofTag } from '@/components/AsofTag'
import { DenseTag } from '@/components/data-display'
import { PageFaceSwitch, PageHead, PageShell } from '@/components/layout'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { CopilotDraftPanel } from '@/components/research/CopilotDraftPanel'
import { cap, mono, panel } from '@/components/research/labFaceUi'
import { useSignalHealthSummary } from '@/hooks/useCopilotStanding'
import { useExhibit } from '@/hooks/useLensRegistry'
import { useEarningsDates } from '@/hooks/useNarrative'
import { usePreviewState } from '@/hooks/usePreviewState'
import { useResearchDrafts } from '@/hooks/useResearchDrafts'
import { healthFlag, type AsofFlag } from '@/lib/asofTag'
import { cn } from '@/lib/utils'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/symbolTabs'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
import { estimateCaveat } from '@/utils/earningsEstimate'
import {
  batchState,
  candidateCard,
  forecastCall,
  forecastTile,
  funnelTiles,
  gradeVariant,
  ivTile,
  IV_UNRANKED,
  loopBriefFor,
  mom20From,
  perSymbolHits,
  pinTile,
  sameSetupTile,
  type CandidateCard,
  type CandidateChip,
  type CandidateTile,
} from './labTodayModel'

/** The design's event flag: a print this close is carried on the hero as a chip. */
const EARNINGS_FLAG_DAYS = 14

function Tile({ t }: { t: CandidateTile }) {
  return (
    <div className="min-w-0 border px-2.75 py-2 mat-card" title={t.title}>
      <div className={cap}>{t.label}</div>
      <div
        className={cn(
          mono,
          'mt-0.5 type-section font-semibold',
          !t.measured ? 'text-muted-foreground' : t.warn ? 'text-warning' : 'text-foreground'
        )}
      >
        {t.value}
      </div>
      <div className="truncate text-dense-caption text-muted-foreground" title={t.src}>
        {t.src}
      </div>
    </div>
  )
}

export function QueueFace({ head }: { head: MethodHead }) {
  const preview = usePreviewState()
  const [sel, setSel] = useState(0)
  const health = useSignalHealthSummary()

  const candQ = useQuery({
    queryKey: ['research', 'sepa', 'model-candidates'],
    queryFn: () => fetchSepaCandidates(),
    staleTime: 5 * 60_000,
  })
  const orchQ = useQuery({
    queryKey: ['research', 'orchestration', 'status'],
    queryFn: fetchOrchestrationStatus,
    staleTime: 60_000,
  })
  const dailyQ = useQuery({
    queryKey: ['research', 'sepa', 'model-daily', 'funnel'],
    queryFn: () => fetchSepaDaily({ limit: 1000 }),
    staleTime: 5 * 60_000,
  })
  const outcomeQ = useQuery({
    queryKey: ['research', 'candidate-outcome', 'summary'],
    queryFn: () => fetchCandidateOutcomeSummary(),
    staleTime: 5 * 60_000,
  })
  const reachQ = useQuery({
    queryKey: ['research', 'universe-reach'],
    queryFn: fetchUniverseReach,
    staleTime: 10 * 60_000,
  })

  const rows = useMemo(() => candQ.data?.candidates ?? [], [candQ.data])
  const symbols = useMemo(() => rows.map((r) => r.symbol), [rows])
  const symbolsKey = symbols.join(',')

  // Three joins the queue rows themselves do not carry: the wide table's
  // company name and CRS, the store's own closes for a real 20d momentum,
  // and the settled outcome record per name.
  const wideQ = useQuery({
    queryKey: ['research', 'sepa-wide-join', symbolsKey],
    queryFn: () => fetchSepaScreenerWide(),
    enabled: symbols.length > 0,
    staleTime: 10 * 60_000,
  })
  const barsQ = useQuery({
    queryKey: ['market', 'closes-multi', symbolsKey],
    queryFn: () => fetchDailyClosesMulti(symbols, 35),
    enabled: symbols.length > 0,
    staleTime: 10 * 60_000,
  })
  const outcomeRowsQ = useQuery({
    queryKey: ['research', 'candidate-outcome', 'rows-all'],
    queryFn: () => fetchCandidateOutcomeRows({ limit: 500 }),
    staleTime: 5 * 60_000,
  })

  const cards = useMemo(() => {
    const wide = new Map((wideQ.data?.rows ?? []).map((w) => [w.symbol, w]))
    const bars = barsQ.data ?? {}
    const hits = perSymbolHits(outcomeRowsQ.data?.rows ?? [])
    return rows.map((r, i) => {
      const w = wide.get(r.symbol)
      return candidateCard(r, i + 1, {
        company: w?.company_name ?? null,
        rs: w?.crs_percentile ?? null,
        mom20: mom20From(bars[r.symbol] ?? []),
        hit: hits.get(r.symbol) ?? null,
      })
    })
  }, [rows, wideQ.data?.rows, barsQ.data, outcomeRowsQ.data?.rows])
  const judged = batchState(orchQ.data, candQ.isSuccess || candQ.isError, rows.length)
  const state = preview === 'empty' ? 'empty' : judged
  const hero: CandidateCard | null = cards[Math.min(sel, cards.length - 1)] ?? null
  const heroSym = hero?.symbol ?? ''
  const heroRow = rows.find((r) => r.symbol === heroSym) ?? null

  // The per-name reads, hero only — one request each, cached per symbol.
  const gexQ = useExhibit('gex_regime', heroSym)
  const pinQ = useExhibit('opex_pin', heroSym)
  const forecastQ = useQuery({
    queryKey: ['research', 'forecast', 'sessions', heroSym, 'newest'],
    queryFn: () => fetchForecastSessions(heroSym, undefined, 1),
    enabled: Boolean(heroSym),
    staleTime: 10 * 60_000,
  })
  const playbookQ = useQuery({
    queryKey: ['research', 'playbook', 'hit-rate', heroSym, 90, 5],
    queryFn: () => fetchPlaybookHitRate(heroSym, 90, 5),
    enabled: Boolean(heroSym),
    staleTime: 10 * 60_000,
  })
  const earnQ = useEarningsDates(heroSym || null)
  // Only when the queue has no committed percentile: the IV store says why.
  const ivStoreQ = useQuery({
    queryKey: ['research', 'iv-percentile', heroSym],
    queryFn: () => fetchIvPercentile(heroSym),
    enabled: Boolean(heroSym) && heroRow != null && heroRow.iv_percentile == null,
    staleTime: 10 * 60_000,
  })
  // The loop's candidate batches are pending drafts; the newest few cover
  // the names it picked this week. No polling — a batch lands once a day.
  const draftsQ = useResearchDrafts({ kind: 'candidate_batch', limit: 5, refetchIntervalMs: 0 })

  const gexTile: CandidateTile = useMemo(() => {
    const r = gexQ.data?.readings as Record<string, unknown> | undefined
    const zero = r?.zero_gamma != null ? Number(r.zero_gamma) : null
    const spot = r?.spot != null ? Number(r.spot) : null
    if (zero == null || !Number.isFinite(zero)) {
      return {
        label: 'GEX flip',
        value: '—',
        src: gexQ.isError ? 'gex_regime exhibit unread' : 'gex_regime exhibit · not measured for this name',
        measured: false,
      }
    }
    const dist =
      spot != null && spot > 0
        ? ` · spot ${spot.toFixed(1)} · ${(((zero - spot) / spot) * 100).toFixed(1)}%`
        : ''
    return {
      label: 'GEX flip',
      value: zero.toFixed(1),
      src: `gex_regime exhibit${dist}`,
      measured: true,
    }
  }, [gexQ.data, gexQ.isError])

  const call = forecastCall(forecastQ.data?.rows?.[0])
  const readOf = (q: { isLoading: boolean; isError: boolean }) => ({ loading: q.isLoading, error: q.isError })
  const heroTile = (t: CandidateTile): CandidateTile => {
    switch (t.label) {
      case 'Forecast':
        return forecastTile(call, readOf(forecastQ))
      case 'Same-setup hit':
        return sameSetupTile(playbookQ.data, call?.path ?? null, readOf(playbookQ))
      case 'IV percentile':
        return ivTile(heroRow?.iv_percentile ?? null, ivStoreQ.data, readOf(ivStoreQ))
      case 'GEX flip':
        return gexTile
      case 'Max pain · PCR':
        return pinTile(
          pinQ.data ? ((pinQ.data.readings as Record<string, unknown> | undefined) ?? {}) : null,
          heroRow?.pcr_oi ?? null,
          readOf(pinQ),
        )
      default:
        return t
    }
  }
  const heroTiles: CandidateTile[] = hero ? hero.tiles.map(heroTile) : []

  // The design flags an earnings print inside two weeks on the hero.
  const nextEarnings = earnQ.data?.expected_next ?? null
  const earningsChip: (CandidateChip & { title: string }) | null =
    nextEarnings && nextEarnings.days_away >= 0 && nextEarnings.days_away <= EARNINGS_FLAG_DAYS
      ? { label: `EARNINGS T-${nextEarnings.days_away} · EST`, variant: 'warning', title: estimateCaveat(nextEarnings) }
      : null
  const brief = hero ? loopBriefFor(draftsQ.data?.rows ?? [], hero.symbol) : null

  const [watchNote, setWatchNote] = useState<string | null>(null)
  const addToWatchlist = (sym: string) => {
    setWatchNote('adding…')
    postWatchlistItem({ contract_key: `STK:${sym}`, symbol: sym, sec_type: 'STK', source: 'lab-today' })
      .then((r) => setWatchNote(r.ok ? `${sym} added to the watchlist.` : (r.error ?? 'refused')))
      .catch((e) => setWatchNote(`watchlist: ${(e as Error).message}`))
  }

  const sched = orchQ.data?.schedules.find((s) => s.job_name === 'research_trading_day')
  const lastRun = sched?.last_run_ended_at
    ? sched.last_run_ended_at.slice(0, 16).replace('T', ' ') + ' UTC'
    : null
  const nextTick = sched?.next_tick_at
    ? sched.next_tick_at.slice(0, 16).replace('T', ' ') + ' UTC'
    : null
  const session = candQ.data?.trade_date ?? null

  const funnel = funnelTiles(
    reachQ.data,
    dailyQ.data ? dailyQ.data.rows.length : null,
    Boolean(dailyQ.data && dailyQ.data.rows.length >= 1000),
    candQ.data ? rows.length : null,
    outcomeQ.data
  )

  // §17.1: the queue is the page; the orchestrator judges it, and three
  // joins only add columns — each of those fails as a strip.
  const pageState =
    preview === 'loading' || preview === 'failed' || preview === 'stale' ? preview : sourceState(candQ)
  const joinsUnread = [
    wideQ.isError && !wideQ.data ? 'company and CRS' : null,
    barsQ.isError && !barsQ.data ? '20d momentum' : null,
    outcomeRowsQ.isError && !outcomeRowsQ.data ? 'each name’s settled hit record' : null,
  ].filter((x): x is string => x != null)
  const batchFlag: AsofFlag | null =
    state === 'failed'
      ? {
          flag: `BATCH ${sched?.last_run_status ?? 'UNHEALTHY'}`,
          detail: orchQ.data?.detail ?? 'The orchestrator reports the nightly job unhealthy',
          tone: 'warning',
        }
      : healthFlag(health.data, { loading: health.isLoading, error: health.isError })

  return (
    <PageShell padding="compact" className="space-y-3">
      {/* §16.10: the lead behind ⓘ; the queue's session is the stamp, held
          and flagged by the orchestrator when the night batch failed. */}
      <PageHead
        title={METHOD_TITLE}
        info={METHOD_INFO}
        tabs={head.tabs}
        tab={head.tab}
        onTab={head.onTab}
        stamp={<AsofTag asof={session} flag={batchFlag} judgedBy="Research" href="/research/orchestration" />}
      />

      {/* The batch strip, now the toolbar: what this queue is and when the
          next one lands. The prototype's Batch state switch is its own
          preview control; here the orchestrator decides (and ?preview=). */}
      <div data-sr-toolbar="">
        <PageFaceSwitch path={METHOD_PATH} />
        <span data-sr-tb="sep" />
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 mat-tag font-mono text-dense-micro font-semibold tracking-[0.05em] text-[var(--sk-series-violet)]"
          title="Method face — how the number is made. Analysis only; no order can be placed from here."
        >
          ◆ METHOD · NO ORDERS
        </span>
        <span data-sr-tb="meta" className={cn(mono, state === 'failed' && 'text-warning')}>
          {state === 'failed'
            ? `held from ${session ?? 'the last session'} · not re-judged`
            : `${lastRun ? `batch ${lastRun}` : 'batch —'} · ${rows.length} in queue · SEPA + signal ensemble`}
        </span>
        <span
          data-sr-tb="meta"
          className={cn(mono, 'ml-auto')}
          title={orchQ.data?.detail ?? undefined}
        >
          {state === 'failed'
            ? 'retry pending · needs Ops'
            : nextTick
              ? `next ${nextTick}`
              : (orchQ.data?.verdict ?? '—')}
        </span>
      </div>

      {pageState === 'stale' ? (
        <ViewState
          kind="stale"
          title="Couldn’t refresh the queue"
          detail={staleDetail(candQ, 'a newer night’s queue may be missing.')}
          onAction={() => void candQ.refetch()}
        />
      ) : null}
      {pageState === 'ready' && orchQ.isError && !orchQ.data ? (
        <ViewState
          kind="stale"
          layout="strip"
          title="Couldn’t read the orchestrator"
          detail="The night batch is unjudged — the queue below may be a held one, and nothing here can say."
          onAction={() => void orchQ.refetch()}
        />
      ) : null}
      {pageState === 'ready' && joinsUnread.length > 0 ? (
        <ViewState
          kind="stale"
          layout="strip"
          title={`Couldn’t read ${joinsUnread.join(', ')}`}
          detail="Those readings are unread — a dash there is not a zero."
          onAction={() => {
            void wideQ.refetch()
            void barsQ.refetch()
            void outcomeRowsQ.refetch()
          }}
        />
      ) : null}

      {pageState === 'loading' ? (
        <section className="overflow-hidden mat-card">
          <ViewState kind="loading" title="Loading the queue" rows={6} cols={5} />
        </section>
      ) : pageState === 'failed' ? (
        <section className="overflow-hidden mat-card">
          <ViewState
            kind="failed"
            title="Couldn’t load the queue"
            detail={failedDetail(candQ, 'No candidate was read — this is not a night nothing cleared the gate.')}
            onAction={() => void candQ.refetch()}
          />
        </section>
      ) : null}

      {pageState !== 'loading' && pageState !== 'failed' && state === 'failed' ? (
        // A severity edge is inline — mat-card clears a border-colour class.
        <div
          className={panel}
          style={{ borderColor: 'color-mix(in srgb, var(--color-warning) 55%, transparent)' }}
        >
          <div className="flex flex-wrap items-start gap-3.5 px-3.5 py-3">
            <div className="flex min-w-0 flex-[1_1_20rem] flex-col gap-1">
              <div className={cn(mono, 'text-dense-caption tracking-[0.05em] text-warning')}>
                BATCH {sched?.last_run_status ?? 'UNHEALTHY'} · research_trading_day
              </div>
              <div className="text-dense-body font-semibold text-foreground">
                Today is holding the {session ?? 'last'} queue.
              </div>
              <p className="m-0 max-w-[64ch] text-dense-label leading-normal text-muted-foreground text-pretty">
                {orchQ.data?.detail ??
                  'The orchestrator reports the nightly job unhealthy; every number below is the last session it produced, not re-judged.'}
              </p>
            </div>
            <Link
              to="/system/status"
              className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--color-warning)_15%,transparent)] px-3 py-2 text-dense-label text-warning no-underline hover:bg-[color-mix(in_srgb,var(--color-warning)_22%,transparent)]"
            >
              Open System Status · needs you
            </Link>
          </div>
        </div>
      ) : null}

      {pageState !== 'loading' && pageState !== 'failed' && state === 'empty' ? (
        <div className={panel}>
          <div className="flex flex-col gap-3.5 px-3.5 py-4">
            <ViewState
              kind="empty"
              title="No candidate cleared the gate tonight"
              detail="The scan ran to completion and the universe was judged. Zero names passed the active policy — a result, not a blank. The previous queue is not shown, so an old list is not mistaken for a new one."
            />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(9.375rem,1fr))] gap-2">
              {funnel.map((f) => (
                <div key={f.label} className="border px-2.75 py-2 mat-card">
                  <div className={cap}>{f.label}</div>
                  <div
                    className={cn(
                      mono,
                      'mt-0.5 type-section font-semibold',
                      f.warn ? 'text-warning' : 'text-foreground'
                    )}
                  >
                    {f.value}
                  </div>
                  <div className={cn(mono, 'text-dense-caption text-muted-foreground')}>{f.src}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {hero && pageState !== 'loading' && pageState !== 'failed' && state !== 'empty' && state !== 'loading' ? (
        <>
          <div className={panel}>
            <header className="flex flex-wrap items-center gap-2.5 border-b px-3.5 py-2">
              <span className={cn(mono, 'text-dense-meta text-muted-foreground')}>
                #{hero.rank}
              </span>
              {/* §14.4: a bare ticker wears the ticker ink — the prototype's
                  accent on the hero is its link colour. */}
              <Link
                to={withSymbolParam(SYMBOL_PATH, hero.symbol)}
                className={cn(
                  mono,
                  'text-lg font-bold text-entity-symbol no-underline hover:underline'
                )}
                title="Open in Symbol — the reading face"
              >
                {hero.symbol}
              </Link>
              {hero.company ? (
                <span className="max-w-[24ch] overflow-hidden text-ellipsis whitespace-nowrap text-dense-label text-muted-foreground">
                  {hero.company}
                </span>
              ) : null}
              {hero.mom20 != null ? (
                <span className={cn(mono, 'text-dense-meta text-muted-foreground')}>
                  20d mom{' '}
                  <span className={pnlColorClass(hero.mom20)}>
                    {hero.mom20 >= 0 ? '+' : '−'}
                    {Math.abs(hero.mom20 * 100).toFixed(1)}%
                  </span>
                </span>
              ) : (
                <span className={cn(mono, 'text-dense-meta text-muted-foreground')}>
                  MOM {hero.momScore}
                </span>
              )}
              <span className="ml-auto inline-flex items-baseline gap-2">
                <span className={cn(mono, 'type-hero font-semibold leading-none text-foreground')}>
                  {hero.score}
                </span>
                <span className={cap}>score</span>
              </span>
            </header>
            <div className="flex flex-col gap-3 px-3.5 py-3">
              <div className="flex flex-wrap gap-1.5">
                {hero.chips.map((c) => (
                  <DenseTag key={c.label} variant={c.variant} size="cell">
                    {c.label}
                  </DenseTag>
                ))}
                {earningsChip ? (
                  <DenseTag variant={earningsChip.variant} size="cell" title={earningsChip.title}>
                    {earningsChip.label}
                  </DenseTag>
                ) : null}
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(8.25rem,1fr))] gap-2">
                {heroTiles.map((t) => (
                  <Tile key={t.label} t={t} />
                ))}
              </div>
              {/* The design's Copilot draft seat, filled from the store that has
                  one: the loop personas' verdict on this name in its newest
                  candidate batch (measured 2026-09-26). */}
              <CopilotDraftPanel
                title={
                  brief
                    ? `LOOP BRIEF · ${(brief.models.join(' + ') || 'personas').toUpperCase()} · ${brief.day}`
                    : 'LOOP BRIEF'
                }
              >
                {brief ? (
                  <>
                    {brief.verdict ?? 'The verdict persona wrote no sentence for this name.'}{' '}
                    <span className="text-muted-foreground">
                      Net {brief.stance ?? '—'}
                      {brief.blocked ? ' · held by Validate' : ''}
                      {brief.wrongIf[0] ? ` · wrong if ${brief.wrongIf[0]}` : ''}.
                    </span>{' '}
                    <Link to="/research/loop/decisions" className="text-primary hover:underline">
                      Decision Inbox →
                    </Link>
                  </>
                ) : draftsQ.isError ? (
                  'The loop’s candidate batches did not answer — whether a persona wrote about this name is unread.'
                ) : draftsQ.isLoading ? (
                  'Reading the loop’s candidate batches…'
                ) : (
                  `No pending loop batch carries ${hero.symbol}. The loop picks its own few names a day from a narrower funnel, so most of this ranking has no written verdict — the ask below reads this name live.`
                )}
              </CopilotDraftPanel>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => addToWatchlist(hero.symbol)}
                  title="Adds the stock line to the Trade watchlist — an observation list, not an order."
                >
                  Add to watchlist
                </Button>
                <Link
                  to={withSymbolParam(SYMBOL_PATH, hero.symbol)}
                  className="border px-3 py-1.5 text-dense-label text-foreground no-underline mat-btn"
                  title="The reading face — what the market says. Same subject, same stores."
                >
                  Open in Symbol →
                </Link>
                <Link
                  to="/research/stocks?model=sepa"
                  className="border px-3 py-1.5 text-dense-label text-muted-foreground no-underline mat-btn"
                  title="The model this queue came out of — weights, tape and the ranked table."
                >
                  Ratings · Stocks →
                </Link>
                <AskCopilotButton
                  originPage="lab-today"
                  originLabel="Today's candidates"
                  symbol={hero.symbol}
                  snapshot={{ queue: cards.length, hero: hero.symbol, state }}
                />
                {watchNote ? (
                  <span className={cn(mono, 'text-dense-micro text-muted-foreground')}>
                    {watchNote}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {cards
              .filter((c) => c.rank !== hero.rank)
              .map((c) => (
                <button
                  key={c.symbol}
                  type="button"
                  onClick={() => setSel(c.rank - 1)}
                  title={`Read ${c.symbol}'s evidence here`}
                  className="flex cursor-pointer flex-wrap items-center gap-3 border px-3.5 py-2.25 text-left mat-card hover:bg-[var(--card-fill-hover)]"
                >
                  <span className={cn(mono, 'min-w-5.5 text-dense-meta text-muted-foreground')}>
                    #{c.rank}
                  </span>
                  <span className={cn(mono, 'min-w-13 text-sm font-bold text-entity-symbol')}>
                    {c.symbol}
                  </span>
                  <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>
                    {c.sepaLine}
                  </span>
                  <DenseTag variant={gradeVariant(c.grade)} size="cell">
                    GRADE {c.grade}
                  </DenseTag>
                  {c.chips.some((ch) => ch.label === IV_UNRANKED) ? (
                    <DenseTag variant="warning" size="cell" title="No committed IV percentile for this name — its tile says why once it is the hero.">
                      {IV_UNRANKED}
                    </DenseTag>
                  ) : null}
                  {c.mom20 != null ? (
                    <span className={cn(mono, 'text-dense-caption', pnlColorClass(c.mom20))}>
                      {c.mom20 >= 0 ? '+' : '−'}
                      {Math.abs(c.mom20 * 100).toFixed(1)}%
                    </span>
                  ) : null}
                  <span
                    className={cn(mono, 'ml-auto text-dense-caption text-muted-foreground')}
                    title={
                      c.hit
                        ? 'Settled candidate outcomes for this name — hits over judged, all sources.'
                        : 'No settled outcome rows for this name yet.'
                    }
                  >
                    {c.hit ? `hit ${Math.round((c.hit.hits / c.hit.n) * 100)}% /${c.hit.n}` : 'unsettled'}
                  </span>
                  <span
                    className={cn(
                      mono,
                      'min-w-8 text-right text-lg font-semibold text-foreground'
                    )}
                  >
                    {c.score}
                  </span>
                </button>
              ))}
          </div>

          <p className="m-0 text-dense-caption text-muted-foreground text-pretty">
            {state === 'failed'
              ? `Every number on this page is as of ${session ?? 'the held session'}. The batch state lives in the stamp above, judged by the orchestrator.`
              : 'Direction is teal/orange everywhere — Trade, Workbench, Ops alike. Red is reserved for a real fault, so a falling number is never red.'}
          </p>
        </>
      ) : null}
    </PageShell>
  )
}
