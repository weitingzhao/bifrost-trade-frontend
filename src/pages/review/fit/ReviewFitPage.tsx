/**
 * Review · Trade review — one closed trade against the path it actually traded.
 *
 * The design's argument is a distance measured twice: what I did against what
 * my plan said is discipline, and what my plan said against the best the trade
 * ever printed is the plan itself. The second endpoint — the best mark — is
 * read off the contract's own daily bars. The plan is not stored anywhere, so
 * both distances stay marked while everything they would have been measured
 * from is drawn in full.
 *
 * Layout is the design's: the path and the tables in the wide column, the
 * verdict, the timeline, the tags and the sources in the narrow one. The
 * entry stage carries the underlying's IV rank on the day, read from
 * Research's IV-rank history (measured 2026-09-26: the trailing year, per
 * session) — it had been listed as not recorded.
 */
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ViewState } from '@bifrost/ui'
import { PageHead, PageHeadLink, PageShell, SectionHead, TradeFaceSwitch } from '@/components/layout'
import { StatusLamp } from '@/components/StatusLamp'
import { useSaveTradeReview, useTradeReviews } from '@/hooks/useTradeReviews'
import { reviewState, reviewWalk } from './reviewWalk'
import { positionsUi } from '@/components/positions/positionsUi'
import { fmtIsoDateToken } from '@/lib/format'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
import { useExecutionsAll } from '@/hooks/useExecutions'
import { usePreviewState } from '@/hooks/usePreviewState'
import { useTradePath } from '@/hooks/useTradePath'
import { buildReviewedTrades, type ReviewedTrade } from '@/utils/reviewedTrades'
import { rankOnEntry } from '@/utils/entryIvRank'
import { useEntryIvRanks } from '@/hooks/useEntryIvRanks'
import { ReviewGaps } from './ReviewTradeFit'
import { TradeEconomics } from './TradeEconomics'
import { PeersPanel } from './PeersPanel'
import { useTradeStates, useTrades } from '@/hooks/useStrategies'
import { TradePicker } from './TradePicker'
import { TradePathPanels } from './TradePathPanels'
import { CounterfactualsTable, ExecutionTable } from './TradeFitTables'
import { SourcesPanel, TagsPanel, TimelinePanel, VerdictPanel } from './TradeFitAside'
import { corporateActionRow, counterfactuals, derivedTags, sources, timeline } from './tradeFitModel'
import { PnlSourcePanel } from './PnlSourcePanel'
import { useTradeOrigins } from '@/hooks/useTradeOrigins'
import { useQuery } from '@tanstack/react-query'
import { fetchCorporateActions } from '@/api/marketData/corporateActions'
import { etTodayIso } from '@/lib/freshness'

const PAGE_LEAD =
  'One trade — every leg on one line, rolls as seams, open ones as an interim read — against the path it actually traded: what I did, what the position was worth on every session it was held, and the best and worst that path ever offered. The distance to my plan would be discipline — and the plan is the one thing not recorded.'

