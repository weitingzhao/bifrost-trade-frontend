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
 *
 * Second pass 2026-09-20 against `Risk Overview.dc.html` (Rev 2026-09-20.19),
 * on the Owner's reading that the first build was not close enough. Four
 * sections in the prototype's own order — the two verdict panels, Headroom,
 * and The six — with the count and the percentage promoted to the numbers
 * they are, the family stripe restored, and the trade's own path across the
 * six pages drawn at the foot.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
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
  SegmentControl,
  denseTableNumCell,
} from '@/components/data-display'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { cn } from '@/lib/utils'
import { fmtPct0 } from '@/utils/positions'
import { useLimitBook } from '@/hooks/useLimitBook'
import { fmtReading, openBreaches, type LimitKind } from '@/utils/limitsModel'
import {
  LIMIT_GROUP_STRIPE,
  RISK_BAR_CEILING,
  bindsNext,
  breachDetail,
  breachTone,
  capLabel,
  lineTone,
  spentLines,
  unranked,
  type SpentLine,
} from '@/pages/risk/overview/riskOverviewModel'

// The one reading width on this page: the container fills the pane (§5a.3),
// only prose is measured — and the measure is what lets the scope control sit
// beside the lead rather than wrap beneath it.
const LEAD =
  'What stops the next trade first. Every constraint in the book on one scale — share of the limit consumed — so the binding one is at the top instead of buried on the page that owns it.'

/** Where each line is drawn in full. The book knows; this is only the fallback. */
const OWNER_FALLBACK = { label: 'Limits & Breaches', to: '/risk/limits' }

/** The three kinds carry meaning, so the tag's variant carries it — never its position. */
const KIND_VARIANT: Record<LimitKind, 'danger' | 'neutral' | 'info'> = {
  hard: 'danger',
  soft: 'neutral',
  gate: 'info',
}

/**
 * The six, in the order a trade meets them.
 *
 * Short names on purpose: the sidebar carries each page's full label, and
 * here the point is the sequence, so the numbers and the questions do the
 * work. Every one of them is a live route.
 */
const AREAS = [
  ['01', 'Sizing', '/risk/sizing', 'How big?'],
  ['02', 'Budget', '/risk/budget', 'How much may I still add?'],
  ['03', 'Limits', '/risk/limits', 'What may not be crossed?'],
  ['04', 'Margin', '/risk/margin', 'What does the broker allow?'],
  ['05', 'Exposure', '/risk/portfolio', 'What is the book right now?'],
  ['06', 'Stress', '/risk/stress', 'What would break it?'],
] as const

const TONE_INK = { over: 'text-destructive', near: 'text-warning', plain: '' } as const
const TONE_BAR = { over: 'bg-destructive', near: 'bg-warning', plain: 'bg-foreground/55' } as const

/** The consumption bar. No number inside it — the % is its own column. */
function SpentBar({ row }: { row: SpentLine }) {
  return (
    <span className="relative block h-[5px] w-full min-w-16 rounded-sm bg-muted">
      {/* The track runs to 1.3x the line so a breach shows how far past it
          went. A bar that stops at the line makes "just over" and "a third
          over" the same picture. */}
      <span
        className={cn('absolute inset-y-0 left-0 rounded-sm', TONE_BAR[lineTone(row.use)])}
        style={{ width: `${Math.max(2, row.fill * 100)}%` }}
      />
      {/* The tick is the line itself. Everything right of it is over. */}
      <span
        aria-hidden
        className="absolute -inset-y-[3px] w-px bg-border"
        style={{ left: `${(1 / RISK_BAR_CEILING) * 100}%` }}
      />
    </span>
  )
}

