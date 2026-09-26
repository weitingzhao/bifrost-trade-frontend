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
import { Link, useNavigate } from 'react-router-dom'
import { ViewState } from '@bifrost/ui'
import { HeroCard, HeroRow, PageHead, PageShell, SectionHead } from '@/components/layout'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeadRow,
  DenseTableHeader,
  DenseTableRow,
  DenseTag,
  SegmentControl,
} from '@/components/data-display'
import { cn } from '@/lib/utils'
import { fmtPct0 } from '@/utils/positions'
import { useLimitBook } from '@/hooks/useLimitBook'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { usePreviewState } from '@/hooks/usePreviewState'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
import { useRowLink } from '@/hooks/useRowLink'
import { fmtReading, openBreaches, type LimitKind, type LimitRow } from '@/utils/limitsModel'
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
/** A row inside its line reads in the soft ink, not full (Rev .82). */
const ROW_INK = { over: 'text-destructive', near: 'text-warning', plain: 'text-[var(--sk-soft)]' } as const
const TONE_BAR = { over: 'bg-destructive', near: 'bg-warning', plain: 'bg-[var(--sk-soft)]' } as const

/** The ways out of a hero: capsules, the tag material (Rev .82). */
const CHIP =
  'inline-flex h-[22px] items-center border px-2 text-dense-meta text-[var(--sk-soft)] no-underline mat-tag hover:text-foreground'

/** The consumption bar. No number inside it — the % is its own column. */
function SpentBar({ row }: { row: SpentLine }) {
  return (
    <span className="relative block h-1.5 w-full min-w-16 rounded bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)]">
      {/* The track runs to 1.3x the line so a breach shows how far past it
          went. A bar that stops at the line makes "just over" and "a third
          over" the same picture. */}
      <span
        className={cn('absolute inset-y-0 left-0 rounded', TONE_BAR[lineTone(row.use)])}
        style={{ width: `${Math.max(2, row.fill * 100)}%` }}
      />
      {/* The tick is the line itself. Everything right of it is over. */}
      <span
        aria-hidden
        className="absolute -inset-y-[3px] w-px bg-[var(--sk-mute)]"
        style={{ left: `${(1 / RISK_BAR_CEILING) * 100}%` }}
      />
    </span>
  )
}

/** An unranked rule's name, pointing at whichever page would read it. */
function UnrankedName({ row }: { row: LimitRow }) {
  const owner = row.citedFrom ?? OWNER_FALLBACK
  return (
    <Link
      to={owner.to}
      className="text-foreground/70 hover:text-foreground hover:underline"
      title={`${row.name} — ${row.scope}. Read on ${owner.label}.`}
    >
      {row.name}
    </Link>
  )
}