export default function ReviewFitPage() {
  const [params, setParams] = useSearchParams()
  // The same cache entry every Review page reads — held here for its §17 state.
  const execQuery = useExecutionsAll()
  const today = etTodayIso()

  // Rev .104: the unit is the instance (open ones first). Rev .110: `?t=#NNN`
  // picks one (`?inst=` still read); an older `?trade=<contract>` link lands on
  // the instance that traded it. With neither, the page opens the first trade
  // still awaiting review, and ‹ › walks that queue — or Queue's own row order
  // when arrived from there (`in=list&list=…`).
  const origins = useTradeOrigins()
  // Open / closed is the instance list's state (core 0.41.0, TD-43).
  const states = useTradeStates()
  const trades = useMemo(
    () => buildReviewedTrades(execQuery.data?.items ?? [], today, origins.exitBy, states),
    [execQuery.data?.items, today, origins.exitBy, states],
  )
  const reviews = useTradeReviews()
  const saveReview = useSaveTradeReview()
  const wantedInst = (params.get('t') ?? params.get('inst') ?? '').replace('#', '')
  const wanted = params.get('trade')
  const walk = useMemo(
    () =>
      reviewWalk(trades, reviews.byTrade, {
        explicit: Boolean(wantedInst || wanted),
        list: params.get('in') === 'list' ? params.get('list') : null,
      }),
    [trades, reviews.byTrade, wantedInst, wanted, params],
  )
  const picked = useMemo(
    () =>
      (wantedInst ? trades.find((t) => t.tradeId === Number(wantedInst)) : null) ??
      (wanted ? trades.find((t) => t.contractKey === wanted || t.legs.some((l) => l.contractKey === wanted)) : null) ??
      walk.trades[0] ??
      trades[0] ??
      null,
    [trades, wanted, wantedInst, walk.trades],
  )

  const { path, expiryBranch, underlying, optionTicker, loading: pathLoading, error: pathError, refetch: refetchPath } =
    useTradePath(picked, today)
  // An open instance reads at its mark to date — provisional, never the Ledger's realised figure.
  const trade = useMemo(
    () => (picked && picked.open && path ? { ...picked, realised: path.realised } : picked),
    [picked, path],
  )
  // Structure per instance for the «Same structure» peer set — the rulebook's own name.
  const tradesQ = useTrades()
  const structureOf = useCallback(
    (x: ReviewedTrade) =>
      x.tradeId == null
        ? null
        : (tradesQ.data?.items.find((i) => i.trade_id === x.tradeId)?.strategy_structure_name ?? null),
    [tradesQ.data],
  )
  // Keep the walk's context (`in` · `list`) while moving through it.
  const pick = (t: ReviewedTrade) =>
    setParams((prev) => {
      const out = new URLSearchParams()
      if (prev.get('in')) out.set('in', prev.get('in') as string)
      if (prev.get('list')) out.set('list', prev.get('list') as string)
      if (t.tradeId != null) out.set('t', `#${t.tradeId}`)
      else out.set('trade', t.contractKey)
      return out
    })

  const review = picked?.tradeId != null ? reviews.byTrade.get(picked.tradeId) : undefined
  const state = picked ? reviewState(picked, review) : null
  const writeReview = (patch: { tags_added_json?: string[]; tags_dropped_json?: string[]; reviewed?: boolean }, then?: () => void) => {
    if (picked?.tradeId == null) return
    saveReview.mutate({ tradeId: picked.tradeId, patch }, { onSuccess: () => then?.() })
  }
  const confirmAndNext = () =>
    writeReview({ reviewed: true }, () => {
      // The next trade still waiting after this one, in the walk's order.
      const i = walk.trades.findIndex((t) => t.contractKey === picked?.contractKey)
      const next = [...walk.trades.slice(i + 1), ...walk.trades.slice(0, Math.max(0, i))].find(
        (t) => !t.open && t.tradeId != null && !reviews.byTrade.get(t.tradeId)?.reviewed,
      )
      if (next) pick(next)
    })

  // The entry session's IV rank, on the same cache entry Habits reads it from.
  const ranks = useEntryIvRanks(useMemo(() => (trade ? [trade] : []), [trade]))
  const rankRows = trade ? ranks.rowsByName.get(trade.underlying) : undefined
  const ivRank =
    trade == null || rankRows === undefined
      ? undefined
      : rankRows === null || !trade.openedOn
        ? null
        : rankOnEntry(rankRows, trade.openedOn)
  const openedOn = trade?.openedOn ?? null
  const entrySpot = useMemo(() => {
    if (!openedOn) return null
    const bar = underlying.find((b) => b.date === openedOn && b.close != null)
    return bar?.close ?? null
  }, [underlying, openedOn])

  // Rev .112 · §5.1.4: the name's corporate actions, for the adjustment row (the Today page's cache family).
  const caSymbol = trade?.underlying ?? ''
  const caQuery = useQuery({
    queryKey: ['market-data', 'corporate-actions', caSymbol, 400],
    queryFn: () => fetchCorporateActions(caSymbol, 400),
    enabled: caSymbol !== '',
    staleTime: 10 * 60_000,
  })
  const caRows = caQuery.isError ? null : caQuery.data ? caQuery.data.rows : undefined
  const origin = trade?.tradeId != null ? (origins.byTrade.get(trade.tradeId) ?? null) : null

  const derived = useMemo(() => {
    if (trade == null) return null
    return {
      cfs: counterfactuals(trade, path, expiryBranch, today),
      stages: timeline(trade, path, { ivRank: ivRank ?? null, spot: entrySpot }),
      tags: derivedTags(trade, path),
      srcs: [corporateActionRow(trade, caRows, today), ...sources(trade, path, underlying.length, optionTicker, ivRank, origin)],
    }
  }, [trade, path, expiryBranch, underlying.length, optionTicker, today, ivRank, entrySpot, caRows, origin])

  const preview = usePreviewState()
  const pageState =
    preview === 'loading' || preview === 'failed' || preview === 'stale' ? preview : sourceState(execQuery)

  return (
    <PageShell padding="compact" className="space-y-3">
      {/* §16.10: the lead behind ⓘ, the trade on screen as meta, the Queue and Habits as the head's doors. */}
      <PageHead
        title="Trade review"
        info={PAGE_LEAD}
        meta={
          trade ? (
            <span className={positionsUi.mono}>
              {trade.tradeId != null ? `#${trade.tradeId} · ` : ''}
              {trade.label} · {trade.open ? 'open' : trade.closedOn ? fmtIsoDateToken(trade.closedOn) : '—'}
            </span>
          ) : undefined
        }
        actions={
          <>
            <PageHeadLink to="/review" title="Every closed trade">
              ← Queue
            </PageHeadLink>
            <PageHeadLink to="/review/habits" title="What this trade is one dot of">
              Habits →
            </PageHeadLink>
          </>
        }
      />

      {/* §17.3 · Rev .104: ‹ the current trade › and n of N in the toolbar; the
          closed-trade table (filter · search · group · [ ] step) behind it. */}
      <TradePicker
        trades={trades}
        current={trade}
        onPick={(t) => pick(t as ReviewedTrade)}
        walk={walk.trades}
        walkLabel={walk.label}
        leading={trade?.tradeId != null ? <TradeFaceSwitch tradeId={trade.tradeId} side="review" /> : null}
        trailing={
          state ? (
            <>
              <StatusLamp lamp={state === 'reviewed' ? 'green' : state === 'awaiting' ? 'yellow' : 'gray'} variant="dot" title={state} />
              <span className="text-dense-meta text-muted-foreground">{state}</span>
            </>
          ) : null
        }
      />

      {pageState === 'stale' ? (
        <ViewState
          kind="stale"
          title="Couldn’t refresh the closed book"
          detail={staleDetail(execQuery, 'a fill booked since then is not shown.')}
          onAction={() => void execQuery.refetch()}
        />
      ) : null}
      {pageState === 'ready' && pathError != null && path == null ? (
        <ViewState
          kind="stale"
          layout="strip"
          title="Couldn’t read this contract’s daily bars"
          detail="The path, the best and worst marks and the counterfactuals they price are unread — not a trade that never moved."
          onAction={refetchPath}
        />
      ) : null}

      {pageState === 'loading' ? (
        <section className="overflow-hidden mat-card">
          <ViewState kind="loading" title="Loading the closed book" rows={6} cols={5} />
        </section>
      ) : pageState === 'failed' ? (
        <section className="overflow-hidden mat-card">
          <ViewState
            kind="failed"
            title="Couldn’t load the closed book"
            detail={failedDetail(execQuery, 'Nothing was read — this is not a book with no closed trade.')}
            onAction={() => void execQuery.refetch()}
          />
        </section>
      ) : preview === 'empty' || trade == null || derived == null ? (
        <section className="overflow-hidden mat-card">
          <ViewState
            kind="empty"
            title="No closed trade to read"
            detail="A trade reaches this page once its own fills have taken the contract flat."
          />
        </section>
      ) : (
        <>
          {trade.open ? (
            <div
              role="status"
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[var(--mat-card-radius)] border px-3 py-2 text-dense-label text-[var(--sk-soft)]"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-warning) 45%, transparent)',
                background: 'color-mix(in srgb, var(--color-warning) 8%, transparent)',
              }}
            >
              <span className="font-bold text-warning">Interim review</span>
              <span>
                Day {trade.daysHeld ?? '—'} of {trade.dteAtEntry ?? '—'} · as of {fmtIsoDateToken(today)}. The path stops at
                today; best and worst are to date; the discipline gap counts only once the planned exit has passed;
                counterfactuals and the verdict are provisional.
              </span>
            </div>
          ) : null}
          <TradeEconomics inst={trade} markPath={path} pathLoading={pathLoading} today={today} />
          {/* §17.8: a band folds what follows it up to the next band, so this one
              is boxed with its own body — the rest of the page is not its section. */}
          <div className="space-y-3">
            <SectionHead note="What a P&L number cannot separate on its own.">The two gaps</SectionHead>
            <ReviewGaps tier={false} />
          </div>

          <div className="flex flex-wrap items-start gap-3">
            <div className="flex min-w-0 flex-[999_1_40rem] flex-col gap-3">
              {pathLoading ? (
                <section className="overflow-hidden mat-card">
                  <ViewState kind="loading" title="Reading the contract’s daily bars" rows={5} cols={4} />
                </section>
              ) : (
                <TradePathPanels trade={trade} markPath={path} expiryBranch={expiryBranch} underlying={underlying} />
              )}
              <PeersPanel self={trade} selfPath={path} all={trades} structureOf={structureOf} today={today} onPick={pick} />
              <CounterfactualsTable rows={derived.cfs} />
              <ExecutionTable trade={trade} />
              <PnlSourcePanel trade={trade} />
            </div>

            <aside className="flex min-w-0 max-w-[27.5rem] flex-[1_1_21rem] flex-col gap-3">
              <VerdictPanel trade={trade} markPath={path} />
              <TimelinePanel stages={derived.stages} />
              <TagsPanel
                tags={derived.tags}
                added={review?.tags_added_json ?? []}
                dropped={review?.tags_dropped_json ?? []}
                reviewed={Boolean(review?.reviewed)}
                confirmBlocked={
                  trade.tradeId == null
                    ? 'Booked to no trade — a review is kept per trade.'
                    : trade.open
                      ? 'Still open — an interim read cannot be confirmed.'
                      : reviews.isError
                        ? 'The review store did not answer.'
                        : null
                }
                saving={saveReview.isPending}
                error={saveReview.error ? (saveReview.error as Error).message : null}
                onChange={(next) =>
                  writeReview({
                    ...(next.added ? { tags_added_json: next.added } : {}),
                    ...(next.dropped ? { tags_dropped_json: next.dropped } : {}),
                  })
                }
                onConfirm={confirmAndNext}
              />
              <SourcesPanel rows={derived.srcs} />
            </aside>
          </div>

        </>
      )}
    </PageShell>
  )
}
