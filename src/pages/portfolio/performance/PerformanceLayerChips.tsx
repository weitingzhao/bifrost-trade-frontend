import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import { GROWTH_LAYERS, type GrowthLayer, type OptionsPnLMode } from '@/utils/ledger/equityGrowthChart'
import { fmtSignedUsd0 } from '@/utils/performanceReading'
import { perfUi } from './performanceUi'

const LAYER_SUB: Record<GrowthLayer, string> = {
  options: 'mode',
  stocks: 'realized',
  fixed_income: 'stream · cash, not P&L',
  cash_like: 'realized',
}

const MODE_WORD: Record<OptionsPnLMode, string> = { book: 'book', economic: 'economic', total: 'total' }

export interface LayerChipValues {
  /** Each layer's last point on the curve, in dollars, in the current Options mode. */
  last: Record<GrowthLayer, number>
  /** Unpaired option premium as of today; null before the bulk read lands. */
  optionsOpen: number | null
}

/**
 * Reading: one chip per asset layer with what it made in the range, and the
 * switch that puts the layer on the equity curve. The last chip is the cash that
 * crossed the account boundary, shown only to say it is left out.
 */
export function PerformanceLayerChips({
  values,
  layersVisible,
  onLayerToggle,
  optionsPnLMode,
  netCashFlow,
}: {
  values: LayerChipValues | null
  layersVisible: Record<GrowthLayer, boolean>
  onLayerToggle: (layer: GrowthLayer) => void
  optionsPnLMode: OptionsPnLMode
  netCashFlow: number | null
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] items-stretch gap-1.5">
      {GROWTH_LAYERS.map(layer => {
        const on = layersVisible[layer.key]
        const r = values?.last[layer.key] ?? null
        const isOptions = layer.key === 'options'
        const u = isOptions ? values?.optionsOpen ?? null : null
        return (
          <button
            key={layer.key}
            type="button"
            aria-pressed={on}
            onClick={() => onLayerToggle(layer.key)}
            title={`${on ? 'On the curve — click to drop' : 'Off the curve — click to add'} ${layer.label}`}
            className={cn(
              'flex min-w-0 cursor-pointer flex-col items-stretch gap-0.75 rounded-md border px-2.75 py-1.75 text-left',
              'hover:border-[var(--color-border-strong)] hover:bg-secondary/40',
              on ? 'border-border bg-background/60' : 'border-border bg-transparent',
            )}
          >
            <span className="flex items-center gap-1.25">
              <span
                className="h-2 w-2 flex-none rounded-[2px] border"
                style={{ background: on ? layer.color : 'transparent', borderColor: on ? layer.color : 'var(--muted-foreground)' }}
              />
              <span className={cn(perfUi.cap, 'text-dense-micro')}>{layer.label}</span>
              <span className={cn(perfUi.mono, 'ml-auto text-dense-micro text-muted-foreground')}>
                {isOptions ? `${MODE_WORD[optionsPnLMode]} ${LAYER_SUB.options}` : LAYER_SUB[layer.key]}
              </span>
            </span>
            <span className="flex flex-wrap items-baseline gap-1.25">
              <span className={cn(perfUi.mono, 'text-base font-bold', pnlColorClass(r))}>{fmtSignedUsd0(r)}</span>
              <span className={cn(perfUi.cap, 'ml-auto text-dense-micro tracking-[0.04em]')}>{isOptions ? 'Open' : 'U'}</span>
              <span
                className={cn(
                  perfUi.mono,
                  'text-dense-meta',
                  isOptions ? 'text-secondary-foreground' : u == null ? 'text-muted-foreground' : 'text-unrealized',
                )}
                title={isOptions ? 'Unpaired option premium as of today' : 'No unrealized reading for this layer on this page'}
              >
                {fmtSignedUsd0(u)}
              </span>
            </span>
          </button>
        )
      })}

      <div className="flex min-w-0 flex-col gap-0.75 rounded-md border border-dashed border-border px-2.75 py-1.75">
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className={cn(perfUi.cap, 'text-dense-micro')}>Net cash flow</span>
          <Link to="/portfolio/transfer" className={cn(perfUi.link, 'ml-auto text-dense-micro')}>
            Transfer &amp; Pay →
          </Link>
        </span>
        <span className="flex flex-wrap items-baseline gap-x-1.25">
          <span className={cn(perfUi.mono, 'text-base font-bold text-foreground/80')}>{fmtSignedUsd0(netCashFlow)}</span>
          <span className="ml-auto text-dense-micro text-muted-foreground">excluded</span>
        </span>
      </div>
    </div>
  )
}
