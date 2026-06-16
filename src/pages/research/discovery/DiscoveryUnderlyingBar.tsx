import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DiscoverySection } from '@/components/optionDiscovery/DiscoverySection'
import { DiscoveryHint } from '@/components/optionDiscovery/DiscoveryHint'
import { fmtUsd } from '@/lib/format'
import { cn } from '@/lib/utils'

type Props = {
  underlyingInput: string
  setUnderlyingInput: (v: string) => void
  applyUnderlyingFromInput: () => void
  stkSymbols: string[]
  symbolDailyPrices: Record<string, number | null | undefined>
  selectedSymbol: string
  setSelectedSymbol: (sym: string) => void
}

export function DiscoveryUnderlyingBar(props: Props) {
  return (
    <div
      className="grid min-w-0 grid-cols-1 items-stretch gap-3 border-b border-border p-2 px-3"
      aria-label="Underlying selection"
    >
      <DiscoverySection first className="flex min-h-0 min-w-0 flex-col" aria-label="Underlying">
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col items-stretch">
          <div className="flex w-full min-w-0 flex-wrap items-center gap-x-2.5 gap-y-2">
            <label
              className="shrink-0 text-dense-meta font-bold uppercase tracking-wider text-muted-foreground"
              htmlFor="od-underlying-manual-input"
            >
              Symbol
            </label>
            <Input
              id="od-underlying-manual-input"
              className="min-w-0 max-w-48 flex-[1_1_140px] font-mono font-semibold tabular-nums"
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. NVDA"
              value={props.underlyingInput}
              onChange={e => props.setUnderlyingInput(e.target.value.toUpperCase())}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  props.applyUnderlyingFromInput()
                }
              }}
              aria-label="Underlying symbol"
            />
            <Button type="button" size="sm" className="shrink-0" onClick={() => props.applyUnderlyingFromInput()}>
              Apply
            </Button>
          </div>
          {props.stkSymbols.length > 0 ? (
            <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-2">
              <span
                className="shrink-0 text-dense-meta font-bold uppercase tracking-wider text-muted-foreground"
                id="od-underlying-bubbles-label"
              >
                Wishlist
              </span>
              <div
                className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5"
                role="group"
                aria-labelledby="od-underlying-bubbles-label"
              >
                {props.stkSymbols.map(sym => {
                  const symU = sym.toUpperCase()
                  const px = props.symbolDailyPrices[symU] ?? props.symbolDailyPrices[sym]
                  const priceLabel = px != null ? fmtUsd(px) : '—'
                  const active = props.selectedSymbol.trim().toUpperCase() === symU
                  return (
                    <button
                      key={sym}
                      type="button"
                      className={cn(
                        'inline-flex cursor-pointer items-center justify-center gap-1 rounded-full border px-2.5 py-0.5',
                        'border-border/80 bg-secondary text-foreground transition-colors',
                        'hover:border-primary/35 hover:bg-accent/10',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                        active && 'border-primary/55 bg-accent/15 shadow-inner',
                      )}
                      onClick={() => props.setSelectedSymbol(symU)}
                      aria-pressed={active}
                      aria-label={`${symU}, daily price ${priceLabel}`}
                      title={`${symU} · ${priceLabel} (daily)`}
                    >
                      <span className="inline-flex max-w-full min-w-0 flex-nowrap items-baseline whitespace-nowrap">
                        <span className="text-dense-label font-bold tabular-nums tracking-wide">{symU}</span>
                        <span className="text-muted-foreground text-dense-meta font-medium" aria-hidden>
                          {' '}
                          ·{' '}
                        </span>
                        <span className="text-dense-caption font-semibold tabular-nums text-muted-foreground">
                          {priceLabel}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <DiscoveryHint className="mt-2" role="status">
              Add optionable STK symbols to Watchlist for quick picks, or type a symbol above and Apply.
            </DiscoveryHint>
          )}
        </div>
      </DiscoverySection>
    </div>
  )
}
