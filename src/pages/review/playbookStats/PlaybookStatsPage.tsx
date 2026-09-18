/**
 * Review · Playbook stats — what each play has actually done.
 *
 * The most answerable page in the group, because it asks only of closed fills:
 * how many, how many won, what share of the credit was kept, how long they were
 * held, and what the gross win was against the gross loss. All of that is in the
 * ledger.
 *
 * Maximum adverse excursion — the design's eleventh column, and the one that
 * separates a play that wins often and hurts badly on the way from one that
 * never moves against you — is read from each contract's own daily bars.
 *
 * The size cap is a policy whose inputs are real here and whose store is not,
 * so the column shows what the design's own stated rule would produce and says
 * plainly that nothing reads it. The regime half has no read on this side at
 * all: the grid keeps its columns and carries a marker, because one blended
 * win rate flatters a play that only works in one regime.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { PageHeader, PageShell } from '@/components/layout'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { positionsUi } from '@/components/positions/positionsUi'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtUsd, fmtPct0 } from '@/utils/positions'
import { useReviewHabits } from '@/hooks/useReviewHabits'
import { THIN_SAMPLE } from '@/utils/reviewTrades'
import { SINCE_OPTIONS, sinceEpoch, type SinceFilter } from '@/utils/sinceWindow'
import { useWinRate } from '@/hooks/useStrategies'
import { useQuery } from '@tanstack/react-query'
import { fetchStructures } from '@/api/strategy'
import { PlaybookRegimeGrid } from './PlaybookRegimeGrid'
import { StructureFormulas, StructureTable } from './StructureTable'
import { cutDisagreement, structureRows } from './structureCut'
import { DECAY_PROFIT_FACTOR, sizeCapFor } from './sizeCap'

const PAGE_LEAD =
  'What each play has actually done — closed trades from the ledger, fills-based and fees included. Under twenty trades the band is the reading, not the point.'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

/** §14.7: the cap is a state, not a signed number, so it takes a lamp colour. */
function capClass(tone: 'success' | 'warning' | 'danger'): string {
  return tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-danger'
}

