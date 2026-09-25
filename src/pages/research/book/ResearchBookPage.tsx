/**
 * The Book — the fold's own page. `/research/book`
 *
 * Design §5a.4: four parallel children and none of them is The Book, so
 * promoting one would make the fold an alias of one of its own siblings. It
 * gets a page, and the page answers what the four cannot: **where an idea is
 * standing, and what is holding it.**
 *
 * Every judgment on it is a cross-table one — a watchlist name with no
 * hypothesis about it, a candidate past its expiry, a belief with no settled
 * position behind it. None of the four pages can see any of those, because
 * each of them holds one table.
 *
 * And it creates nothing. Hypotheses and candidates are born beside evidence,
 * on Symbol, Compare and Review; this page counts them.
 *
 * Second pass 2026-09-20 against `Research Book.dc.html` (Rev 2026-09-20.24),
 * after `/risk` and `/portfolio` were re-walked the same way: Census leads
 * with the count and says what each state is, Waiting on you carries its own
 * verdict and the three columns that say which table a row is in, and Four
 * views became rows with the size of what each one holds.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader, PageShell, SectionPanel, SECTION_CAP_CLASS } from '@/components/layout'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeadRow,
  DenseTableHeader,
  DenseTableRow,
  DenseTag,
  EmptyState,
  denseTableNumCell,
} from '@/components/data-display'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { cn } from '@/lib/utils'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import { withSymbolParam } from '@/lib/symbolLink'
import { useRowLink } from '@/hooks/useRowLink'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useHypothesisList } from '@/hooks/useHypotheses'
import { fetchCandidates } from '@/api/research/candidates'
import {
  bookViews,
  census,
  dominantCause,
  stuckAgeTone,
  waitingOnYou,
  type CensusBand,
  type StuckKind,
} from '@/lib/research/bookCensus'

const LEAD =
  'One ledger read four ways. An idea is watched, pooled as a candidate, believed as a hypothesis, and settled into the journal — the four pages below are four views of that one lifecycle, and this is the census across them.'

const KIND_TAG: Record<StuckKind, { label: string; variant: 'warning' | 'danger' | 'neutral' }> = {
  'no thesis': { label: 'no thesis', variant: 'danger' },
  'aging in pool': { label: 'aging in pool', variant: 'warning' },
  'thin record': { label: 'thin record', variant: 'neutral' },
}

const AGE_INK = { old: 'text-destructive', aging: 'text-warning', plain: 'text-muted-foreground' }

/** One state of the book: how many, what it is, and how that number breaks down. */
function CensusCell({ band }: { band: CensusBand }) {
  const body = (
    <>
      <span className="flex items-baseline gap-2">
        <span className={cn('font-mono text-2xl font-bold tabular-nums', band.ink)}>
          {band.parts == null ? '—' : band.n}
        </span>
        <span className="text-dense-body font-semibold">{band.label}</span>
      </span>
      <span className="text-dense-meta leading-relaxed text-muted-foreground">{band.what}</span>
      {band.parts == null ? (
        // A dash and a reason, not a zero: a zero is a count, and "nothing
        // counts this" is not one.
        <span className="text-dense-caption leading-snug text-muted-foreground">
          {band.missing}
        </span>
      ) : (
        <span className="flex flex-wrap gap-1">
          {band.parts.map((p) => (
            <DenseTag key={p.label} variant={p.variant} size="cell">
              {p.label}
            </DenseTag>
          ))}
        </span>
      )}
    </>
  )
  const cls =
    'flex min-w-0 flex-col gap-1.5 border-r border-border/60 px-3 py-2.5 text-left last:border-r-0'
  return band.to == null ? (
    // Not a link, and it says so on hover rather than looking like one that
    // silently does nothing.
    <div className={cls} title={`${band.label} has no page on this side yet — ${band.missing ?? ''}`}>
      {body}
    </div>
  ) : (
    <Link to={band.to} className={cn(cls, 'hover:bg-secondary/40')}>
      {body}
    </Link>
  )
}

