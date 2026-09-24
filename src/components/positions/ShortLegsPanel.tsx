/**
 * The short-leg risk map in its panel, with the selection it needs to be
 * usable: click a leg and the panel names it in its own numbers — contracts,
 * credit, what assignment would move, cushion, days left, how it was priced —
 * and offers what the reader might want next: scope the page to that symbol,
 * or open the leg on the right. Neither happens on the click itself; the first
 * version narrowed the page silently and left no obvious way back.
 */
import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { useContainerHeight } from '@/hooks/useContainerWidth'
import { cn } from '@/lib/utils'
import { fmtIsoDateToken } from '@/lib/format'
import { ShortLegRiskMap } from './charts/ShortLegRiskMap'
import { positionsUi } from './positionsUi'
import {
  fmtCushionPct,
  fmtNotional,
  legNotional,
  legPremium,
  type RiskMapLeg,
} from '@/utils/shortLegRiskMap'
import { fmtSpotDate } from '@/utils/spotPrice'

interface Props {
  legs: RiskMapLeg[]
  tightPct: number
  activeExpiry: string | null
  /** The page's symbol scope, so the panel can say it is on and offer to clear it. */
  activeSymbol: string
  onExpiryClick: (expiry: string) => void
  onUnpricedClick: () => void
  onScopeSymbol: (symbol: string) => void
  onClearSymbol: () => void
  /** Selection lives with the page: the grid below narrows to the selected leg. */
  selected: RiskMapLeg | null
  onSelect: (leg: RiskMapLeg | null) => void
  /** Open the selected leg's contract, and its strategy's risk profile, on the right. */
  onOpenContract?: (leg: RiskMapLeg) => void
  onOpenRisk?: (leg: RiskMapLeg) => void
}

function pricedAs(leg: RiskMapLeg): string {
  if (leg.spotSource == null) return 'no quote — not counted as safe'
  if (leg.spotSource === 'live') return 'live'
  return `priced ${leg.spotSource} ${fmtSpotDate(leg.spotAsOf ?? null, leg.spotSource)}`
}

function isPriced(leg: RiskMapLeg): boolean {
  return typeof leg.cushionPct === 'number' && Number.isFinite(leg.cushionPct)
}

/** "14 legs · $899–$8.4k credit · 14 at close 09-16" — what the header says about the plot. */
function legNote(legs: RiskMapLeg[]): string {
  const credits = legs.map(legPremium).filter((n): n is number => n != null && n > 0)
  const parts = [`${legs.length} leg${legs.length === 1 ? '' : 's'}`]
  if (credits.length > 0) parts.push(`${fmtNotional(Math.min(...credits))}–${fmtNotional(Math.max(...credits))} credit`)
  const closes = legs.filter((l) => l.spotSource === 'close')
  if (closes.length > 0) {
    const oldest = closes.reduce<number | null>((o, l) => (l.spotAsOf != null && (o == null || l.spotAsOf < o) ? l.spotAsOf : o), null)
    parts.push(`${closes.length} at close ${fmtSpotDate(oldest, 'close')}`)
  }
  const marks = legs.filter((l) => l.spotSource === 'mark').length
  if (marks > 0) parts.push(`${marks} at mark`)
  return parts.join(' · ')
}

function LegFact({ k, v, ink = 'text-secondary-foreground' }: { k: string; v: string; ink?: string }) {
  return (
    <span className={cn(positionsUi.mono, 'text-dense-meta leading-normal text-muted-foreground')}>
      {k ? `${k} ` : ''}
      <span className={cn('font-semibold', ink)}>{v}</span>
    </span>
  )
}

/** The prototype's plot height, and the floor under a stretched one. */
const PLOT_MIN = 250

/**
 * The map at the height its row gives it (§16.5): beside an open Room to add it
 * grows with it, and it never drops under PLOT_MIN. Its own component so the
 * measurement starts when the map first appears, not when the panel did.
 */
function StretchedPlot({ children }: { children: (height: number) => ReactNode }) {
  const host = useRef<HTMLDivElement>(null)
  const height = useContainerHeight(host, PLOT_MIN)
  return (
    <div ref={host} className="relative min-h-62.5 flex-1">
      <div className="absolute inset-0">{children(Math.max(PLOT_MIN, height))}</div>
    </div>
  )
}

