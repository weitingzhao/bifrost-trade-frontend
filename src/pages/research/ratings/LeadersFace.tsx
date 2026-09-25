/**
 * Leaders — the momentum ranking, folded by name.
 *
 * Design Package 2026-09-23.5, which is the design answering this side's ask:
 * Momentum Radar was a ranking across sessions and nothing on Stock ratings
 * could hold that reading. One request, folded in the browser — the design is
 * explicit that no new endpoint is needed, and `?symbol=` would have answered
 * one row per call for a hundred names.
 *
 * The header states the window and the newest session separately on purpose.
 * The payload is the top N **symbol × session** over three months, so its
 * newest session carries a handful of names; a page that headed it "today"
 * would be wrong about nearly every row it draws.
 */
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  EmptyState,
  denseTableNumCell,
} from '@/components/data-display'
import { AddToPoolButton } from '@/components/research/AddToPoolButton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchMomentumRadar, type MomentumScore } from '@/api/researchEngine'
import { fmtIsoDateToken } from '@/lib/format'
import { withSymbolParam } from '@/lib/symbolLink'
import { ANALYZE_HUB } from '@/lib/analyzeHubs'
import { cn } from '@/lib/utils'
import {
  cellOpacity,
  foldLeaders,
  sortLeaders,
  type LeaderSortKey,
} from './leadersModel'

/** The design's own figure. One call; everything below is a fold over it. */
const RADAR_LIMIT = 200

