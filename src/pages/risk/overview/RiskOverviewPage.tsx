/**
 * Risk — the layer's own page. `/risk`
 *
 * Design §5a.1: a layer with six parallel children cannot be one of them, so
 * Risk gets a page rather than an alias. What it answers is the question none
 * of the six can: **what stops me first.**
 *
 * Each page below owns a few constraints and shows them in its own units — a
 * share of delta, a dollar buffer, a contract count, a gate's position cap —
 * so "which of these is closest" is a comparison the reader has to carry
 * across six pages in their head. Here every line is put on one ruler, the
 * fraction of itself that is spent, and the comparison becomes a sort.
 *
 * It computes nothing. `useLimitBook` assembles the book once for Limits &
 * Breaches, Today and this page; this one filters, sorts and draws. That is
 * the whole discipline of an overview page — the place where "the same figure
 * computed twice" is easiest to commit and worst to live with.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
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
  SegmentControl,
  denseTableNumCell,
} from '@/components/data-display'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { cn } from '@/lib/utils'
import { fmtPct0 } from '@/utils/positions'
import { useLimitBook } from '@/hooks/useLimitBook'
import { fmtReading, openBreaches, type LimitKind, type LimitRow } from '@/utils/limitsModel'
import {
  RISK_BAR_CEILING,
  bindsNext,
  spentLines,
  unranked,
  type SpentLine,
} from '@/pages/risk/overview/riskOverviewModel'

// The one reading width on this page: the container fills the pane (§5a.3),
// only prose is measured.
const LEAD =
  'Every constraint in the book on one ruler — the share of itself that is spent — so the next one to stop you is the top row rather than a comparison across six pages. Nothing here is computed: each reading belongs to the page that owns it, and this page sorts.'

/** Where each line is drawn in full. The book knows; this is only the fallback. */
const OWNER_FALLBACK = { label: 'Limits & Breaches', to: '/risk/limits' }

/** The three kinds carry meaning, so the tag's variant carries it — never its position. */
const KIND_VARIANT: Record<LimitKind, 'danger' | 'neutral' | 'info'> = {
  hard: 'danger',
  soft: 'neutral',
  gate: 'info',
}

function SpentBar({ row }: { row: SpentLine }) {
  return (
    <span className="flex items-center gap-2">
      <span className="relative block h-1.5 w-28 shrink-0 overflow-hidden rounded-sm bg-muted">
        {/* The track runs to 1.3× the line so a breach shows how far past it
            went. A bar that stops at the line makes "just over" and "a third
            over" the same picture. */}
        <span
          className={cn(
            'absolute inset-y-0 left-0 rounded-sm',
            row.breached ? 'bg-destructive' : row.use > 0.8 ? 'bg-warning' : 'bg-primary/70',
          )}
          style={{ width: `${Math.max(2, row.fill * 100)}%` }}
        />
        {/* Where the line itself sits on that track. */}
        <span
          aria-hidden
          className="absolute inset-y-0 w-px bg-foreground/45"
          style={{ left: `${(1 / RISK_BAR_CEILING) * 100}%` }}
        />
      </span>
      <span className={cn('font-mono tabular-nums', row.breached && 'text-destructive')}>
        {fmtPct0(row.use)}
      </span>
    </span>
  )
}

/** One line, stated the way a reader acts on it: reading, line, consequence. */
function LineFacts({ row }: { row: LimitRow }) {
  const owner = row.citedFrom ?? OWNER_FALLBACK
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2">
      <DenseTag variant={KIND_VARIANT[row.kind]} size="cell">
        {row.kind.toUpperCase()}
      </DenseTag>
      <span className="text-dense-body font-semibold">{row.name}</span>
      <span className="font-mono text-dense-label tabular-nums">
        {fmtReading(row, row.current)} against a {row.bound} of {fmtReading(row, row.limit)}
      </span>
      <span className="text-dense-meta text-muted-foreground">{row.onBreach}</span>
      <Link to={owner.to} className="ml-auto text-dense-meta text-primary hover:underline">
        {owner.label} →
      </Link>
    </div>
  )
}

