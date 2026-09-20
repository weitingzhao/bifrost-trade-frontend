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
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader, PageShell, SectionPanel } from '@/components/layout'
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
import { useWatchlist } from '@/hooks/useWatchlist'
import { useHypothesisList } from '@/hooks/useHypotheses'
import { fetchCandidates } from '@/api/research/candidates'
import {
  census,
  dominantCause,
  waitingOnYou,
  type StuckKind,
} from '@/pages/research/book/bookCensusModel'

const LEAD =
  'Where an idea is standing, and what is holding it. Each page below holds one table; the readings that matter here live across them — a name on the list with no hypothesis about it, a candidate past its expiry, a belief with nothing settled behind it. This page only counts: hypotheses and candidates are born beside evidence, on Symbol, Compare and Review.'

const KIND_TAG: Record<StuckKind, { label: string; variant: 'warning' | 'danger' | 'neutral' }> = {
  'no thesis': { label: 'NO THESIS', variant: 'warning' },
  'aging in pool': { label: 'AGING', variant: 'danger' },
  'thin record': { label: 'THIN RECORD', variant: 'neutral' },
}

const VIEWS = [
  { label: 'Hypothesis Board', to: '/research/loop/hypotheses', what: 'the beliefs, by lane' },
  { label: 'Candidate Pool', to: '/research/loop/candidates', what: 'what is nominated, and by whom' },
  { label: 'Watchlist', to: '/research/watchlist', what: 'the names being carried' },
  { label: 'Journal', to: '/research/loop/hypotheses', what: 'the lineage tree — no store yet' },
]

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

  const items = watch.data?.items ?? []
  const hyp = useMemo(() => hypotheses.data?.rows ?? [], [hypotheses.data])
  const cand = useMemo(() => candidates.data?.items ?? [], [candidates.data])

  const bands = useMemo(() => census(items, hyp, cand), [items, hyp, cand])
  // One clock for the whole page, read once on mount rather than during
  // render: every age is then measured against the same moment, and the
  // render stays pure. A page whose rows silently disagree about "now" by a
  // few milliseconds is not a real bug, but a render that reads the clock is.
  const [now] = useState(() => Date.now())
  const stuck = useMemo(() => waitingOnYou(items, hyp, cand, now), [items, hyp, cand, now])

  const cause = useMemo(() => dominantCause(stuck), [stuck])

  const loading = watch.isLoading || hypotheses.isLoading || candidates.isLoading

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHeader
        breadcrumb={<p className="text-xs font-medium text-primary/90">Research</p>}
        title="The Book"
        titleSize="large"
        description={LEAD}
      />

      {watch.isError ? <QueryErrorAlert error={watch.error} /> : null}
      {hypotheses.isError ? <QueryErrorAlert error={hypotheses.error} /> : null}
      {candidates.isError ? <QueryErrorAlert error={candidates.error} /> : null}

      <SectionPanel cap="Census" title="four states, widest first" note="the shape is the reading">
        {loading ? (
          <Skeleton className="m-3 h-24 rounded-md" />
        ) : (
          <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
            {bands.map((b) => (
              <Link
                key={b.label}
                to={b.to}
                className="flex flex-col gap-1 bg-card px-3 py-2 transition-colors hover:bg-secondary"
              >
                <span className="flex items-baseline gap-2">
                  <span className="text-dense-micro uppercase tracking-wide text-muted-foreground">
                    {b.label}
                  </span>
                  <span className="ml-auto font-mono text-dense-body font-semibold tabular-nums">
                    {b.parts == null ? '—' : b.n}
                  </span>
                </span>
                {b.parts == null ? (
                  // A dash and a reason, not a zero: a zero is a count, and
                  // "nothing counts this" is not one.
                  <span className="text-dense-micro leading-snug text-muted-foreground">{b.missing}</span>
                ) : (
                  <span className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-dense-micro text-muted-foreground">
                    {b.parts.map((p) => (
                      <span key={p.label} className={cn(p.n === 0 && 'opacity-55')}>
                        {p.label} <span className="font-mono tabular-nums text-foreground/80">{p.n}</span>
                      </span>
                    ))}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </SectionPanel>

      <SectionPanel
        cap="Waiting on you"
        title="what is stuck, and why"
        note={`${stuck.length} across three tables · oldest first`}
      >
        {/* One cause, named before its rows. The list is true and complete;
            without this line it is also a wall, and the row that is actually
            yours to answer is somewhere inside it. */}
        {cause != null ? (
          <p className="border-b border-border/60 px-3 py-1.5 text-dense-meta text-muted-foreground">
            <span className="text-foreground/80">{cause.n} of {stuck.length}</span> read{' '}
            <span className="text-foreground/80">{cause.kind}</span> — that is one cause seen{' '}
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
            title="Nothing is stuck"
            description="Every name on the list has a hypothesis about it, no candidate is past its expiry, and every belief has a settled position behind it."
          />
        ) : (
          <DenseDataTable wrapClassName="rounded-none border-0" scrollX={false}>
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead>Holding</DenseTableHead>
                <DenseTableHead>Subject</DenseTableHead>
                <DenseTableHead className="text-right">Age</DenseTableHead>
                <DenseTableHead>Why</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {stuck.map((s) => (
                <DenseTableRow key={s.key}>
                  <DenseTableCell>
                    <DenseTag variant={KIND_TAG[s.kind].variant} size="cell">
                      {KIND_TAG[s.kind].label}
                    </DenseTag>
                  </DenseTableCell>
                  <DenseTableCell>
                    <Link to={s.to} className="font-medium hover:underline">
                      {s.subject}
                    </Link>
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {s.ageDays == null ? '—' : `${s.ageDays}d`}
                  </DenseTableCell>
                  <DenseTableCell className="text-muted-foreground">{s.why}</DenseTableCell>
                </DenseTableRow>
              ))}
            </DenseTableBody>
          </DenseDataTable>
        )}
      </SectionPanel>

      <SectionPanel cap="Four views" title="where each table is drawn in full">
        <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
          {VIEWS.map((v) => (
            <Link
              key={v.label}
              to={v.to}
              className="flex flex-col gap-0.5 bg-card px-3 py-2 transition-colors hover:bg-secondary"
            >
              <span className="text-dense-label font-medium">{v.label}</span>
              <span className="text-dense-micro text-muted-foreground">{v.what}</span>
            </Link>
          ))}
        </div>
        <p className="border-t border-border/60 px-3 py-1.5 text-dense-meta text-muted-foreground">
          This page counts; it does not create. A hypothesis or a candidate is born next to the
          evidence for it — on{' '}
          <Link to="/research/symbol" className="text-primary hover:underline">
            Symbol
          </Link>
          ,{' '}
          <Link to="/research/compare" className="text-primary hover:underline">
            Compare
          </Link>{' '}
          or{' '}
          <Link to="/review" className="text-primary hover:underline">
            Review
          </Link>{' '}
          — never typed in here.
        </p>
      </SectionPanel>
    </PageShell>
  )
}