export function LeadersFace({
  universe,
  inUniverse,
  sort,
  onSort,
  selected,
  onSelect,
  todayOf,
  onUniverseAll,
}: {
  universe: string
  /** Does this name pass the page's universe filter? */
  inUniverse: (symbol: string) => boolean
  sort: LeaderSortKey
  onSort: (k: LeaderSortKey) => void
  /** `{ symbol, date }` — the row and the session the factors panel reads. */
  selected: { symbol: string; date: string } | null
  onSelect: (sel: { symbol: string; date: string } | null) => void
  /** Today's stock-model reading for a name, when it is in today's ranking. */
  todayOf: (symbol: string) => { grade: string | null; path: string | null } | null
  onUniverseAll: () => void
}) {
  const q = useQuery({
    queryKey: ['research', 'momentum', 'leaders', RADAR_LIMIT],
    queryFn: () => fetchMomentumRadar({ limit: RADAR_LIMIT }),
    staleTime: 10 * 60_000,
  })

  const window = foldLeaders(q.data?.rows as MomentumScore[] | undefined)
  const all = window.rows
  const shown = sortLeaders(
    universe === 'all' ? all : all.filter((r) => inUniverse(r.symbol)),
    sort,
  )
  const latest = window.sessions[window.sessions.length - 1]

  const head = (label: string, key: LeaderSortKey, className?: string) => (
    <DenseTableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(key)}
        className="cursor-pointer bg-transparent p-0 text-inherit hover:text-foreground"
        title={`Rank by ${label.toLowerCase()}, highest first`}
      >
        {label} {sort === key ? '↓' : ''}
      </button>
    </DenseTableHead>
  )

  return (
    <section className="overflow-hidden border mat-card" aria-label="Leaders">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary px-3 py-2">
        <span className="text-dense-micro font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Leaders
        </span>
        <h2 className="text-dense-body font-semibold">
          {shown.length} names · {shown.reduce((n, r) => n + r.hits, 0)} rows
        </h2>
        <span className="text-dense-meta text-muted-foreground">
          top {RADAR_LIMIT} symbol × session
          {window.sessions.length > 0 ? (
            <>
              {' '}
              · {fmtIsoDateToken(window.sessions[0])} → {fmtIsoDateToken(latest)} ·{' '}
              {window.sessions.length} sessions with a row
            </>
          ) : null}
        </span>
        {latest ? (
          <span
            className="ml-auto text-dense-meta text-muted-foreground"
            title="The payload ranks the whole window by score, so its newest session holds only the names that scored highly on it — not a list of today's leaders."
          >
            latest session {fmtIsoDateToken(latest)}: {window.latestNames} names
          </span>
        ) : null}
      </header>

      {q.isError ? (
        <div className="px-3 py-3">
          <QueryErrorAlert error={q.error} />
        </div>
      ) : q.isLoading ? (
        <div className="space-y-1.5 px-3 py-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-6 rounded" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="px-3 py-4">
          <EmptyState
            title="No leaders in this universe"
            description={`${all.length} names reached the list in this window; none of them are in the universe you have selected. It is the filter, not the ranking.`}
            action={
              <button type="button" onClick={onUniverseAll} className="text-primary hover:underline">
                Universe › All
              </button>
            }
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <DenseDataTable tableClassName="min-w-[1000px]">
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead className="w-20 max-w-none">Symbol</DenseTableHead>
                <DenseTableHead className="w-24 max-w-none">Book</DenseTableHead>
                {head('Peak', 'peak', cn(denseTableNumCell, 'w-16 max-w-none'))}
                <DenseTableHead className="w-20 max-w-none">Peak on</DenseTableHead>
                {head('Hits', 'hits', cn(denseTableNumCell, 'w-14 max-w-none'))}
                {head('Last hit', 'last', 'w-20 max-w-none')}
                <DenseTableHead className={cn(denseTableNumCell, 'w-16 max-w-none')}>
                  Score
                </DenseTableHead>
                <DenseTableHead
                  className="max-w-none"
                  title="One cell per session in the window. Filled = the name was on the list that day, solid by score; grey = it was not. Click a cell to read that session's factors."
                >
                  Sessions
                </DenseTableHead>
                <DenseTableHead className="w-28 max-w-none">Today</DenseTableHead>
                <DenseTableHead className="w-16 max-w-none">Capture</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {shown.map((r) => {
                const on = selected?.symbol === r.symbol
                const today = todayOf(r.symbol)
                return (
                  <DenseTableRow
                    key={r.symbol}
                    onClick={() => onSelect(on ? null : { symbol: r.symbol, date: r.lastHit })}
                    className={cn('cursor-pointer', on && 'bg-primary/[0.06]')}
                  >
                    <DenseTableCell className="w-20 max-w-none whitespace-nowrap">
                      <Link
                        to={withSymbolParam(ANALYZE_HUB.dossier, r.symbol)}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono font-semibold text-entity-symbol hover:underline"
                      >
                        {r.symbol}
                      </Link>
                    </DenseTableCell>
                    <DenseTableCell className="w-24 max-w-none whitespace-nowrap text-dense-meta text-muted-foreground">
                      {inUniverse(r.symbol) ? 'in book · watch' : '—'}
                    </DenseTableCell>
                    <DenseTableCell className={cn(denseTableNumCell, 'w-16 max-w-none font-semibold')}>
                      {r.peak.toFixed(1)}
                    </DenseTableCell>
                    <DenseTableCell className="w-20 max-w-none whitespace-nowrap font-mono text-dense-caption text-muted-foreground">
                      {fmtIsoDateToken(r.peakOn)}
                    </DenseTableCell>
                    <DenseTableCell className={cn(denseTableNumCell, 'w-14 max-w-none')}>
                      {r.hits}
                    </DenseTableCell>
                    <DenseTableCell
                      className={cn(
                        'w-20 max-w-none whitespace-nowrap font-mono text-dense-caption',
                        r.lastHit === latest ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {fmtIsoDateToken(r.lastHit)}
                    </DenseTableCell>
                    <DenseTableCell className={cn(denseTableNumCell, 'w-16 max-w-none')}>
                      {r.lastScore.toFixed(1)}
                    </DenseTableCell>
                    <DenseTableCell className="max-w-none">
                      <span className="flex items-center gap-[2px]">
                        {r.cells.map((c) => {
                          const hit = c.score != null
                          return (
                            <button
                              key={c.date}
                              type="button"
                              disabled={!hit}
                              onClick={(e) => {
                                e.stopPropagation()
                                onSelect({ symbol: r.symbol, date: c.date })
                              }}
                              title={
                                hit
                                  ? `${fmtIsoDateToken(c.date)} · score ${c.score!.toFixed(1)}`
                                  : `${fmtIsoDateToken(c.date)} · not in top ${RADAR_LIMIT}`
                              }
                              className={cn(
                                'h-3.5 w-1.5 rounded-[1px]',
                                hit ? 'cursor-pointer bg-[var(--color-profit)]' : 'bg-secondary',
                                on && selected?.date === c.date && 'ring-1 ring-primary',
                              )}
                              style={
                                hit
                                  ? { opacity: cellOpacity(c.score!, window.min, window.max) }
                                  : undefined
                              }
                            />
                          )
                        })}
                      </span>
                    </DenseTableCell>
                    <DenseTableCell className="w-28 max-w-none whitespace-nowrap">
                      {today ? (
                        <DenseTag variant={today.path === 'PIVOT' ? 'success' : 'info'} size="cell">
                          {today.grade} · {today.path}
                        </DenseTag>
                      ) : (
                        <span
                          className="text-dense-meta text-muted-foreground"
                          title="Not in today's stock-model ranking — a momentum leader need not be a SEPA name."
                        >
                          not scored
                        </span>
                      )}
                    </DenseTableCell>
                    <DenseTableCell className="w-16 max-w-none">
                      <span className="flex items-center gap-1">
                        <AddToPoolButton
                          symbol={r.symbol}
                          source="momentum"
                          score={r.peak}
                          tags={['momentum', 'leaders']}
                          lens_snapshot={{
                            peak: r.peak,
                            peak_on: r.peakOn,
                            hits: r.hits,
                            last_hit: r.lastHit,
                          }}
                          size="icon"
                        />
                        {/* Pin and Hypothesis are owed with the six-verb row,
                            the same as on the Today view. No Plan: a ranking
                            is not a place to open a trade from. */}
                        <span
                          className="rounded px-1 py-0.5 text-dense-meta text-muted-foreground/70"
                          title="The design also puts Pin and Hypothesis here; both write, and what this view stamps as the source is the same product call the Today view is waiting on."
                        >
                          ⊹ ≋
                        </span>
                      </span>
                    </DenseTableCell>
                  </DenseTableRow>
                )
              })}
            </DenseTableBody>
          </DenseDataTable>
        </div>
      )}

      <p className="border-t border-border/60 px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
        One request, folded here: <span className="font-mono">/research/momentum/radar</span>{' '}
        returns the top {RADAR_LIMIT} <span className="font-mono">symbol × session</span> rows by
        score, so a name appears once per session it reached — <strong>Hits</strong> is that count,
        and it is the reading the flat list could not give. Scores are the momentum model&rsquo;s,
        on its own 0–100 scale; <strong>Today</strong> is the stock model&rsquo;s grade and path,
        which is a different question about the same name.
      </p>
    </section>
  )
}
