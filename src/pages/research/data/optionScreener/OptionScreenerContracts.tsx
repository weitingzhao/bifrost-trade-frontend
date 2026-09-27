/**
 * The Contracts panel — the design's right half, drawn whether or not there is
 * anything in it. A table that appears only after a run hides the page's own
 * question until the reader has already answered the rail.
 *
 * Eleven columns, the design's, in its order. Grouped by underlying, best
 * annualised return first, the top four a name. A row click selects it; each
 * row ends in three actions — Compare, Discovery, Plan.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, Columns2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtPctFromFraction } from '@/lib/format'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  SegmentControl,
  denseTableNumCell,
} from '@/components/data-display'
import { PlanThisButton } from '@/components/research/PlanThisButton'
import { ruleThatFits, type RuleFitOpportunity } from '@/lib/harness/candidateRuleFit'
import { SCREEN_BAND_PARAM, SCREEN_DELTA_BAND, encodeScreenBand } from '@/lib/screenBand'
import { SYMBOL_PATH, symbolTabHref } from '@/lib/symbolTabs'
import { withSymbolParam } from '@/lib/symbolLink'
import type { ScreenerContractRow } from '@/types/research'
import {
  annReturnPct,
  cashPerContract,
  contractToken,
  deltaInBand,
  nameIvLabel,
  premiumBasis,
  premiumTitle,
  quoteFromEarlierSession,
  quoteReading,
  SPREAD_UNMEASURED,
  spreadMeasured,
  type LiveFilters,
  type ScreenGroup,
  type ScreenView,
} from './screenerModel'

const COLS = 11

/**
 * ⇄ Compare, with this contract's strike as the view's floor: the screen asks
 * which puts fit a structure, Compare asks how else the same view could be
 * expressed. Compare reads both `symbol` and `floor` (built 2026-09-23).
 */
function compareHref(symbol: string, strike: number): string {
  return `${withSymbolParam('/research/compare', symbol)}&floor=${encodeURIComponent(String(strike))}`
}

/**
 * ◫ — this row's contract on the Symbol page's Chain face, with the screen's
 * live rule as `?band=`. The contract rides along as the Chain face's own seed
 * (`?expiration=&strike=&right=`, ISO expiry): without it the face opened on
 * its nearest expiry, which for a 14–45d band reads "0 in band" — true, and
 * not the contract the reader clicked (walk 2026-09-27).
 */
function chainHref(symbol: string, r: ScreenerContractRow, filters: LiveFilters): string {
  const d = r.expiration.replace(/\D/g, '')
  const iso = d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : r.expiration
  const band = encodeScreenBand({
    dteMin: filters.dteMin,
    dteMax: filters.dteMax,
    deltaMin: SCREEN_DELTA_BAND[0],
    deltaMax: SCREEN_DELTA_BAND[1],
  })
  return `${symbolTabHref('chain', symbol)}&${SCREEN_BAND_PARAM}=${band}&expiration=${iso}&strike=${r.strike}&right=${r.right}`
}

function engineHover(r: ScreenerContractRow): string {
  return `engine score ${r.score} · rating ${r.rating} · risk ${r.risk}`
}

/**
 * The Rule cell: the first rule for this structure that names the name. When
 * none does but a rule for another structure does, the hover says so — the
 * book has an opinion about this name, just not for this trade.
 */
function ruleCell(
  symbol: string,
  structureRules: readonly RuleFitOpportunity[] | undefined,
  allRules: readonly RuleFitOpportunity[] | undefined,
  structureLabel: string,
) {
  const fit = ruleThatFits(symbol, structureRules)
  if (fit.fits || structureRules == null) return fit
  const elsewhere = ruleThatFits(symbol, allRules)
  if (!elsewhere.fits) {
    return { ...fit, title: `No ${structureLabel.toLowerCase()} rule in the Rules book names ${symbol}.` }
  }
  return {
    ...fit,
    title: `No ${structureLabel.toLowerCase()} rule names ${symbol}. Rules for other structures do:\n${elsewhere.title}`,
  }
}