export default function ResearchBookPage() {
  const watch = useWatchlist()
  const hypotheses = useHypothesisList({ limit: 200 })
  // Every status, not only what is open: the census counts the funnel, and a
  // funnel drawn from its narrowest band is not a funnel.
  const candidates = useQuery({
    queryKey: ['research', 'candidates', 'book', 'all'],
    queryFn: () => fetchCandidates({ status: 'all' }),
    staleTime: 60_000,
  })

  const items = useMemo(() => watch.data?.items ?? [], [watch.data])
  const hyp = useMemo(() => hypotheses.data?.rows ?? [], [hypotheses.data])
  const cand = useMemo(() => candidates.data?.items ?? [], [candidates.data])

  const bands = useMemo(() => census(items, hyp, cand), [items, hyp, cand])
  const views = useMemo(() => bookViews(bands), [bands])
  // One clock for the whole page, read once on mount rather than during
  // render: every age is then measured against the same moment, and the
  // render stays pure. A page whose rows silently disagree about "now" by a
  // few milliseconds is not a real bug, but a render that reads the clock is.
  const [now] = useState(() => Date.now())
  const stuck = useMemo(() => waitingOnYou(items, hyp, cand, now), [items, hyp, cand, now])

  const cause = useMemo(() => dominantCause(stuck), [stuck])

  const loading = watch.isLoading || hypotheses.isLoading || candidates.isLoading
  const rowLink = useRowLink()

  /**
   * As of the *stalest* of the three reads, not the freshest.
   *
   * The census is a claim across three tables, so it is only as current as
   * the one that answered longest ago. Taking the newest would date the page
   * by whichever query happened to refetch last.
   */
  const asOf = useMemo(() => {
    const stamps = [watch.dataUpdatedAt, hypotheses.dataUpdatedAt, candidates.dataUpdatedAt].filter(
      (t) => typeof t === 'number' && t > 0,
    )
    if (stamps.length < 3) return null
    // Cut to the second first: replacing the T lengthens the string, and
    // slicing after it takes the seconds off.
    return new Date(Math.min(...stamps)).toISOString().slice(0, 19).replace('T', ' · ') + 'Z'
  }, [watch.dataUpdatedAt, hypotheses.dataUpdatedAt, candidates.dataUpdatedAt])

  return (
    <PageShell padding="compact" className="space-y-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 max-w-[78ch] flex-[1_1_420px]">
          <PageHeader
            title="The Book"
            titleSize="large"
            description={LEAD}
          />
        </div>
        {asOf != null ? (
          <div className="ml-auto flex flex-none items-center gap-2 pt-1">
            <span className={SECTION_CAP_CLASS}>as of</span>
            <span
              className="inline-flex h-6 items-center border px-2 font-mono text-dense-meta text-muted-foreground mat-tag"
              title="When the stalest of the three tables answered. The census is a claim across all three, so it is only as current as the oldest of them."
            >
              {asOf}
            </span>
          </div>
        ) : null}
      </div>

      {watch.isError ? <QueryErrorAlert error={watch.error} /> : null}
      {hypotheses.isError ? <QueryErrorAlert error={hypotheses.error} /> : null}
      {candidates.isError ? <QueryErrorAlert error={candidates.error} /> : null}

      <SectionPanel
        cap="Census"
        title="Where every idea in the book currently stands"
        note="an idea moves left to right; nothing is deleted, only settled"
      >
        {loading ? (
          <Skeleton className="m-3 h-24 rounded-md" />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,210px),1fr))]">
            {bands.map((b) => (
              <CensusCell key={b.label} band={b} />
            ))}
          </div>
        )}
      </SectionPanel>

      <SectionPanel
        cap="Waiting on you"
        title={
          stuck.length === 0
            ? 'Clear'
            : `${stuck.length} ${stuck.length === 1 ? 'row needs' : 'rows need'} a decision`
        }
        note="rows that cannot move to the next state without a decision"
        tone={stuck.length === 0 ? undefined : 'warning'}
      >
        {/* One cause, named before its rows. The list is true and complete;
            without this line it is also a wall, and the row that is actually
            yours to answer is somewhere inside it. */}
        {cause != null ? (
          <p className="border-b border-border/60 px-3 py-1.5 text-dense-meta text-muted-foreground">
            <span className="text-foreground/80">
              {cause.n} of {stuck.length}
            </span>{' '}
            read <span className="text-foreground/80">{cause.kind}</span> — that is one cause seen{' '}
            {cause.n} times rather than {cause.n} separate problems.
            {cause.kind === 'thin record'
              ? ' Nothing links a hypothesis to a settled position on this side, so every live belief reads thin.'
              : ''}
          </p>
        ) : null}
        {loading ? (
          <Skeleton className="m-3 h-40 rounded-md" />
        ) : stuck.length === 0 ? (
          <EmptyState
            title="Nothing is waiting on you"
            description="Every hypothesis has a record, every candidate is fresh enough to still mean something, and every watched name carries a thesis. The book moves on its own until one of those stops being true."
          />
        ) : (
          <DenseDataTable wrapClassName="rounded-none border-0" scrollX={false}>
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead className="w-24 max-w-none">Where</DenseTableHead>
                <DenseTableHead className="w-20 max-w-none">Scope</DenseTableHead>
                <DenseTableHead>What is waiting</DenseTableHead>
                <DenseTableHead className="w-32 max-w-none">Reason</DenseTableHead>
                <DenseTableHead className="w-16 max-w-none text-right">Age</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {stuck.map((s) => (
                // The whole row opens the table it lives in — the design's own
                // behaviour, and the only one that makes a five-column row
                // worth reading before you click it.
                <DenseTableRow key={s.key} title={s.why} {...rowLink(s.to)}>
                  <DenseTableCell className="max-w-none whitespace-nowrap text-muted-foreground">
                    {s.where}
                  </DenseTableCell>
                  <DenseTableCell className="max-w-none whitespace-nowrap font-mono">
                    {/* The ticker is its own destination: the row goes to the
                        table, the symbol goes to the name. Without this the
                        only way from a stuck row to the evidence behind it is
                        to retype the ticker. */}
                    {s.symbol == null ? (
                      <span
                        className="text-muted-foreground"
                        title="A belief about the whole book rather than one name — there is no symbol page to open."
                      >
                        {s.scope}
                      </span>
                    ) : (
                      <Link
                        to={withSymbolParam(SYMBOL_PATH, s.symbol)}
                        onClick={(e) => e.stopPropagation()}
                        className="font-semibold text-entity-symbol hover:underline"
                        title={`Open ${s.symbol} on Symbol`}
                      >
                        {s.scope}
                      </Link>
                    )}
                  </DenseTableCell>
                  <DenseTableCell>{s.what}</DenseTableCell>
                  <DenseTableCell className="max-w-none">
                    <DenseTag variant={KIND_TAG[s.kind].variant} size="cell">
                      {KIND_TAG[s.kind].label}
                    </DenseTag>
                  </DenseTableCell>
                  <DenseTableCell
                    className={cn(denseTableNumCell, 'max-w-none', AGE_INK[stuckAgeTone(s.ageDays)])}
                  >
                    {s.ageDays == null ? '—' : `${s.ageDays}d`}
                  </DenseTableCell>
                </DenseTableRow>
              ))}
            </DenseTableBody>
          </DenseDataTable>
        )}
      </SectionPanel>

      <SectionPanel
        cap="Four views"
        title="The same ledger, read from four angles"
        note="belongs to every operator — hand, loop and Copilot write into the same book"
      >
        {views.map((v) => (
          <div
            key={v.name}
            className="flex flex-wrap items-baseline gap-3 border-b border-border/60 px-3 py-2.5"
          >
            {v.to == null ? (
              <span
                className="w-36 flex-none text-dense-body font-semibold text-muted-foreground"
                title="No page on this side yet. Sending this click to the Hypothesis Board would answer a question about history with a list of beliefs."
              >
                {v.name}
              </span>
            ) : (
              <Link
                to={v.to}
                className="w-36 flex-none text-dense-body font-semibold text-primary hover:underline"
              >
                {v.name} →
              </Link>
            )}
            <span className="min-w-0 flex-[1_1_320px] text-pretty text-dense-meta leading-relaxed text-muted-foreground">
              {v.what}
            </span>
            <span className="whitespace-nowrap font-mono text-dense-caption text-muted-foreground">
              {v.meta}
            </span>
          </div>
        ))}
        <p className="px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
          Hypotheses and candidates are born next to evidence — on{' '}
          <Link to="/research/symbol" className="text-primary hover:underline">
            Symbol
          </Link>
          ,{' '}
          {/* Not a link: Compare is unbuilt here. The design names three
              birthplaces and this side has two, which the word says on hover
              rather than by leading somewhere that does not exist. */}
          <span
            className="text-muted-foreground"
            title="Compare is one of the design's three birthplaces for a thesis. It is not built on this side yet, so there is nowhere for this to go."
          >
            Compare
          </span>{' '}
          or in{' '}
          <Link to="/review" className="text-primary hover:underline">
            Review
          </Link>{' '}
          — never typed in here. This page counts; it does not create.
        </p>
      </SectionPanel>
    </PageShell>
  )
}