export default function RiskOverviewPage() {
  const [accountFilter, setAccountFilter] = useState('all')
  const { rows, accountIds, statusLoading, error } = useLimitBook(accountFilter)

  const lines = spentLines(rows)
  const breaches = openBreaches(rows)
  const tone = breachTone(breaches)
  const next = bindsNext(lines)
  const { noLine, noReading } = unranked(rows)

  return (
    <PageShell padding="compact" className="space-y-3">
      {/* The design's own header row: the lead keeps a measure and the scope
          takes the right edge, instead of the scope wrapping under the prose. */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 max-w-[78ch] flex-[1_1_420px]">
          <PageHeader
            breadcrumb={<p className="text-xs font-medium text-primary/90">Risk</p>}
            title="Risk"
            titleSize="large"
            description={LEAD}
          />
        </div>
        {accountIds.length > 1 ? (
          <div className="ml-auto flex flex-none items-center gap-2 pt-1">
            <span className={SECTION_CAP_CLASS}>scope</span>
            {/* The design reads this from a shell-wide account scope; this side
                has none, so the page owns the control the way its six children
                already do. */}
            <SegmentControl
              size="xs"
              ariaLabel="Account"
              value={accountFilter}
              onChange={setAccountFilter}
              options={[{ value: 'all', label: 'All' }, ...accountIds.map((a) => ({ value: a, label: a }))]}
            />
          </div>
        ) : null}
      </div>

      {error ? <QueryErrorAlert error={error} /> : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Over the line — the count is the headline, because how many is the
            first thing the reader wants and each one is a sentence, not a row. */}
        <section
          className={cn(
            'overflow-hidden rounded-lg border bg-card',
            tone === 'over' && 'border-destructive/40 bg-destructive/5',
            tone === 'near' && 'border-warning/40 bg-warning/5',
            tone == null && 'border-border',
          )}
        >
          {statusLoading ? (
            <Skeleton className="m-3 h-14 rounded-md" />
          ) : breaches.length === 0 ? (
            <EmptyState
              title="Nothing is over the line"
              description={`Every constraint the book can read is inside its own limit. The ${noLine.length} rules nobody has written a number for are listed below — they cannot be crossed because they were never drawn.`}
            />
          ) : (
            <div className="flex flex-col gap-2 px-3 py-2.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className={cn(SECTION_CAP_CLASS, TONE_INK[tone ?? 'plain'])}>
                  Over the line
                </span>
                <span
                  className={cn(
                    'font-mono text-xl font-bold tabular-nums',
                    TONE_INK[tone ?? 'plain'],
                  )}
                >
                  {breaches.length}
                </span>
                <span className="text-dense-label">
                  {breaches.length === 1
                    ? 'limit is over its cap right now'
                    : 'limits are over their caps right now'}
                </span>
              </div>
              {breaches.map((r) => (
                <Link
                  key={r.key}
                  to={(r.citedFrom ?? OWNER_FALLBACK).to}
                  className="grid grid-cols-[6px_minmax(0,1fr)] items-baseline gap-2 hover:underline"
                >
                  <span
                    aria-hidden
                    className={cn(
                      '-translate-y-px size-1.5 rounded-full',
                      r.kind === 'hard' ? 'bg-destructive' : 'bg-warning',
                    )}
                  />
                  <span className="min-w-0">
                    <span className="text-dense-label font-semibold">{r.name}</span>{' '}
                    <span className="font-mono text-dense-meta tabular-nums text-muted-foreground">
                      {breachDetail(r)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Binds next — one line, and the two things you would do about it. */}
        <section className="overflow-hidden rounded-lg border border-border bg-card">
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
            <div className="flex flex-col gap-2 px-3 py-2.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className={SECTION_CAP_CLASS}>Binds next</span>
                <span className="font-mono text-xl font-bold tabular-nums text-warning">
                  {fmtPct0(next.use)}
                </span>
                <span className="text-dense-label font-semibold">{next.name}</span>
                <DenseTag variant={KIND_VARIANT[next.kind]} size="cell">
                  {next.kind}
                </DenseTag>
              </div>
              <p className="text-dense-meta text-muted-foreground">
                {fmtReading(next, next.current)} against {capLabel(next)} · on breach:{' '}
                {next.onBreach}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <Link
                  to="/risk/limits"
                  className="inline-flex h-[22px] items-center rounded-sm border border-border px-2 text-dense-meta hover:border-foreground/30 hover:text-foreground"
                >
                  Limits &amp; Breaches →
                </Link>
                <Link
                  to="/risk/sizing"
                  className="inline-flex h-[22px] items-center rounded-sm border border-border px-2 text-dense-meta hover:border-foreground/30 hover:text-foreground"
                >
                  Size the next one →
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>

      <SectionPanel
        cap="Headroom"
        title="Every constraint on one scale · most consumed first"
        note={`${lines.length} limits · hard blocks, soft asks, a gate is the daemon's own`}
        action={
          <Link to="/risk/limits" className="text-primary hover:underline">
            the book →
          </Link>
        }
      >
        {statusLoading ? (
          <Skeleton className="m-3 h-40 rounded-md" />
        ) : (
          <DenseDataTable wrapClassName="rounded-none border-0" scrollX={false}>
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead className="w-3 max-w-none pr-0" />
                <DenseTableHead>Limit</DenseTableHead>
                <DenseTableHead className="w-20 max-w-none text-right">Now</DenseTableHead>
                <DenseTableHead className="w-24 max-w-none text-right">Cap</DenseTableHead>
                <DenseTableHead className="w-[22%] max-w-none">Consumed</DenseTableHead>
                <DenseTableHead className="w-14 max-w-none text-right">%</DenseTableHead>
                <DenseTableHead className="w-16 max-w-none">Kind</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {lines.map((r) => {
                const t = lineTone(r.use)
                return (
                  <DenseTableRow
                    key={r.key}
                    // What happens on breach is the row's own footnote: it is a
                    // sentence, not a column, and the page it belongs to is one
                    // click away on the name.
                    title={`${r.name} — ${fmtReading(r, r.current)} against ${capLabel(r)} (${r.kind}, ${r.scope}). On breach: ${r.onBreach}.`}
                  >
                    <DenseTableCell className="max-w-none pr-0">
                      <span
                        aria-hidden
                        className={cn('block h-5 w-1 rounded-xs', LIMIT_GROUP_STRIPE[r.group])}
                      />
                    </DenseTableCell>
                    <DenseTableCell className="max-w-none whitespace-nowrap">
                      <Link
                        to={(r.citedFrom ?? OWNER_FALLBACK).to}
                        className="block text-dense-label hover:underline"
                      >
                        {r.name}
                      </Link>
                      <span className="block font-mono text-dense-caption text-muted-foreground">
                        {r.group} · {r.scope}
                      </span>
                    </DenseTableCell>
                    <DenseTableCell className={cn(denseTableNumCell, 'max-w-none', TONE_INK[t])}>
                      {fmtReading(r, r.current)}
                    </DenseTableCell>
                    <DenseTableCell className={cn(denseTableNumCell, 'max-w-none text-muted-foreground')}>
                      {capLabel(r)}
                    </DenseTableCell>
                    <DenseTableCell className="max-w-none">
                      <SpentBar row={r} />
                    </DenseTableCell>
                    <DenseTableCell className={cn(denseTableNumCell, 'max-w-none', TONE_INK[t])}>
                      {fmtPct0(r.use)}
                    </DenseTableCell>
                    <DenseTableCell className="max-w-none">
                      <DenseTag variant={KIND_VARIANT[r.kind]} size="cell">
                        {r.kind}
                      </DenseTag>
                    </DenseTableCell>
                  </DenseTableRow>
                )
              })}
            </DenseTableBody>
          </DenseDataTable>
        )}
        <p className="border-t border-border/60 px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
          One limit model: a <span className="font-mono">gate</span> is a limit at{' '}
          <span className="font-mono">scope = allocation</span>, defined in{' '}
          <Link to="/trade/rules" className="text-primary hover:underline">
            Trade › Rules
          </Link>{' '}
          and enforced by the daemon before the action happens. The book is computed once, in{' '}
          <Link to="/risk/limits" className="text-primary hover:underline">
            Limits
          </Link>{' '}
          — this page only sorts it. The tick on each bar is the cap; the scale runs past it so an
          over-the-line row shows how far over.
        </p>
      </SectionPanel>

      {/* The honest half of "every constraint": the ones that could not be
          ranked, and which half each is missing. A page that claims a complete
          ordering has to say what it left out of it. It sits here, under the
          table it qualifies, rather than at the foot of the page. */}
      <SectionPanel
        cap="Not on the ruler"
        title="What could not be ranked"
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

      <SectionPanel
        cap="The six"
        title="In the order a trade meets them"
        note="Risk reads the market and the account at once — which is why it hangs off neither Research nor Trade"
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,176px),1fr))]">
          {AREAS.map(([n, name, to, q]) => (
            <Link
              key={to}
              to={to}
              className="flex min-w-0 flex-col gap-0.5 border-r border-border/60 px-3 py-2.5 last:border-r-0 hover:bg-secondary/40"
            >
              <span className="flex items-baseline gap-1.5">
                <span className="font-mono text-dense-micro text-muted-foreground">{n}</span>
                <span className="text-dense-label font-semibold">{name}</span>
              </span>
              <span className="text-dense-meta text-muted-foreground">{q}</span>
            </Link>
          ))}
        </div>
      </SectionPanel>
    </PageShell>
  )
}