export default function RiskOverviewPage() {
  const [accountFilter, setAccountFilter] = useState('all')
  const { rows, accountIds, statusLoading, error } = useLimitBook(accountFilter)

  const lines = spentLines(rows)
  const breaches = openBreaches(rows)
  const next = bindsNext(lines)
  const { noLine, noReading } = unranked(rows)

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHeader
        breadcrumb={<p className="text-xs font-medium text-primary/90">Risk</p>}
        title="Risk"
        titleSize="large"
        // The one place a reading width belongs on this page: prose.
        description={LEAD}
        actions={
          accountIds.length > 1 ? (
            <SegmentControl
              size="xs"
              ariaLabel="Account"
              value={accountFilter}
              onChange={setAccountFilter}
              options={[{ value: 'all', label: 'All' }, ...accountIds.map((a) => ({ value: a, label: a }))]}
            />
          ) : undefined
        }
      />

      {error ? <QueryErrorAlert error={error} /> : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <SectionPanel cap="Over the line" title="what is already crossed" note={`${breaches.length} open`}>
          {statusLoading ? (
            <Skeleton className="m-3 h-14 rounded-md" />
          ) : breaches.length === 0 ? (
            <EmptyState
              title="Nothing is over a line"
              description={`Every constraint the book can read is inside its own limit. The ${noLine.length} rules nobody has written a number for are listed below — they cannot be crossed because they were never drawn.`}
            />
          ) : (
            <div className="divide-y divide-border/60">
              {breaches.map((r) => (
                <LineFacts key={r.key} row={r} />
              ))}
            </div>
          )}
        </SectionPanel>

        <SectionPanel
          cap="Binds next"
          title="what stops you first"
          note={next ? `${fmtPct0(next.use)} spent` : undefined}
        >
          {statusLoading ? (
            <Skeleton className="m-3 h-14 rounded-md" />
          ) : next == null ? (
            <EmptyState
              title="Nothing is holding"
              description={
                lines.length === 0
                  ? 'No constraint carries both a reading and a line yet, so none of them can be ranked.'
                  : 'Every line with both halves is already crossed — the next thing to stop you is in the panel beside this one.'
              }
            />
          ) : (
            <LineFacts row={next} />
          )}
        </SectionPanel>
      </div>

      <SectionPanel
        cap="The book"
        title="every constraint, by how much of it is spent"
        note={`${lines.length} ranked · scale to ${RISK_BAR_CEILING}× the line`}
      >
        {statusLoading ? (
          <Skeleton className="m-3 h-40 rounded-md" />
        ) : (
          <DenseDataTable wrapClassName="rounded-none border-0" scrollX={false}>
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead>Constraint</DenseTableHead>
                <DenseTableHead>Kind</DenseTableHead>
                <DenseTableHead>Scope</DenseTableHead>
                <DenseTableHead className="text-right">Reading</DenseTableHead>
                <DenseTableHead className="text-right">Line</DenseTableHead>
                <DenseTableHead>Spent</DenseTableHead>
                <DenseTableHead>On breach</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {lines.map((r) => (
                <DenseTableRow key={r.key}>
                  <DenseTableCell>
                    <Link
                      to={(r.citedFrom ?? OWNER_FALLBACK).to}
                      className="font-medium hover:underline"
                      title={`Read in full on ${(r.citedFrom ?? OWNER_FALLBACK).label}`}
                    >
                      {r.name}
                    </Link>
                  </DenseTableCell>
                  <DenseTableCell>
                    <DenseTag variant={KIND_VARIANT[r.kind]} size="cell">
                      {r.kind.toUpperCase()}
                    </DenseTag>
                  </DenseTableCell>
                  <DenseTableCell className="text-muted-foreground">{r.scope}</DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>{fmtReading(r, r.current)}</DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>{fmtReading(r, r.limit)}</DenseTableCell>
                  <DenseTableCell>
                    <SpentBar row={r} />
                  </DenseTableCell>
                  <DenseTableCell className="text-muted-foreground">{r.onBreach}</DenseTableCell>
                </DenseTableRow>
              ))}
            </DenseTableBody>
          </DenseDataTable>
        )}
      </SectionPanel>

      {/* The honest half of "every constraint": the ones that could not be
          ranked, and which half each is missing. A page that claims a complete
          ordering has to say what it left out of it. */}
      <SectionPanel
        cap="Not on the ruler"
        title="what could not be ranked"
        note={`${noLine.length + noReading.length} of ${rows.length}`}
      >
        <div className="space-y-2 px-3 py-2 text-dense-meta">
          <p className="max-w-[78ch] text-muted-foreground">
            A rule with no line cannot be spent and a rule with no reading cannot be measured.
            Neither is the same as being inside its limit, so neither sits in the table above.
          </p>
          {noLine.length > 0 ? (
            <p>
              <span className="text-foreground/80">No line written</span> ({noLine.length}) —{' '}
              <span className="text-muted-foreground">{noLine.map((r) => r.name).join(' · ')}</span>
            </p>
          ) : null}
          {noReading.length > 0 ? (
            <p>
              <span className="text-foreground/80">Nothing to read</span> ({noReading.length}) —{' '}
              <span className="text-muted-foreground">
                {noReading.map((r) => `${r.name} (${r.noReading ?? 'no reading'})`).join(' · ')}
              </span>
            </p>
          ) : null}
        </div>
      </SectionPanel>
    </PageShell>
  )
}
