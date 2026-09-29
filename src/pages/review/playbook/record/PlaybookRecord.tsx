/**
 * Review › Playbook › Record — what each play has actually done (design Rev
 * .110 merged the Playbook stats page in as this tab; `/review/playbook-stats`
 * opens it).
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
 * so the column shows what the design's own stated rule would produce. It has
 * a reader — Compare applies the same rule (`utils/sizeCap`) as its conviction
 * cap — but nothing stores or enforces it. The regime half has no market-regime
 * history behind it (measured 2026-09-26, see `PlaybookRegimeGrid`): the grid
 * keeps its columns and says why, because one blended win rate flatters a play
 * that only works in one regime.
 */
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ViewState } from '@bifrost/ui'
import { cn } from '@/lib/utils'
import { SegmentControl } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtUsd, fmtPct0 } from '@/utils/positions'
import { useExecutionsCanonical } from '@/hooks/useExecutions'
import { usePreviewState } from '@/hooks/usePreviewState'
import { useReviewHabits } from '@/hooks/useReviewHabits'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
import { THIN_SAMPLE, type PlayStat } from '@/utils/reviewTrades'
import { SINCE_OPTIONS, sinceEpoch, type SinceFilter } from '@/utils/sinceWindow'
import { useWinRate } from '@/hooks/useStrategies'
import { useQuery } from '@tanstack/react-query'
import { fetchStructures } from '@/api/strategy'
import { PlaybookRegimeGrid } from './PlaybookRegimeGrid'
import { StructureFormulas, StructureTable } from './StructureTable'
import { cutDisagreement, structureRows } from './structureCut'
import { DECAY_PROFIT_FACTOR, sizeCapFor, type SizeCap } from '@/utils/sizeCap'
import { winRateInk } from './playbookInk'

// Rev .62: a foot is a rule, not a band.
const FOOT = 'border-t border-border px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'
const ROW_HOVER = 'hover:[&>td]:bg-[color-mix(in_srgb,var(--sk-ink)_4%,transparent)]'

/**
 * The allowance is a state, not a signed number (§14.7, Rev .90): full is
 * ink, half the muted grey, none amber — it never borrows the profit green.
 */
function capClass(label: SizeCap['label']): string {
  return label === 'full' ? 'text-foreground' : label === 'half' ? 'text-muted-foreground' : 'text-warning'
}

/** A ratio, not a signed figure (Rev .90): ink at 1.3 and over, amber under. */
function profitFactorInk(pf: number | null): string {
  if (pf == null) return 'text-muted-foreground'
  return pf >= 1.3 ? 'text-foreground' : 'text-warning'
}

