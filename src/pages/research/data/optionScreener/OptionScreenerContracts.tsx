/**
 * The Contracts panel — the design's right half, drawn whether or not there is
 * anything in it. A table that appears only after a run hides the page's own
 * question until the reader has already answered the rail.
 *
 * Eleven columns, the design's, in its order. Grouped by underlying, best
 * annualised return first, the top four a name. A row click selects it; each
 * row ends in three actions — Compare, Discovery, Plan.
 */
import { Link } from 'react-router-dom'
import { ArrowLeftRight, Columns2, Plus } from 'lucide-react'
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

function engineHover(r: ScreenerContractRow): string {
  return `engine score ${r.score} · rating ${r.rating} · risk ${r.risk}`
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
  opportunities: readonly RuleFitOpportunity[] | undefined
  selected: string | null
  onSelect: (key: string | null) => void
  source: string
  /** What stands in for the table when it has nothing to draw. */
  status: { kind: 'rows' } | { kind: 'empty'; title: string; detail: string }
}) {
  return (
    <section
      className="min-w-0 flex-[999_1_600px] overflow-hidden rounded-lg border border-border bg-card"
      aria-label="Contracts"
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-[var(--sk-raised2)] px-3 py-2">
        <span className="text-dense-micro font-bold uppercase tracking-[0.14em] text-muted-foreground">
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
        {/* The design prints the quote time here too; the engine's response
            carries none, so only the source is drawn. */}
        <span className="ml-auto text-dense-caption text-muted-foreground">chain source {source}</span>
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
              <DenseTableHead className={denseTableNumCell}>Mid</DenseTableHead>
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
              const fit = ruleThatFits(g.symbol, opportunities)
              return [
                <tr key={`g:${g.symbol}`} className="border-y border-border bg-secondary/50">
                  <td colSpan={COLS} className="px-[var(--table-cell-px)] py-1.5 text-dense-meta">
                    {/* A ticker opens that name. */}
                    <Link
                      to={withSymbolParam(SYMBOL_PATH, g.symbol)}
                      className="font-mono font-semibold text-link hover:underline"
                    >
                      {g.symbol}
                    </Link>{' '}
                    <span className="text-muted-foreground">
                      {g.spot != null ? `spot ${g.spot.toFixed(2)}` : 'spot —'}
                      {g.avgIv != null ? ` · avg IV ${(g.avgIv * 100).toFixed(0)}%` : ''}
                    </span>
                    <span className="ml-2.5 font-mono text-dense-caption text-muted-foreground">
                      {g.rows.length} pass
                    </span>
                    {g.warn ? <span className="ml-2.5 text-dense-caption text-warning">{g.warn}</span> : null}
                  </td>
                </tr>,
                ...g.rows.map((r) => {
                  const key = `${g.symbol}|${r.expiry}|${r.strike}|${r.right}`
                  const on = selected === key
                  const ret = annReturnPct(r)
                  const wide = r.spread_pct != null && r.spread_pct * 100 > filters.maxSpread
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
                      <DenseTableCell className="pl-6 font-mono">{token}</DenseTableCell>
                      <DenseTableCell className={denseTableNumCell}>{r.dte}</DenseTableCell>
                      <DenseTableCell
                        className={cn(denseTableNumCell, deltaInBand(r.delta) && 'text-[var(--sk-accent)]')}
                      >
                        {r.delta == null ? '—' : r.delta.toFixed(2)}
                      </DenseTableCell>
                      <DenseTableCell className={denseTableNumCell}>
                        {fmtPctFromFraction(r.prob_itm, 0)}
                      </DenseTableCell>
                      <DenseTableCell className={denseTableNumCell}>
                        {r.mid == null ? '—' : r.mid.toFixed(2)}
                      </DenseTableCell>
                      <DenseTableCell
                        className={cn(denseTableNumCell, 'font-semibold', ret != null && ret >= 20 && 'text-profit')}
                      >
                        {fmtPctFromFraction(ret == null ? null : ret / 100)}
                      </DenseTableCell>
                      <DenseTableCell className={cn(denseTableNumCell, wide && 'text-loss')}>
                        {fmtPctFromFraction(r.spread_pct)}
                      </DenseTableCell>
                      <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>
                        {r.oi == null ? '—' : r.oi.toLocaleString()}
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
                            to={`${symbolTabHref('chain', g.symbol)}&${SCREEN_BAND_PARAM}=${encodeScreenBand({
                              dteMin: filters.dteMin,
                              dteMax: filters.dteMax,
                              deltaMin: SCREEN_DELTA_BAND[0],
                              deltaMax: SCREEN_DELTA_BAND[1],
                            })}`}
                            className={ICON_BTN}
                            title={`Open ${g.symbol}'s chain on the Symbol page — the screen band (${filters.dteMin}–${filters.dteMax}d · Δ .15–.35) rides along and rules the ladder`}
                            aria-label="Open in Discovery"
                          >
                            <Columns2 className="size-3.5" />
                          </Link>
                          <Link
                            to={`/trade/plans?new=1&symbol=${encodeURIComponent(g.symbol)}`}
                            className={cn(ICON_BTN, 'border-primary/50 text-primary')}
                            title={`Plan this — opens a new plan beside ${g.symbol}'s plans. The contract and the rule are not carried: Plans takes no contract.`}
                            aria-label="Plan this"
                          >
                            <Plus className="size-3.5" />
                          </Link>
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
        Ann. ret = premium ÷ cash secured × 365 ÷ DTE. Red spread = wider than your max. Δ lime = inside the
        structure&rsquo;s target band. &ldquo;Rule&rdquo; is the Opportunity in Trade › Rules that names this
        underlying; Save as rule → creates one from these filters instead of typing it.
      </p>
    </section>
  )
}