const ICON_BTN =
  'inline-flex size-6 items-center justify-center rounded border border-border text-muted-foreground hover:bg-secondary/70 hover:text-foreground'

export function OptionScreenerContracts({
  groups,
  pass,
  view,
  onView,
  filters,
  opportunities,
  structureRules,
  structureLabel,
  selected,
  onSelect,
  source,
  status,
}: {
  groups: readonly ScreenGroup[]
  pass: number
  view: ScreenView
  onView: (v: ScreenView) => void
  filters: LiveFilters
  /** Every rule in the book, for the hover when none fits this structure. */
  opportunities: readonly RuleFitOpportunity[] | undefined
  /** The rules whose structure is the one screened (`rulesForStructure`). */
  structureRules: readonly RuleFitOpportunity[] | undefined
  structureLabel: string
  selected: string | null
  onSelect: (key: string | null) => void
  source: string
  /** What stands in for the table when it has nothing to draw. */
  status: { kind: 'rows' } | { kind: 'empty'; title: string; detail: string }
}) {
  // Only the day word in a stamp (`today` / `Fri`) reads the clock; mount time is enough.
  const [nowMs] = useState(() => Date.now())
  const shown = status.kind === 'rows' ? groups.flatMap((g) => g.rows) : []
  const quotes = quoteReading(shown, nowMs)
  // The premium column says what its numbers are: under Options Starter every
  // one is the session's last trade, and a header reading Mid over them was the
  // footnote's job to correct.
  const allClose = shown.length > 0 && shown.every((r) => premiumBasis(r) === 'close')
  return (
    <section
      className="min-w-0 flex-[999_1_600px] overflow-hidden border mat-card"
      aria-label="Contracts"
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-3 py-2">
        <span className="text-dense-meta font-semibold text-muted-foreground">
          Contracts
        </span>
        <span className="text-dense-body font-semibold">{pass} pass</span>
        <span className="text-dense-meta text-muted-foreground">
          grouped by underlying · best annualised return first
        </span>
        <SegmentControl
          ariaLabel="View"
          size="xs"
          value={view}
          onChange={(v) => onView(v as ScreenView)}
          options={[
            { value: 'grouped', label: 'Grouped' },
            { value: 'flat', label: 'Passing only' },
          ]}
        />
        {/* The design's `quotes HH:MM · chain source massive`. The day is
            printed too: outside the session the newest quote is often an
            earlier day's close, and a bare 16:00 read as today's. */}
        <span className="ml-auto text-dense-caption text-muted-foreground" title={quotes.title}>
          quotes {quotes.newest ?? '—'}
          {quotes.older > 0 ? (
            <span className={cn(quotes.olderSession > 0 && 'text-warning')}> · {quotes.older} older</span>
          ) : null}
          {' · '}chain source {source}
        </span>
      </header>

      {status.kind === 'empty' ? (
        <div className="px-4 py-8 text-center">
          <p className="m-0 text-dense-body font-semibold">{status.title}</p>
          <p className="mx-auto mt-1 max-w-[70ch] text-dense-meta leading-relaxed text-muted-foreground text-pretty">
            {status.detail}
          </p>
        </div>
      ) : (
        <DenseDataTable wrapClassName="rounded-none border-0 overflow-x-auto">
          <colgroup>
            <col style={{ width: 170 }} />
            <col style={{ width: 48 }} />
            <col style={{ width: 56 }} />
            <col style={{ width: 64 }} />
            <col style={{ width: 56 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 62 }} />
            <col style={{ width: 62 }} />
            <col style={{ width: 76 }} />
            <col />
            <col style={{ width: 92 }} />
          </colgroup>
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead>Contract</DenseTableHead>
              <DenseTableHead className={denseTableNumCell}>DTE</DenseTableHead>
              <DenseTableHead className={denseTableNumCell}>Δ</DenseTableHead>
              <DenseTableHead className={denseTableNumCell}>P(ITM)</DenseTableHead>
              <DenseTableHead
                className={denseTableNumCell}
                title={
                  allClose
                    ? 'Session close — the last trade as of each row’s quote time. The chain store keeps no bid/ask, so there is no mid.'
                    : 'Mid of bid and ask; a row without a quote carries its session close (hover the figure).'
                }
              >
                {allClose ? 'Close' : 'Mid'}
              </DenseTableHead>
              <DenseTableHead className={denseTableNumCell}>Ann. ret</DenseTableHead>
              <DenseTableHead className={denseTableNumCell}>Spread</DenseTableHead>
              <DenseTableHead className={denseTableNumCell}>OI</DenseTableHead>
              <DenseTableHead className={denseTableNumCell}>Cash / ct</DenseTableHead>
              <DenseTableHead>Rule</DenseTableHead>
              <DenseTableHead aria-label="Actions" />
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {groups.map((g) => {
              const fit = ruleCell(g.symbol, structureRules, opportunities, structureLabel)
              const iv = g.iv ? nameIvLabel(g.iv) : null
              return [
                <tr key={`g:${g.symbol}`} className="border-y border-border bg-secondary/50">
                  <td colSpan={COLS} className="px-[var(--table-cell-px)] py-1.5 text-dense-meta">
                    {/* A ticker opens that name. */}
                    <Link
                      to={withSymbolParam(SYMBOL_PATH, g.symbol)}
                      className="font-mono font-bold text-entity-symbol hover:underline"
                    >
                      {g.symbol}
                    </Link>{' '}
                    <span className="text-muted-foreground">
                      {g.spot != null ? `spot ${g.spot.toFixed(2)}` : 'spot —'}
                      {/* The design's `IV rank` seat, after spot: IV30's one-year percentile, which the engine scores on. */}
                      {iv ? (
                        <>
                          {' · '}
                          <span title={iv.title} className={cn(iv.warn && 'text-warning')}>
                            {iv.text}
                          </span>
                        </>
                      ) : null}
                      {g.avgIv != null ? ` · avg IV ${(g.avgIv * 100).toFixed(0)}%` : ''}
                    </span>
                    <span className="ml-2.5 font-mono text-dense-caption text-muted-foreground">
                      {g.rows.length} pass
                    </span>
                    {g.warn ? <span className="ml-2.5 text-dense-caption text-warning">{g.warn}</span> : null}
                  </td>
                </tr>,
                ...g.rows.map((r) => {
                  const key = `${g.symbol}|${r.expiration}|${r.strike}|${r.right}`
                  const on = selected === key
                  const ret = annReturnPct(r)
                  const measured = spreadMeasured(r)
                  const wide = measured && r.spread_pct != null && r.spread_pct * 100 > filters.maxSpread
                  const token = contractToken(g.symbol, r)
                  return (
                    <tr
                      key={key}
                      tabIndex={0}
                      aria-selected={on}
                      onClick={() => onSelect(on ? null : key)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onSelect(on ? null : key)
                        }
                      }}
                      className={cn(
                        'cursor-pointer border-b border-border/50 hover:bg-secondary/40',
                        on && 'bg-primary/[0.05]',
                      )}
                      title={engineHover(r)}
                    >
                      {/* §14.8 contract ink, never wrapped: the table is auto-layout, so a
                          wrapping token let the column collapse to three lines a row once
                          real rows arrived (walk 2026-09-27). */}
                      <DenseTableCell className="whitespace-nowrap pl-6 font-mono text-entity-option">{token}</DenseTableCell>
                      <DenseTableCell className={denseTableNumCell}>{r.dte}</DenseTableCell>
                      <DenseTableCell
                        // Rev .87: inside the band reads in ink, outside it recedes — a band
                        // is a rule, never the ticker's lime nor the accent.
                        className={cn(denseTableNumCell, deltaInBand(r.delta) ? 'text-foreground' : 'text-[var(--sk-mute2)]')}
                      >
                        {r.delta == null ? '—' : r.delta.toFixed(2)}
                      </DenseTableCell>
                      <DenseTableCell className={denseTableNumCell}>
                        {fmtPctFromFraction(r.prob_itm, 0)}
                      </DenseTableCell>
                      <DenseTableCell
                        className={cn(denseTableNumCell, quoteFromEarlierSession(r, quotes) && 'text-warning')}
                        title={premiumTitle(r, quotes, nowMs)}
                      >
                        {r.mid == null ? '—' : r.mid.toFixed(2)}
                      </DenseTableCell>
                      <DenseTableCell
                        className={cn(denseTableNumCell, 'font-semibold', ret != null && ret >= 20 && 'text-profit')}
                      >
                        {fmtPctFromFraction(ret == null ? null : ret / 100)}
                      </DenseTableCell>
                      <DenseTableCell
                        className={cn(denseTableNumCell, wide && 'text-loss', !measured && 'text-muted-foreground')}
                        title={measured ? undefined : SPREAD_UNMEASURED}
                      >
                        {measured ? fmtPctFromFraction(r.spread_pct) : '—'}
                      </DenseTableCell>
                      <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>
                        {r.open_interest == null ? '—' : r.open_interest.toLocaleString()}
                      </DenseTableCell>
                      <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>
                        {cashPerContract(r).toLocaleString()}
                      </DenseTableCell>
                      <DenseTableCell
                        className={cn(
                          'truncate text-dense-meta',
                          fit.fits ? 'text-secondary-foreground' : 'text-muted-foreground',
                        )}
                        title={fit.title ?? undefined}
                      >
                        {fit.label}
                      </DenseTableCell>
                      <DenseTableCell>
                        <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                          <Link
                            to={compareHref(g.symbol, r.strike)}
                            className={ICON_BTN}
                            title={`Compare the structures your rules allow on ${g.symbol}, floor at ${r.strike}`}
                            aria-label="Compare"
                          >
                            <ArrowLeftRight className="size-3.5" />
                          </Link>
                          <Link
                            to={chainHref(g.symbol, r, filters)}
                            className={ICON_BTN}
                            title={`Open ${token} on ${g.symbol}'s chain — the screen band (${filters.dteMin}–${filters.dteMax}d · Δ .15–.35) rides along and rules the ladder`}
                            aria-label="Open in Discovery"
                          >
                            <Columns2 className="size-3.5" />
                          </Link>
                          {/* ＋ writes the plan draft the Chain face's ＋ writes — one write
                              path (§15.7). It used to open a blank new-plan form: Plans reads
                              `symbol` as a list filter, so not even the name was carried. */}
                          <PlanThisButton
                            compact
                            symbol={g.symbol}
                            source="research:contract-screener"
                            sourceLabel="Option screen"
                            rule={fit.fits ? fit.label : null}
                            contract={token}
                            note={`from the Option screen · ${structureLabel.toLowerCase()}${ret != null ? ` · ann. ${ret.toFixed(1)}%` : ''}`}
                            className="size-6 border-primary/50 text-primary"
                          />
                        </div>
                      </DenseTableCell>
                    </tr>
                  )
                }),
              ]
            })}
          </DenseTableBody>
        </DenseDataTable>
      )}

      <p className="m-0 border-t border-border/60 px-3 py-1.75 text-dense-caption leading-normal text-muted-foreground text-pretty">
        Ann. ret = premium ÷ cash secured × 365 ÷ DTE. Red spread = wider than your max; a spread of — was not
        measured — the chain store keeps no bid/ask, so the premium is the session close (the column reads
        Close). An amber premium is an earlier session&rsquo;s quote than the table&rsquo;s newest. Δ in ink = inside the
        structure&rsquo;s target band; greyed = outside it. &ldquo;Rule&rdquo; is the Opportunity in Trade › Rules for this structure
        that names this underlying; Save as rule → creates one from these filters instead of typing it.
      </p>
    </section>
  )
}