export default function RiskOverviewPage() {
  const [accountFilter, setAccountFilter] = useState('all')
  const rowLink = useRowLink()
  const navigate = useNavigate()
  const { rows, accountIds, modelQueries, error: modelError } = useLimitBook(accountFilter)

  // §17.1. The book's one critical source is the monitor's status read (the
  // positions every limit is held against) — the same query the book already
  // made, so this costs nothing. Its failure is reported once, in the
  // Headroom panel; the two verdict panels above yield rather than repeat it.
  const statusQ = useMonitorStatus()
  const preview = usePreviewState()
  const source = preview === 'loading' || preview === 'failed' || preview === 'stale' ? preview : sourceState(statusQ)
  const bookState = preview === 'empty' || (source === 'ready' && rows.length === 0) ? 'empty' : source
  const noData = bookState === 'loading' || bookState === 'failed' || bookState === 'empty'
  const retry = () => void statusQ.refetch()
  const retryModel = () => modelQueries.forEach((q) => void q.refetch())

  const lines = spentLines(rows)
  const breaches = openBreaches(rows)
  const tone = breachTone(breaches)
  const next = bindsNext(lines)
  const { noLine, noReading } = unranked(rows)

  // The clear state is a reading too: 0 in the quiet ink, and what it does
  // and does not promise (the design's hero, Rev .82).
  const clearDesc = `No limit is over its cap under ${accountFilter === 'all' ? 'either account' : accountFilter}. Every constraint the book can read is inside its own limit; the ${noLine.length} rules nobody has written a number for are listed below — they cannot be crossed because they were never drawn.`

  return (
    <PageShell padding="compact" className="space-y-3">
      {/* §16.10 with §17 (Owner 2026-09-25: one pass per page): the lead is
          behind ⓘ, the scope is meta, and the account switch — a filter —
          sits in the toolbar under the head. */}
      <PageHead
        title="Risk"
        info={LEAD}
        meta={accountIds.length > 1 ? (accountFilter === 'all' ? 'All accounts' : accountFilter) : undefined}
      />
      {accountIds.length > 1 ? (
        <div data-sr-toolbar="">
          <span data-sr-tb="label">Scope</span>
          <SegmentControl
            size="xs"
            ariaLabel="Account"
            value={accountFilter}
            onChange={setAccountFilter}
            options={[{ value: 'all', label: 'All' }, ...accountIds.map((a) => ({ value: a, label: a }))]}
          />
        </div>
      ) : null}

      {bookState === 'stale' ? (
        <ViewState
          kind="stale"
          title="Couldn’t refresh the limit book"
          detail={staleDetail(statusQ, 'breaches since then are not shown.')}
          onAction={retry}
        />
      ) : null}

      {bookState === 'loading' ? (
        <HeroRow basis={340}>
          <section data-sr-kpi="hero">
            <ViewState kind="loading" title="Loading breaches" rows={3} cols={2} />
          </section>
          <section data-sr-kpi="hero">
            <ViewState kind="loading" title="Loading the next binding limit" rows={3} cols={2} />
          </section>
        </HeroRow>
      ) : null}

      {/* §16.2: the two verdicts are the page's hero row. A severity tints the
          frame only, never the fill. */}
      {noData ? null : (
        <HeroRow basis={340}>
          <HeroCard
            label="Over the line"
            ariaLabel="Over the line"
            state={tone === 'over' ? 'danger' : tone === 'near' ? 'warn' : null}
            value={breaches.length}
            valueClassName={tone == null ? 'text-muted-foreground' : TONE_INK[tone]}
            aside={
              breaches.length > 0 ? (
                <span className="text-dense-label text-[var(--sk-soft)]">
                  {breaches.length === 1 ? 'limit is over its cap right now' : 'limits are over their caps right now'}
                </span>
              ) : null
            }
          >
            {breaches.length > 0 ? (
              <div className="flex flex-col gap-1.5 pt-0.5">
                {breaches.map((r) => {
                  const owner = r.citedFrom ?? OWNER_FALLBACK
                  return (
                    <Link
                      key={r.key}
                      to={owner.to}
                      title={`Open ${owner.label}`}
                      className="grid min-w-0 grid-cols-[6px_minmax(0,1fr)_auto] items-baseline gap-2 text-foreground no-underline hover:text-foreground"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          '-translate-y-px size-1.5 rounded-full',
                          r.kind === 'hard' ? 'bg-destructive' : 'bg-warning',
                        )}
                      />
                      <span className="min-w-0">
                        <span className="text-dense-body font-semibold">{r.name}</span>{' '}
                        <span className="font-mono text-dense-label tabular-nums text-[var(--sk-mute2)]">
                          {breachDetail(r)}
                        </span>
                      </span>
                      <span aria-hidden className="text-dense-label text-primary">
                        →
                      </span>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="text-dense-label leading-normal text-pretty text-[var(--sk-mute2)]">{clearDesc}</p>
            )}
          </HeroCard>

          {next == null ? (
            <section data-sr-kpi="hero" aria-label="Binds next">
              <ViewState
                kind="empty"
                title="Nothing is holding"
                detail={
                  lines.length === 0
                    ? 'No constraint carries both a reading and a line yet, so none of them can be ranked.'
                    : 'Every line with both halves is already crossed — the next thing to stop you is in the card beside this one.'
                }
              />
            </section>
          ) : (
            <HeroCard
              label="Binds next"
              ariaLabel="Binds next"
              value={fmtPct0(next.use)}
              valueClassName="text-warning"
              aside={
                <>
                  <span className="text-dense-body font-semibold">{next.name}</span>
                  <DenseTag variant={KIND_VARIANT[next.kind]} size="cell">
                    {next.kind}
                  </DenseTag>
                </>
              }
            >
              <p className="text-dense-label leading-normal text-[var(--sk-mute2)]">
                <span className="font-mono tabular-nums">{fmtReading(next, next.current)}</span> against{' '}
                <span className="font-mono tabular-nums">{capLabel(next)}</span> · on breach: {next.onBreach}
              </p>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                <Link to="/risk/limits" className={CHIP}>
                  Limits &amp; Breaches →
                </Link>
                <Link to="/risk/sizing" className={CHIP}>
                  Size the next one →
                </Link>
              </div>
            </HeroCard>
          )}
        </HeroRow>
      )}

      {/* §16.4: the section is an h2 with its explanation in the title — the
          footnote that used to close the table (one limit model, the tick is
          the cap, this page only sorts) is in the h2's and the columns'
          titles now, not a sentence of it lost. */}
      <SectionHead
        note="Every constraint on one scale · most consumed first. Hard blocks, soft asks, a gate is the daemon's own. The book is computed once, in Limits — this page only sorts it."
        meta={
          <span className="flex items-baseline gap-2.5">
            <span className="font-mono tabular-nums">
              {bookState === 'loading' || bookState === 'failed' ? '—' : lines.length} limits
            </span>
            <Link
              to="/trade/rules"
              title="Trade › Rules — where limits and gates are defined"
              className="text-dense-label text-primary no-underline hover:underline"
            >
              Rules →
            </Link>
            <Link
              to="/risk/limits"
              title="Limits & Breaches — the whole book"
              className="text-dense-label text-primary no-underline hover:underline"
            >
              The book →
            </Link>
          </span>
        }
      >
        Headroom
      </SectionHead>
      <section className="overflow-hidden border mat-card">
        {/* A model failure is narrower news than a book failure: it only
            leaves the greek lines unranked, so it is a strip over the table,
            not a block in place of it (§17.1-1). */}
        {!noData && modelError != null ? (
          <ViewState
            kind="failed"
            layout="strip"
            className="m-2"
            title="Couldn’t load the Greeks model"
            detail={failedDetail(
              { data: null, isPending: false, isError: true, error: modelError },
              'The greek lines are unranked, not inside their limits.',
            )}
            onAction={retryModel}
          />
        ) : null}
        {bookState === 'loading' ? (
          <ViewState kind="loading" title="Loading the limit book" rows={8} cols={6} />
        ) : bookState === 'failed' ? (
          <ViewState
            kind="failed"
            title="Couldn’t load the limit book"
            detail={failedDetail(
              statusQ,
              'Nothing on this page was evaluated — this is not the same as nothing being over the line.',
            )}
            onAction={retry}
          />
        ) : bookState === 'empty' ? (
          <ViewState
            kind="empty"
            title="No limits in the book"
            detail="Nothing constrains the next trade because nothing has been defined — that is different from every limit having headroom."
            actionLabel="Define limits"
            actionTitle="Trade › Rules — where limits and gates are defined"
            onAction={() => navigate('/trade/rules')}
          />
        ) : (
          <DenseDataTable standard wrapClassName="rounded-none border-0" scrollX={false}>
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead className="w-3 max-w-none pr-0" />
                <DenseTableHead col="entity">Limit</DenseTableHead>
                <DenseTableHead col="num" className="w-20">Now</DenseTableHead>
                <DenseTableHead col="num" className="w-24">Cap</DenseTableHead>
                <DenseTableHead
                  col="tag"
                  className="w-[22%]"
                  title="The tick on each bar is the cap; the scale runs past it so an over-the-line row shows how far over."
                >
                  Consumed
                </DenseTableHead>
                <DenseTableHead col="num" className="w-14">%</DenseTableHead>
                <DenseTableHead
                  col="tag"
                  className="w-16"
                  title="One limit model: a gate is a limit at scope = allocation, defined in Trade › Rules and enforced by the daemon before the action happens."
                >
                  Kind
                </DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {lines.map((r) => {
                const t = lineTone(r.use)
                return (
                  <DenseTableRow
                    key={r.key}
                    // The whole row opens the page that owns the reading — the
                    // design's own behaviour. On breach is the row's footnote:
                    // a sentence, not a column, so it rides in the tooltip.
                    title={`${r.name} — ${fmtReading(r, r.current)} against ${capLabel(r)} (${r.kind}, ${r.scope}). On breach: ${r.onBreach}. Opens ${(r.citedFrom ?? OWNER_FALLBACK).label}.`}
                    {...rowLink((r.citedFrom ?? OWNER_FALLBACK).to)}
                  >
                    <DenseTableCell className="max-w-none pr-0">
                      <span
                        aria-hidden
                        className={cn('block h-5 w-1 rounded-xs', LIMIT_GROUP_STRIPE[r.group])}
                      />
                    </DenseTableCell>
                    <DenseTableCell col="entity">
                      <span className="block text-dense-body">{r.name}</span>
                      <span className="block text-dense-meta text-muted-foreground">
                        {r.group} · {r.scope}
                      </span>
                    </DenseTableCell>
                    <DenseTableCell col="num" className={cn('text-dense-body', ROW_INK[t])}>
                      {fmtReading(r, r.current)}
                    </DenseTableCell>
                    <DenseTableCell col="num" className="text-dense-label text-[var(--sk-mute2)]">
                      {capLabel(r)}
                    </DenseTableCell>
                    <DenseTableCell col="tag">
                      <SpentBar row={r} />
                    </DenseTableCell>
                    <DenseTableCell col="num" className={cn('text-dense-label', ROW_INK[t])}>
                      {fmtPct0(r.use)}
                    </DenseTableCell>
                    <DenseTableCell col="tag">
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
      </section>

      {/* The honest half of "every constraint": the ones that could not be
          ranked, and which half each is missing. A page that claims a complete
          ordering has to say what it left out of it. It sits here, under the
          table it qualifies, rather than at the foot of the page. Not in the
          prototype; kept (§16.0), in the page's own section grammar. */}
      {noData ? null : (
        <>
          <SectionHead meta={`${noLine.length + noReading.length} of ${rows.length}`}>
            What could not be ranked
          </SectionHead>
          <section className="space-y-2 border px-3 py-2.5 text-dense-meta mat-card">
            {/* Stays on screen (§16.3): an unmeasured rule is not a safe one. */}
            <p className="max-w-[78ch] text-muted-foreground">
              A rule with no line cannot be spent and a rule with no reading cannot be measured.
              Neither is the same as being inside its limit, so neither sits in the table above.
            </p>
            {/* Each name opens the page that owns it. A rule that cannot be
                ranked here is still a rule you can go and look at, and thirteen
                of them as flat text was thirteen dead ends. */}
            {noLine.length > 0 ? (
              <p className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="text-foreground/80">No line written</span>
                <span className="text-muted-foreground">({noLine.length}) —</span>
                {noLine.map((r, i) => (
                  <span key={r.key} className="text-muted-foreground">
                    <UnrankedName row={r} />
                    {i < noLine.length - 1 ? ' ·' : ''}
                  </span>
                ))}
              </p>
            ) : null}
            {noReading.length > 0 ? (
              <p className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="text-foreground/80">Nothing to read</span>
                <span className="text-muted-foreground">({noReading.length}) —</span>
                {noReading.map((r, i) => (
                  <span key={r.key} className="text-muted-foreground">
                    <UnrankedName row={r} /> ({r.noReading ?? 'no reading'})
                    {i < noReading.length - 1 ? ' ·' : ''}
                  </span>
                ))}
              </p>
            ) : null}
          </section>
        </>
      )}

      <SectionHead note="Risk reads the market and the account at once — which is why it hangs off neither Research nor Trade">
        In the order a trade meets them
      </SectionHead>
      <nav aria-label="Risk pages" className="flex flex-wrap items-stretch gap-2">
        {AREAS.map(([n, name, to, q]) => (
          <Link
            key={to}
            to={to}
            title={`${name} — ${q}`}
            className="flex min-w-0 flex-[1_1_170px] flex-col gap-1 rounded-[var(--card-radius)] border border-transparent bg-[var(--card-fill)] px-3 py-2.5 text-foreground no-underline transition-[background-color,translate] duration-150 hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--sk-ink)_7%,transparent)] hover:text-foreground motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span className="flex items-baseline gap-2">
              <span className="font-mono text-dense-caption text-muted-foreground">{n}</span>
              <span className="text-dense-body font-semibold">{name}</span>
            </span>
            <span className="text-dense-label text-[var(--sk-mute2)]">{q}</span>
          </Link>
        ))}
      </nav>
    </PageShell>
  )
}
