/**
 * The option backing pool: one ring whose legend is the layer table.
 *
 * BaseRoleCard drew the ring and BaseLayersSection drew the table, from the
 * same three layers, in two places on the page. A reader had to carry the
 * colours from one to the other. Here the ring's slices are grouped by layer
 * and the legend is one row per layer, so the picture and the numbers behind
 * it sit in the same 132px.
 *
 * Five slices, two tones per layer: stock backing calls and stock still free;
 * cash backing puts and cash still free; income ETFs as a single slice. The
 * income slice is labelled the way the Owner decided it is counted — via buying
 * power, not as cash — because the broker applies its own haircut to those
 * funds and this page does not second-guess it by treating them as put cover.
 *
 * What is not priced is not drawn. A stock layer can carry a count of unpriced
 * shares; when it does, the row says so and the centre figure wears an
 * asterisk, so a ring that looks calm cannot be read as complete.
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableRow,
  DenseTag,
  denseTableNumCell,
} from '@/components/data-display'
import { DonutChart } from './DonutChart'
import {
  BACKING_POOL_SEGMENTS,
  baseRoleSegments,
  fmtMvAbbrev,
  type BackingPoolTarget,
} from '@/utils/positionsCharts'
import { fmtUsd } from '@/utils/positions'
import type { BaseLayer, BaseRole, BookVsBase } from '@/utils/bookVsBase'
import styles from '../PositionsChartsSection.module.css'

/** Legend rows follow the ring: stocks, then cash, then income. */
const LAYER_ORDER: readonly BaseRole[] = ['stocks', 'cash', 'income']

const MAX_SYMBOL_TAGS = 4

/** The stocks layer may arrive with the shares the quote feed could not price. */
type StocksLayerLike = BaseLayer & { unpricedShares?: number }

function unpricedSharesOf(layer: BaseLayer): number {
  const n = (layer as StocksLayerLike).unpricedShares
  return n != null && Number.isFinite(n) && n > 0 ? n : 0
}

/** The part of a slice label after the layer name — "backing calls", "free". */
function sliceRole(label: string): string {
  const i = label.indexOf(' · ')
  return i >= 0 ? label.slice(i + 3) : label
}

function usedTone(used: number | null): string {
  if (used != null && used >= 0.9) return 'text-warning'
  return 'text-muted-foreground'
}

function Caption({ tone, children }: { tone?: string; children: ReactNode }) {
  return (
    <span
      className={cn('block whitespace-normal text-dense-caption', tone ?? 'text-muted-foreground')}
    >
      {children}
    </span>
  )
}

function LayerRow({
  layer,
  hasValueByLabel,
}: {
  layer: BaseLayer
  hasValueByLabel: ReadonlySet<string>
}) {
  const slices = BACKING_POOL_SEGMENTS.filter((s) => s.layer === layer.role)
  const priced = layer.marketValue > 0
  const unpriced = layer.role === 'stocks' ? unpricedSharesOf(layer) : 0
  // Held but worth "0" is a missing quote, not an empty layer — say so rather
  // than let the dash read as nothing there.
  const heldButUnpriced =
    !priced && unpriced === 0 && (layer.shares > 0 || layer.symbols.length > 0)

  return (
    <DenseTableRow className="[&_td]:text-dense-body [&_td]:align-top">
      <DenseTableCell className="whitespace-normal">
        {/* The layer's role note is the group header in Base holdings; here it is a hover so the legend stays three short rows. */}
        <span className="font-medium text-foreground" title={layer.note}>
          {layer.label}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-dense-caption text-muted-foreground">
          {slices.map((s) => (
            <span
              key={s.label}
              className={cn(
                'inline-flex items-center gap-1',
                !hasValueByLabel.has(s.label) && 'opacity-50'
              )}
              title={s.label}
            >
              <span
                className="inline-block size-2 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              {sliceRole(s.label)}
            </span>
          ))}
        </span>
        {unpriced > 0 ? (
          <Caption tone="text-warning">
            {unpriced.toLocaleString()} sh unpriced — not counted
          </Caption>
        ) : null}
        {heldButUnpriced ? <Caption tone="text-warning">unpriced — not counted</Caption> : null}
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>
        {priced ? fmtUsd(layer.marketValue, true) : '—'}
      </DenseTableCell>
      <DenseTableCell className="whitespace-normal">
        {layer.role === 'stocks' ? (
          layer.shares > 0 ? (
            <span className="font-mono tabular-nums">{layer.shares.toLocaleString()} sh</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )
        ) : layer.symbols.length > 0 ? (
          <span className="inline-flex flex-wrap gap-1">
            {layer.symbols.slice(0, MAX_SYMBOL_TAGS).map((s) => (
              <DenseTag key={s} variant="category" size="cell" className="font-mono">
                {s}
              </DenseTag>
            ))}
            {layer.symbols.length > MAX_SYMBOL_TAGS ? (
              <span className="text-dense-caption text-muted-foreground">
                +{layer.symbols.length - MAX_SYMBOL_TAGS}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, 'whitespace-nowrap', usedTone(layer.used))}>
        {layer.used != null ? `${Math.round(layer.used * 100)}% in use` : '—'}
      </DenseTableCell>
    </DenseTableRow>
  )
}

export function BackingPoolCard({
  book,
  onSegmentClick,
}: {
  book: BookVsBase
  onSegmentClick?: (target: 'calls' | 'puts' | 'free' | 'income') => void
}) {
  const segments = baseRoleSegments(book)
  const total = segments.reduce((n, s) => n + s.value, 0)

  if (total <= 0) {
    return <p className="text-dense-body text-muted-foreground">No base holdings to show.</p>
  }

  const inUse = segments
    .filter((s) => s.target === 'calls' || s.target === 'puts')
    .reduce((n, s) => n + s.value, 0)
  const hasValueByLabel = new Set<string>(segments.map((s) => s.label))
  const targetByLabel = new Map<string, BackingPoolTarget>(segments.map((s) => [s.label, s.target]))

  const layers = LAYER_ORDER.map((role) => book.base.find((l) => l.role === role)).filter(
    (l): l is BaseLayer => l != null
  )
  const stocks = layers.find((l) => l.role === 'stocks')
  const unpriced = stocks ? unpricedSharesOf(stocks) : 0

  return (
    <div className={cn(styles.donutRow, styles.donutRowStart)}>
      <DonutChart
        segments={segments}
        centerMain={`${Math.round((inUse / total) * 100)}%${unpriced > 0 ? '*' : ''}`}
        centerSub={`of ${fmtMvAbbrev(total)} in use`}
        size={132}
        onSegmentClick={
          onSegmentClick
            ? (label) => {
                const target = label == null ? undefined : targetByLabel.get(label)
                if (target) onSegmentClick(target)
              }
            : undefined
        }
      />
      <DenseDataTable scrollX={false} tableClassName="table-fixed min-w-0">
        <colgroup>
          <col />
          <col style={{ width: '5.5rem' }} />
          <col style={{ width: '7rem' }} />
          <col style={{ width: '5.5rem' }} />
        </colgroup>
        <DenseTableBody>
          {layers.map((l) => (
            <LayerRow key={l.role} layer={l} hasValueByLabel={hasValueByLabel} />
          ))}
        </DenseTableBody>
      </DenseDataTable>
    </div>
  )
}