export default function PlaybookStatsPage() {
  const [accountFilter, setAccountFilter] = useState('all')
  /**
   * The design's grouping switch (DECISIONS 2026-09-18): Win Rate folds in here
   * as a cut, not as a second page. The two cuts read different services and do
   * not reconcile — see `structureCut.ts`.
   */
  const [cut, setCut] = useState('play')
  const [since, setSince] = useState<SinceFilter>('')
  const byStructure = cut === 'structure'
  /**
   * Asked only when its cut is showing.
   *
   * Not only to save a call: measured 2026-09-18 on DEV, the win-rate service
   * answers HTTP 200 with an empty body when it is called alongside the dozen
   * reads this page makes at mount, and answers in full a few seconds later. A
   * successful empty is indistinguishable from "nothing has closed", so the
   * safest thing is not to ask it while the page is busy — and to hold whatever
   * it does answer against the rulebook's own count.
   */
  const winRate = useWinRate(useMemo(() => ({ sinceTs: sinceEpoch(since) }), [since]), {
    enabled: byStructure,
  })
  const structures = useMemo(
    () => structureRows(winRate.data?.structures ?? [], winRate.data?.totals_all),
    [winRate.data],
  )
  /**
   * The rulebook's own count, as a check on the one above.
   *
   * Measured 2026-09-18 on DEV: the win-rate service answers HTTP 200 with an
   * empty body when it is called alongside the rest of this page's queries, and
   * the same call a few seconds later returns all six structures. A successful
   * empty response is indistinguishable from "nothing has closed" — so the page
   * holds it against the catalog, and when structures exist but the service
   * returned none, it says the service answered empty instead of drawing a
   * table of nothing.
   */
  const catalogQuery = useQuery({
    queryKey: ['strategy', 'structures'],
    queryFn: () => fetchStructures(),
    staleTime: 60_000,
    enabled: byStructure,
  })
  const catalogCount = catalogQuery.data?.items.length ?? 0
  // The win-rate service names a structure; the rulebook gives it an id. The
  // join is what makes a row a link rather than a label.
  const structureIds = useMemo(
    () => new Map((catalogQuery.data?.items ?? []).map((x) => [x.name, x.strategy_structure_id])),
    [catalogQuery.data?.items],
  )
  const serviceEmpty = winRate.isSuccess && structures.length === 0 && catalogCount > 0
  const { trades, plays, accountIds, pathRequests, pathsLoading, loading, error, refetch } =
    useReviewHabits(accountFilter)
  const thin = plays.filter((p) => p.thin).length

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Playbook stats">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Review / Playbook stats</p>}
          title="Playbook stats"
          titleSize="large"
          description={PAGE_LEAD}
          actions={
            <span className="flex flex-wrap items-center gap-2.5">
              {accountIds.length > 1 ? (
                <SegmentControl
                  size="xs"
                  ariaLabel="Account"
                  value={accountFilter}
                  onChange={setAccountFilter}
                  options={[{ value: 'all', label: 'All' }, ...accountIds.map((a) => ({ value: a, label: a }))]}
                />
              ) : null}
              <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                {plays.length} plays · {trades.length} closed trades
              </span>
              <Link to="/portfolio/ledger" className={positionsUi.link}>
                Trade Ledger →
              </Link>
            </span>
          }
        />

        {error ? <QueryErrorAlert error={error} onRetry={refetch} /> : null}
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-64 w-full rounded-md" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-md border border-border bg-[var(--sk-raised)] px-3 py-2">
              <span className={positionsUi.cap}>Cut</span>
              <SegmentControl
                size="xs"
                ariaLabel="Cut"
                value={cut}
                onChange={setCut}
                options={[
                  { value: 'play', label: 'Play' },
                  { value: 'structure', label: 'Structure' },
                ]}
              />
              {byStructure ? (
                <>
                  <span aria-hidden className="h-4 w-px bg-border" />
                  <span className={positionsUi.cap}>Closed since</span>
                  <SegmentControl
                    size="xs"
                    ariaLabel="Closed since"
                    value={since}
                    onChange={(v) => setSince(v as SinceFilter)}
                    options={SINCE_OPTIONS.map(({ key, label }) => ({ value: key, label }))}
                  />
                </>
              ) : null}
              <span className="ml-auto text-dense-meta text-muted-foreground">
                {byStructure
                  ? 'closed instances, via the strategy service · totals first'
                  : 'closed contracts, via the Trade Ledger'}
              </span>
            </div>

            <section className={positionsUi.panel} aria-label={byStructure ? 'By structure' : 'By play'}>
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>{byStructure ? 'By structure' : 'By play'}</span>
                <span className={positionsUi.panelTitle}>
                  {byStructure
                    ? `${structures.filter((r) => !r.totals).length} structures`
                    : `${plays.length} plays`}
                </span>
                {!byStructure && thin > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-dense-meta text-warning">
                    <StatusLamp lamp="yellow" variant="dot" title="Thin sample" />
                    {thin} under {THIN_SAMPLE} trades
                  </span>
                ) : null}
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  {byStructure
                    ? 'win rate over what resolved, not over n · no regime cut on this service'
                    : `credit kept = 1 − exit ÷ entry premium · MAE from ${pathRequests} daily-bar reads · nothing enforces the cap`}
                </span>
              </header>
              {byStructure ? (
                winRate.isPending || catalogQuery.isPending ? (
                  <Skeleton className="m-3 h-40 rounded-md" />
                ) : serviceEmpty ? (
                  <div className="px-3 py-3">
                    <p className="m-0 inline-flex items-start gap-1.5 text-dense-body leading-normal text-secondary-foreground text-pretty">
                      <span className="pt-1">
                        <StatusLamp lamp="yellow" variant="dot" title="Answered empty" />
                      </span>
                      <span>
                        The strategy service answered with no rows, and the rulebook has {catalogCount} structures —
                        so this is the service answering empty, not a book with nothing closed in it. It does this
                        when it is called alongside the rest of this page&rsquo;s reads and answers normally a moment
                        later.
                      </span>
                    </p>
                    <button
                      type="button"
                      className={cn(positionsUi.btn, 'mt-2')}
                      onClick={() => void winRate.refetch()}
                    >
                      Ask again
                    </button>
                  </div>
                ) : (
                  <>
                    <StructureTable rows={structures} idByName={structureIds} />
                    <StructureFormulas />
                    <p className={cn(FOOT, 'm-0')}>
                      {cutDisagreement(
                        plays.length,
                        trades.length,
                        structures.filter((r) => !r.totals).length,
                        structures.find((r) => r.totals)?.n ?? 0,
                      )}
                    </p>
                  </>
                )
              ) : (
                <>
              <div className="overflow-x-auto">
                {/* §14.6: the design's twelve columns; its own floor is 1120 and
                    the two extra columns need another 240 of it. */}
                <table className="w-full min-w-[1360px] table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: '17%' }} />
                    <col style={{ width: '4%' }} />
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '9%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={cn(positionsUi.th, 'text-left')}>Play</th>
                      <th className={positionsUi.th}>n</th>
                      <th className={positionsUi.th}>Win</th>
                      <th className={positionsUi.th}>95% band</th>
                      <th className={positionsUi.th}>Credit kept</th>
                      <th className={positionsUi.th}>Avg days</th>
                      <th className={positionsUi.th}>Avg P&amp;L</th>
                      <th className={positionsUi.th}>Best</th>
                      <th className={positionsUi.th}>Worst</th>
                      <th className={positionsUi.th}>MAE</th>
                      <th className={positionsUi.th}>Profit factor</th>
                      <th className={cn(positionsUi.th, 'text-left')}>Size cap it would earn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plays.map((p) => (
                      <tr key={p.play} className="hover:[&>td]:bg-[var(--sk-raised2)]">
                        <td className={cn(positionsUi.td, 'pl-2 text-left font-sans truncate text-foreground')}>
                          {p.play}
                        </td>
                        <td className={cn(positionsUi.td, p.thin ? 'text-warning' : 'text-foreground')}>{p.n}</td>
                        <td className={cn(positionsUi.td, 'text-foreground')}>{fmtPct0(p.winRate)}</td>
                        <td className={cn(positionsUi.td, 'text-muted-foreground')}>
                          {fmtPct0(p.bandLow)}–{fmtPct0(p.bandHigh)}
                        </td>
                        <td
                          className={cn(
                            positionsUi.td,
                            p.creditKept == null ? 'text-muted-foreground' : 'text-secondary-foreground',
                          )}
                        >
                          {p.creditKept == null ? 'debit' : fmtPct0(p.creditKept)}
                        </td>
                        <td className={cn(positionsUi.td, 'text-muted-foreground')}>
                          {p.avgDaysHeld == null ? '—' : p.avgDaysHeld.toFixed(0)}
                        </td>
                        <td className={cn(positionsUi.td, pnlColorClass(p.avgRealised))}>{fmtUsd(p.avgRealised)}</td>
                        <td className={cn(positionsUi.td, pnlColorClass(p.best))}>{fmtUsd(p.best)}</td>
                        <td className={cn(positionsUi.td, pnlColorClass(p.worst))}>{fmtUsd(p.worst)}</td>
                        <td className={cn(positionsUi.td, p.mae == null ? 'text-muted-foreground' : pnlColorClass(p.mae))}>
                          {p.mae == null ? (pathsLoading ? '…' : 'n/c') : fmtUsd(p.mae)}
                        </td>
                        <td
                          className={cn(
                            positionsUi.td,
                            p.profitFactor == null
                              ? 'text-muted-foreground'
                              : p.profitFactor >= 1.2
                                ? 'text-profit'
                                : 'text-warning',
                          )}
                        >
                          {p.profitFactor == null ? 'no loser yet' : p.profitFactor.toFixed(2)}
                        </td>
                        <td className={cn(positionsUi.td, 'whitespace-normal text-left font-sans')}>
                          <span className={capClass(sizeCapFor(p).tone)}>{sizeCapFor(p).label}</span>{' '}
                          <span className="text-muted-foreground">— {sizeCapFor(p).why}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
                  <p className={cn(FOOT, 'm-0')}>
                    Every play here is under {THIN_SAMPLE} trades, so every band is wide — that is the reading, not a
                    shortcoming of the table. A win rate quoted as a point on eleven trades is a guess wearing a
                    number.
                  </p>
                </>
              )}
            </section>

            <div className={positionsUi.bandGrid}>
              <PlaybookRegimeGrid plays={plays} />

              <section className={positionsUi.panel} aria-label="Where conviction comes from">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Where conviction comes from</span>
                  <span className={positionsUi.panelTitle}>stats → size cap</span>
                  <DenseTag variant="warning" size="cell">
                    ⚠ NO CAP STORE
                  </DenseTag>
                </header>
                <div className="flex flex-col gap-2 px-3 py-2.5 text-dense-body leading-normal text-secondary-foreground">
                  <p className="m-0 text-pretty">
                    The rule the last column applies is the design&rsquo;s own: full backing allowance, half under{' '}
                    {THIN_SAMPLE} trades, none under a profit factor of {DECAY_PROFIT_FACTOR}. Its inputs are real —
                    they are the columns to its left.
                  </p>
                  <p className="m-0 text-pretty">
                    A cap respects the band, not the point. The 95% band on an eleven-trade sample spans dozens of
                    points, which is why n alone withdraws half the allowance regardless of how good the win rate
                    looks.
                  </p>
                  <p className="m-0 inline-flex items-start gap-1.5 text-pretty">
                    <span className="pt-1">
                      <StatusLamp lamp="gray" variant="dot" title="No store" />
                    </span>
                    <span className="text-muted-foreground">
                      Nothing on this side reads a cap, writes one or enforces one — the same store{' '}
                      <Link to="/risk/budget" className={positionsUi.link}>
                        Risk Budget
                      </Link>{' '}
                      is missing. The column says what the rule would produce, not what is in force.
                    </span>
                  </p>
                </div>
                <p className={cn(FOOT, 'm-0')}>
                  Closed trades only, fills-based, fees included. An open position never counts toward a win rate —
                  that is how a book talks itself into holding losers.
                </p>
              </section>
            </div>

            <p className="m-0 rounded-md border border-border bg-[var(--sk-raised2)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
              <span className="font-semibold text-secondary-foreground">Boundary.</span> Closed trades only,
              fills-based, fees included. Open positions never count toward a win rate — that is how a book talks
              itself into holding losers.
            </p>
          </>
        )}
      </section>
    </PageShell>
  )
}
