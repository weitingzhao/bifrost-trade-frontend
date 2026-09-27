/**
 * Review · Single trade — one closed trade against the path it actually traded.
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
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ViewState } from '@bifrost/ui'
import { cn } from '@/lib/utils'
import { PageHead, PageHeadLink, PageShell } from '@/components/layout'
import { positionsUi } from '@/components/positions/positionsUi'
import { fmtIsoDateToken } from '@/lib/format'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
import { useExecutionsCanonical } from '@/hooks/useExecutions'
import { usePreviewState } from '@/hooks/usePreviewState'
import { useReviewTrades } from '@/hooks/useReviewTrades'
import { useTradeMarkPath } from '@/hooks/useTradeMarkPath'
import { REVIEW_UNRECORDED } from '@/utils/reviewTrades'
import { rankOnEntry } from '@/utils/entryIvRank'
import { useEntryIvRanks } from '@/hooks/useEntryIvRanks'
import { ReviewTradeFit } from './ReviewTradeFit'
import { TradePathPanels } from './TradePathPanels'
import { CounterfactualsTable, ExecutionTable } from './TradeFitTables'
import { SourcesPanel, TagsPanel, TimelinePanel, VerdictPanel } from './TradeFitAside'
import { counterfactuals, derivedTags, sources, timeline } from './tradeFitModel'

const PAGE_LEAD =
  'One closed trade against the path it actually traded: what I did, what the position was worth on every session it was held, and the best and worst that path ever offered. The distance to my plan would be discipline — and the plan is the one thing not recorded.'

export default function ReviewFitPage() {
  const [params, setParams] = useSearchParams()
  const [accountFilter] = useState('all')
  const { trades } = useReviewTrades(accountFilter)
  // The same cache entry useReviewTrades reads — held here for its §17 state.
  const execQuery = useExecutionsCanonical()

  const wanted = params.get('trade')
  const trade = useMemo(
    () => trades.find((t) => t.contractKey === wanted) ?? trades[0] ?? null,
    [trades, wanted],
  )

  const { path, expiryBranch, underlying, optionTicker, loading: pathLoading, error: pathError, refetch: refetchPath } =
    useTradeMarkPath(trade)

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

  const today = new Date().toISOString().slice(0, 10)
  const derived = useMemo(() => {
    if (trade == null) return null
    return {
      cfs: counterfactuals(trade, path, expiryBranch, today),
      stages: timeline(trade, path, { ivRank: ivRank ?? null, spot: entrySpot }),
      tags: derivedTags(trade, path),
      srcs: sources(trade, path, underlying.length, optionTicker, ivRank),
    }
  }, [trade, path, expiryBranch, underlying.length, optionTicker, today, ivRank, entrySpot])

  const preview = usePreviewState()
  const pageState =
    preview === 'loading' || preview === 'failed' || preview === 'stale' ? preview : sourceState(execQuery)

  return (
    <PageShell padding="compact" className="space-y-3">
      {/* §16.10: the lead behind ⓘ, the trade on screen as meta, the Queue and Habits as the head's doors. */}
      <PageHead
        title="Single trade"
        info={PAGE_LEAD}
        meta={
          trade ? (
            <span className={positionsUi.mono}>
              {trade.label} · {trade.closedOn ? fmtIsoDateToken(trade.closedOn) : '—'}
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

      {/* §17.3: the picker in the toolbar. The design draws a button per trade;
          the book closes too many for a row of buttons, so it is one select. */}
      {trades.length > 0 ? (
        <div data-sr-toolbar="">
          <span data-sr-tb="label">Trade</span>
          <select
            aria-label="Which trade"
            className={cn(positionsUi.input, 'max-w-72')}
            value={trade?.contractKey ?? ''}
            onChange={(e) => setParams({ trade: e.target.value })}
          >
            {trades.map((t) => (
              <option key={t.contractKey} value={t.contractKey}>
                {t.label} · {t.closedOn ? fmtIsoDateToken(t.closedOn) : '—'}
              </option>
            ))}
          </select>
          <span data-sr-tb="meta">{trades.length} closed trades</span>
        </div>
      ) : null}

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
          <ReviewTradeFit trade={trade} markPath={path} pathLoading={pathLoading} />

          <div className="flex flex-wrap items-start gap-3">
            <div className="flex min-w-0 flex-[999_1_40rem] flex-col gap-3">
              {pathLoading ? (
                <section className="overflow-hidden mat-card">
                  <ViewState kind="loading" title="Reading the contract’s daily bars" rows={5} cols={4} />
                </section>
              ) : (
                <TradePathPanels trade={trade} markPath={path} expiryBranch={expiryBranch} underlying={underlying} />
              )}
              <CounterfactualsTable rows={derived.cfs} />
              <ExecutionTable trade={trade} />
            </div>

            <aside className="flex min-w-0 max-w-[27.5rem] flex-[1_1_21rem] flex-col gap-3">
              <VerdictPanel trade={trade} markPath={path} />
              <TimelinePanel stages={derived.stages} />
              <TagsPanel tags={derived.tags} />
              <SourcesPanel rows={derived.srcs} />
            </aside>
          </div>

          <p className="m-0 border px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty mat-card">
            <span className="font-semibold text-secondary-foreground">Boundary.</span> Nothing here writes: no
            confirmation, no tag, no note. {REVIEW_UNRECORDED.reviewed}
          </p>
        </>
      )}
    </PageShell>
  )
}