/** The win rate's 95% band as the design draws it: a track, the band, a tick at 50%. */
function BandBar({ p }: { p: PlayStat }) {
  const lo = Math.max(0, Math.min(1, p.bandLow))
  const hi = Math.max(lo, Math.min(1, p.bandHigh))
  return (
    <span className="inline-flex items-center justify-end gap-1.5">
      <span className="relative inline-block h-1.5 w-[4.75rem] overflow-hidden rounded-[2px] bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)]">
        <span
          className={cn('absolute inset-y-0', p.thin ? 'bg-warning' : 'bg-[var(--sk-line2)]')}
          style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%` }}
        />
        <span aria-hidden className="absolute -inset-y-0.5 left-1/2 w-px bg-[var(--sk-faint)]" />
      </span>
      <span className="text-dense-caption text-muted-foreground">
        {fmtPct0(p.bandLow)}–{fmtPct0(p.bandHigh)}
      </span>
    </span>
  )
}

export function PlaybookRecord() {
  const [accountFilter, setAccountFilter] = useState('all')
  /**
   * The design's grouping switch (DECISIONS 2026-09-18): Win Rate folds in here
   * as a cut, not as a second page. The two cuts read different services and do
   * not reconcile — see `structureCut.ts`.
   */
  // `?cut=structure` is how Win Rate's old address lands here (redirectRoutes).
  const [params, setParams] = useSearchParams()
  const cut = params.get('cut') === 'structure' ? 'structure' : 'play'
  const setCut = (next: string) =>
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev)
        if (next === 'structure') out.set('cut', 'structure')
        else out.delete('cut')
        return out
      },
      { replace: true },
    )
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
  const { trades, plays, accountIds, pathRequests, pathsLoading } = useReviewHabits(accountFilter)
  // The same cache entry useReviewHabits reads — held here for its §17 state.
  const execQuery = useExecutionsCanonical()
  const thin = plays.filter((p) => p.thin).length

  // The prose names plays from the table itself, the way the design's panel
  // does: the biggest play the rule would give a full allowance, and any the
  // rule has withdrawn from on profit factor.
  const fullest = useMemo(
    () => [...plays].filter((p) => sizeCapFor(p).label === 'full').sort((a, b) => b.n - a.n)[0] ?? null,
    [plays],
  )
  const decayed = useMemo(() => plays.filter((p) => sizeCapFor(p).label === 'none'), [plays])

  const preview = usePreviewState()
  const pageState =
    preview === 'loading' || preview === 'failed' || preview === 'stale' ? preview : sourceState(execQuery)
  const shownPlays = preview === 'empty' ? [] : plays

  return (
    <div className="space-y-3">
      <div data-sr-toolbar="">
        <span data-sr-tb="label">Cut</span>
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
            <span data-sr-tb="sep" />
            <span data-sr-tb="label">Closed since</span>
            <SegmentControl
              size="xs"
              ariaLabel="Closed since"
              value={since}
              onChange={(v) => setSince(v as SinceFilter)}
              options={SINCE_OPTIONS.map(({ key, label }) => ({ value: key, label }))}
            />
          </>
        ) : accountIds.length > 1 ? (
          <>
            <span data-sr-tb="sep" />
            <span data-sr-tb="label">Account</span>
            <SegmentControl
              size="xs"
              ariaLabel="Account"
              value={accountFilter}
              onChange={setAccountFilter}
              options={[{ value: 'all', label: 'All' }, ...accountIds.map((a) => ({ value: a, label: a }))]}
            />
          </>
        ) : null}
        <span data-sr-tb="meta">
          {byStructure
            ? 'closed trades, via the strategy service · totals first'
            : pageState === 'ready'
              ? `${plays.length} plays · ${trades.length} closed trades · via the `
              : 'closed contracts, via the '}
          {byStructure ? null : (
            <Link to="/portfolio/ledger" className={positionsUi.link} title="The fills every figure here is read from">
              Ledger →
            </Link>
          )}
        </span>
      </div>

      {pageState === 'stale' && !byStructure ? (
        <ViewState
          kind="stale"
          title="Couldn’t refresh the ledger"
          detail={staleDetail(execQuery, 'a trade closed since then is not counted.')}
          onAction={() => void execQuery.refetch()}
        />
      ) : null}

      <section className={positionsUi.panel} aria-label={byStructure ? 'By structure' : 'By play'}>
        <header className={positionsUi.panelHead}>
          <span className={positionsUi.cap}>{byStructure ? 'By structure' : 'By play'}</span>
          <span className={positionsUi.panelTitle}>
            {byStructure ? `${structures.filter((r) => !r.totals).length} structures` : `${plays.length} plays`}
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
              : `credit kept = 1 − exit ÷ entry premium · MAE from ${pathRequests} daily-bar reads · feeds the conviction cap on Compare`}
          </span>
        </header>
        {byStructure ? (
          winRate.isPending || catalogQuery.isPending ? (
            <ViewState kind="loading" title="Loading the structures" rows={6} cols={12} />
          ) : winRate.isError && winRate.data == null ? (
            <ViewState
              kind="failed"
              title="Couldn’t load the structure cut"
              detail={failedDetail(winRate, 'Nothing was read from the strategy service — this is not a book with nothing closed.')}
              onAction={() => void winRate.refetch()}
            />
          ) : serviceEmpty ? (
            <ViewState
              kind="failed"
              title="The strategy service answered empty"
              detail={`The rulebook has ${catalogCount} structures, so this is the service answering empty, not a book with nothing closed in it. It does this when it is called alongside the rest of this page’s reads and answers normally a moment later.`}
              actionLabel="Ask again"
              onAction={() => void winRate.refetch()}
            />
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
        ) : pageState === 'loading' ? (
          <ViewState kind="loading" title="Loading the plays" rows={6} cols={12} />
        ) : pageState === 'failed' ? (
          <ViewState
            kind="failed"
            title="Couldn’t load the ledger"
            detail={failedDetail(execQuery, 'Nothing was evaluated — this is not a playbook with no record.')}
            onAction={() => void execQuery.refetch()}
          />
        ) : shownPlays.length === 0 ? (
          <ViewState
            kind="empty"
            title="No closed trade yet"
            detail="A play reaches this table when a contract its fills name is taken flat. Open positions never count toward a win rate."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              {/* §14.6: the design's twelve columns; its own floor is 1120 and
                  the two extra columns need another 240 of it. */}
              <table className="w-full min-w-[1400px] table-fixed border-collapse">
                <colgroup>
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '4%' }} />
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '12%' }} />
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
                  {shownPlays.map((p) => {
                    const cap = sizeCapFor(p)
                    return (
                      <tr key={p.play} className={ROW_HOVER}>
                        <td className={cn(positionsUi.td, 'pl-2 truncate text-left font-sans text-foreground')} title={p.play}>
                          {p.play}
                        </td>
                        <td className={cn(positionsUi.td, p.thin ? 'text-warning' : 'text-[var(--sk-soft)]')}>{p.n}</td>
                        <td className={cn(positionsUi.td, 'font-semibold', winRateInk(p.winRate))}>{fmtPct0(p.winRate)}</td>
                        <td className={positionsUi.td}>
                          <BandBar p={p} />
                        </td>
                        <td
                          className={cn(
                            positionsUi.td,
                            p.creditKept == null ? 'text-muted-foreground' : 'text-[var(--sk-soft)]',
                          )}
                        >
                          {p.creditKept == null ? 'debit' : fmtPct0(p.creditKept)}
                        </td>
                        <td className={cn(positionsUi.td, 'text-muted-foreground')}>
                          {p.avgDaysHeld == null ? '—' : `${p.avgDaysHeld.toFixed(0)}d`}
                        </td>
                        <td className={cn(positionsUi.td, pnlColorClass(p.avgRealised))}>{fmtUsd(p.avgRealised)}</td>
                        <td className={cn(positionsUi.td, pnlColorClass(p.best))}>{fmtUsd(p.best)}</td>
                        <td className={cn(positionsUi.td, pnlColorClass(p.worst))}>{fmtUsd(p.worst)}</td>
                        {/* The design draws MAE muted: every one is at or under zero,
                            so a red column would say nothing a number does not. */}
                        <td className={cn(positionsUi.td, 'text-muted-foreground')}>
                          {p.mae == null ? (pathsLoading ? '…' : 'n/c') : fmtUsd(p.mae)}
                        </td>
                        <td className={cn(positionsUi.td, 'font-semibold', profitFactorInk(p.profitFactor))}>
                          {p.profitFactor == null ? 'no loser yet' : p.profitFactor.toFixed(2)}
                        </td>
                        <td className={cn(positionsUi.td, 'whitespace-normal text-left font-sans')}>
                          <span className={capClass(cap.label)}>{cap.label}</span>{' '}
                          <span className="text-muted-foreground">— {cap.why}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className={cn(FOOT, 'm-0')}>
              {thin === plays.length
                ? `Every play here is under ${THIN_SAMPLE} trades, so every band is wide — that is the reading, not a shortcoming of the table. A win rate quoted as a point on eleven trades is a guess wearing a number.`
                : `${thin} of ${plays.length} plays are under ${THIN_SAMPLE} trades; their bands are wide and drawn amber — the band is the reading there, not the point.`}
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
            <Link to="/research/compare" className={cn(positionsUi.link, 'ml-auto')}>
              Compare →
            </Link>
          </header>
          <div className="flex flex-col gap-2 px-3 py-2.5 text-dense-body leading-normal text-secondary-foreground">
            <p className="m-0 text-pretty">
              The rule the last column applies is the design&rsquo;s own: full backing allowance, half under{' '}
              {THIN_SAMPLE} trades, none under a profit factor of {DECAY_PROFIT_FACTOR}. Its inputs are real — they are
              the columns to its left — and{' '}
              <Link to="/research/compare" className={positionsUi.link}>
                Compare
              </Link>{' '}
              reads the same rule as its conviction cap, on each structure&rsquo;s record.
            </p>
            {fullest ? (
              <p className="m-0 text-pretty">
                <span className="font-semibold text-foreground">{fullest.play}</span> is {fullest.n} trades at{' '}
                {fmtPct0(fullest.winRate)}
                {fullest.profitFactor == null ? ' with no loser yet' : ` with profit factor ${fullest.profitFactor.toFixed(2)}`},
                which earns the full backing allowance.
              </p>
            ) : (
              <p className="m-0 text-pretty">
                No play earns the full allowance yet: a cap respects the band, not the point, and the 95% band on a
                sample under {THIN_SAMPLE} spans dozens of points — so n alone withdraws half the allowance however
                good the win rate looks.
              </p>
            )}
            {decayed.length > 0 ? (
              <p className="m-0 text-pretty">
                {decayed.slice(0, 3).map((p, i) => (
                  <span key={p.play}>
                    {i > 0 ? (i === decayed.slice(0, 3).length - 1 ? ' and ' : ', ') : null}
                    <span className="font-semibold text-foreground">{p.play}</span>
                    {p.profitFactor == null ? '' : ` (${p.profitFactor.toFixed(2)})`}
                  </span>
                ))}{' '}
                {decayed.length === 1 ? 'is' : 'are'} under a profit factor of {DECAY_PROFIT_FACTOR}, where the rule
                withdraws the allowance and raises a decay alert.
                {decayed.length > 3 ? ` ${decayed.length - 3} more below the line in the table.` : ''}
              </p>
            ) : null}
            <p className="m-0 inline-flex items-start gap-1.5 text-pretty">
              <span className="pt-1">
                <StatusLamp lamp="gray" variant="dot" title="No store" />
              </span>
              <span className="text-muted-foreground">
                Nothing stores a cap or enforces one — the same store{' '}
                <Link to="/risk/sizing#budget" className={positionsUi.link}>
                  Sizing’s budget
                </Link>{' '}
                is missing. The column says what the rule would produce, not what is in force.
              </span>
            </p>
          </div>
          <p className={cn(FOOT, 'm-0')}>
            Closed trades only, fills-based, fees included. An open position never counts toward a win rate — that is
            how a book talks itself into holding losers.
          </p>
        </section>
      </div>
    </div>
  )
}
