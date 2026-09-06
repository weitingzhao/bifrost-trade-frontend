/**
 * The short-leg risk map in its panel, under the cockpit, with the selection
 * it needs to be usable: click a leg and this panel names it, says how it was
 * priced, and offers the two things the reader might want next — scope the
 * page to that symbol, or jump to its row in the grid. Neither happens on the
 * click itself; the first version narrowed the page silently and left no
 * obvious way back. The way back is now on the panel too.
 */
import type { KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ShortLegRiskMap } from './charts/ShortLegRiskMap'
import { riskMapLegTitle, type RiskMapLeg } from '@/utils/shortLegRiskMap'
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
}

function pricedAs(leg: RiskMapLeg): string {
  if (leg.spotSource == null) return 'no quote'
  if (leg.spotSource === 'live') return 'live'
  return `${leg.spotSource} ${fmtSpotDate(leg.spotAsOf ?? null, leg.spotSource)}`
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
}: Props) {
  const setSelected = onSelect

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && selected) {
      e.stopPropagation()
      setSelected(null)
    }
  }
  const scopedToSelected = selected != null && activeSymbol === selected.symbol

  return (
    <section
      className="rounded-md border border-border bg-secondary/40 px-3 py-1.5"
      aria-label="Short legs against the tightness line"
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <span className="mb-1 block text-dense-label font-semibold uppercase tracking-wide text-muted-foreground">
        Short legs — days to expiry against cushion
      </span>
      <ShortLegRiskMap
        legs={legs}
        tightPct={tightPct}
        activeExpiry={activeExpiry}
        selectedKey={selected?.key ?? null}
        onSelect={setSelected}
        onExpiryClick={onExpiryClick}
        onUnpricedClick={onUnpricedClick}
      />
      {selected ? (
        <div
          className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/60 pt-1 text-dense-caption"
          data-testid="selected-leg"
        >
          <span className="font-mono tabular-nums text-foreground">{riskMapLegTitle(selected)}</span>
          <span className="text-muted-foreground">· priced {pricedAs(selected)}</span>
          <span className="ml-auto flex items-center gap-1">
            {scopedToSelected ? (
              <Button variant="outline" size="sm" className="h-6 px-2 text-dense-caption" onClick={onClearSymbol}>
                Clear scope
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-dense-caption"
                onClick={() => onScopeSymbol(selected.symbol)}
              >
                Scope to {selected.symbol}
              </Button>
            )}
            <span className="text-muted-foreground">grid below shows this leg</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-dense-caption text-muted-foreground"
              onClick={() => setSelected(null)}
              aria-label="Clear selection"
              title="Clear selection (Esc)"
            >
              ×
            </Button>
          </span>
        </div>
      ) : activeSymbol ? (
        <div className="mt-1 flex items-center gap-2 border-t border-border/60 pt-1 text-dense-caption text-muted-foreground">
          <span>
            Page scoped to <span className="font-mono text-foreground">{activeSymbol}</span>
          </span>
          <Button variant="outline" size="sm" className="h-6 px-2 text-dense-caption" onClick={onClearSymbol}>
            Clear scope
          </Button>
        </div>
      ) : null}
    </section>
  )
}