export function ShortLegsPanel({
  legs,
  tightPct,
  activeExpiry,
  activeSymbol,
  onExpiryClick,
  onUnpricedClick,
  onScopeSymbol,
  onClearSymbol,
  selected,
  onSelect,
  onOpenContract,
  onOpenRisk,
}: Props) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && selected) {
      e.stopPropagation()
      onSelect(null)
    }
  }
  const scopedToSelected = selected != null && activeSymbol === selected.symbol
  const unpriced = legs.filter((l) => !isPriced(l)).length
  const map = (height: number) => (
    <ShortLegRiskMap
      legs={legs}
      tightPct={tightPct}
      activeExpiry={activeExpiry}
      selectedKey={selected?.key ?? null}
      onSelect={onSelect}
      onExpiryClick={onExpiryClick}
      onUnpricedClick={onUnpricedClick}
      height={height}
      caption={false}
    />
  )

  return (
    <section
      className={cn(positionsUi.panel, 'flex flex-col')}
      aria-label="Short legs against the tightness line"
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>Short legs</span>
        <span className={positionsUi.panelTitle}>days to expiry against cushion</span>
        <span className={positionsUi.panelNote}>{legNote(legs)}</span>
        {unpriced > 0 ? (
          <button
            type="button"
            className={cn(positionsUi.btn, 'h-5 text-dense-caption')}
            onClick={onUnpricedClick}
            title="Short legs with no underlying price — grey, not counted as safe. Opens the calendar view."
          >
            {unpriced} unpriced
          </button>
        ) : null}
        {selected ? (
          <button type="button" className={cn(positionsUi.btn, 'ml-auto')} onClick={() => onSelect(null)} title="Clear selection (Esc)">
            ✕ {selected.symbol} {selected.strike}
            {selected.right}
          </button>
        ) : null}
      </header>
      <div className="flex flex-1 flex-col px-3 pt-2.5 pb-3">
        {legs.length > 0 ? <StretchedPlot>{map}</StretchedPlot> : map(PLOT_MIN)}
        {selected ? (
          <div
            className="mt-2 flex flex-col gap-1.25 rounded-[5px] border border-[var(--sk-line2)] bg-[var(--sk-raised2)] px-2.5 py-1.75 leading-normal"
            data-testid="selected-leg"
          >
            <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.75">
              <span className={cn(positionsUi.mono, 'text-xs font-bold text-[var(--color-entity-option)]')}>
                {selected.symbol} {fmtIsoDateToken(selected.expiry)} {selected.strike}
                {selected.right}
              </span>
              <LegFact k="" v={`${selected.contracts} contract${selected.contracts === 1 ? '' : 's'}`} />
              <LegFact k="credit" v={fmtNotional(legPremium(selected))} />
              <LegFact k={selected.right === 'P' ? 'if assigned' : 'if called away'} v={fmtNotional(legNotional(selected))} />
              {isPriced(selected) ? (
                <LegFact
                  k="cushion"
                  v={fmtCushionPct(selected.cushionPct as number)}
                  ink={(selected.cushionPct as number) < 0 ? 'text-loss' : 'text-profit'}
                />
              ) : null}
              <LegFact
                k="expires in"
                v={selected.dte == null ? 'no expiry' : `${selected.dte}d`}
                ink={selected.dte != null && selected.dte <= 7 ? 'text-warning' : 'text-secondary-foreground'}
              />
              <LegFact k="quote" v={pricedAs(selected)} ink="text-muted-foreground" />
            </span>
            <span className="flex flex-wrap items-center gap-1.5">
              {scopedToSelected ? (
                <button type="button" className={positionsUi.btn} onClick={onClearSymbol}>
                  Clear scope
                </button>
              ) : (
                <button
                  type="button"
                  className={cn(positionsUi.btn, 'border-primary text-primary')}
                  onClick={() => onScopeSymbol(selected.symbol)}
                >
                  Scope to {selected.symbol}
                </button>
              )}
              {onOpenContract ? (
                <button type="button" className={positionsUi.btn} onClick={() => onOpenContract(selected)}>
                  Contract face →
                </button>
              ) : null}
              {onOpenRisk ? (
                <button type="button" className={positionsUi.btn} onClick={() => onOpenRisk(selected)}>
                  Risk profile →
                </button>
              ) : null}
              <span className="text-dense-meta text-muted-foreground">grid below shows this leg</span>
              <button
                type="button"
                className={cn(positionsUi.btn, 'ml-auto h-5 px-1.5')}
                onClick={() => onSelect(null)}
                aria-label="Clear selection"
                title="Clear selection (Esc)"
              >
                ✕
              </button>
            </span>
          </div>
        ) : (
          <p className="m-0 pt-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty">
            {activeSymbol ? (
              <>
                Page scoped to <span className="font-mono text-foreground">{activeSymbol}</span>.{' '}
                <button type="button" className={positionsUi.link} onClick={onClearSymbol}>
                  Clear scope
                </button>{' '}
              </>
            ) : null}
            <span title="Selecting a leg filters the grid below and shows the leg’s own numbers here, with a button that opens its contract.">
              Click a leg to select it.
            </span>{' '}
            Grey = unpriced, <em>not</em> counted as safe.
          </p>
        )}
      </div>
    </section>
  )
}
