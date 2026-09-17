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
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { DonutChart } from './DonutChart'
import {
  baseRoleSegments,
  fmtMvAbbrev,
  type BackingPoolTarget,
} from '@/utils/positionsCharts'
import { backingPoolUsage } from '@/utils/backingJudgment'
import { fmtUsd } from '@/utils/positions'
import type { BaseLayer, BaseRole, BookVsBase } from '@/utils/bookVsBase'
import { positionsUi } from '../positionsUi'

/** Legend rows follow the ring: stocks, then cash, then income. */
const LAYER_ORDER: readonly BaseRole[] = ['stocks', 'cash', 'income']

const MAX_SYMBOL_TAGS = 4

/** The stocks layer may arrive with the shares the quote feed could not price. */
type StocksLayerLike = BaseLayer & { unpricedShares?: number }

function unpricedSharesOf(layer: BaseLayer): number {
  const n = (layer as StocksLayerLike).unpricedShares
  return n != null && Number.isFinite(n) && n > 0 ? n : 0
}


function usedTone(used: number | null): string {
  if (used != null && used >= 0.9) return 'text-warning'
  return 'text-muted-foreground'
}


/** The colour the ring gives this role — the "in use" slice, so the two read as one. */
const ROLE_COLOR: Record<BaseRole, string> = {
  stocks: 'var(--color-chart-stock)',
  cash: 'var(--color-chart-cash)',
  income: 'var(--color-chart-fi)',
}

/** One role of the pool, as the prototype draws it: the figure, how much is in use, and what it does. */
function LayerRole({
  layer,
  onOpen,
}: {
  layer: BaseLayer
  onOpen?: () => void
}) {
  const priced = layer.marketValue > 0
  const unpriced = layer.role === 'stocks' ? unpricedSharesOf(layer) : 0
  const usePct = layer.used != null ? Math.round(Math.min(1, Math.max(0, layer.used)) * 100) : null
  const symbols =
    layer.role === 'stocks'
      ? layer.shares > 0
        ? `${layer.shares.toLocaleString()} sh`
        : ''
      : layer.symbols.slice(0, MAX_SYMBOL_TAGS).join(' · ') +
        (layer.symbols.length > MAX_SYMBOL_TAGS ? ` +${layer.symbols.length - MAX_SYMBOL_TAGS}` : '')
  return (
    <button
      type="button"
      onClick={onOpen}
      title={onOpen ? `${layer.note} — click for its rows below` : layer.note}
      className={cn(
        'flex flex-col gap-0.75 rounded-[5px] border border-border bg-transparent px-2 py-1.5 text-left',
        onOpen ? 'cursor-pointer hover:border-[var(--sk-line2)] hover:bg-[var(--sk-raised2)]' : 'cursor-default',
      )}
      data-role={layer.role}
    >
      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="inline-flex items-center gap-1.5 text-xs leading-normal font-semibold text-foreground">
          <span className="h-2 w-2 flex-none rounded-full" style={{ background: ROLE_COLOR[layer.role] }} aria-hidden="true" />
          {layer.label}
        </span>
        <span className="font-mono text-xs leading-normal tabular-nums text-secondary-foreground">
          {priced ? fmtUsd(layer.marketValue, true) : '—'}
          {symbols ? <span className="text-muted-foreground"> · {symbols}</span> : null}
        </span>
        <span className={cn('ml-auto font-mono text-dense-meta leading-normal tabular-nums', usedTone(layer.used))}>
          {usePct != null ? `${usePct}% in use` : '—'}
        </span>
      </span>
      <span className="relative block h-1.25 overflow-hidden rounded-sm bg-[var(--sk-surface)]" aria-hidden="true">
        {usePct != null ? (
          <span className="absolute inset-y-0 left-0" style={{ width: `${usePct}%`, background: ROLE_COLOR[layer.role] }} />
        ) : null}
      </span>
      <span className="text-dense-caption leading-normal text-muted-foreground text-pretty">
        {layer.note}
        {unpriced > 0 ? (
          <span className="text-warning"> · {unpriced.toLocaleString()} sh unpriced — not counted</span>
        ) : null}
        {!priced && unpriced === 0 && (layer.shares > 0 || layer.symbols.length > 0) ? (
          <span className="text-warning"> · unpriced — not counted</span>
        ) : null}
      </span>
    </button>
  )
}

type PoolTarget = 'calls' | 'puts' | 'free' | 'income'

const SUMMARY_FILL: Record<BaseRole, string> = {
  stocks: 'bg-[var(--sk-line2)]',
  cash: 'bg-primary/45',
  income: 'bg-[var(--sk-surface)]',
}
const SUMMARY_TARGET: Record<BaseRole, PoolTarget> = { stocks: 'calls', cash: 'puts', income: 'income' }

function summaryNote(layer: BaseLayer): string {
  if (layer.role === 'stocks') return `${layer.shares.toLocaleString()} sh · backing calls`
  if (layer.role === 'cash') return `${layer.symbols.join(' · ') || 'cash'} · backing puts`
  return `${layer.symbols.join(' · ') || 'income ETFs'} — via buying power, not as cash`
}

/**
 * Positions' form of the pool (Design F3): one bar, one row per layer, and the
 * way to Backing & Model. The ring and its table stay there, the canonical page;
 * this is a bridge, not a second computation — the same usage numbers.
 */
function BackingPoolSummary({
  book,
  onSegmentClick,
  backingLink,
}: {
  book: BookVsBase
  onSegmentClick?: (target: PoolTarget) => void
  backingLink?: { to: string; label: string }
}) {
  const { pool: total, used: inUse } = backingPoolUsage(book)
  const layers = LAYER_ORDER.map((role) => book.base.find((l) => l.role === role)).filter(
    (l): l is BaseLayer => l != null
  )
  const unpriced = layers.find((l) => l.role === 'stocks')
  const unpricedShares = unpriced ? unpricedSharesOf(unpriced) : 0
  const pricedTotal = layers.reduce((a, l) => a + Math.max(0, l.marketValue), 0)
  return (
    <section id="positions-capital" className={positionsUi.panel} aria-label="Backing pool">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>Backing pool</span>
        {total > 0 ? (
          <span className={cn(positionsUi.mono, 'text-dense-body font-bold text-foreground leading-normal')}>
            {fmtMvAbbrev(total)} · {Math.round((inUse / total) * 100)}%{unpricedShares > 0 ? '*' : ''} in use
          </span>
        ) : null}
        {backingLink ? (
          <Link to={backingLink.to} className={cn(positionsUi.link, 'ml-auto')}>
            {backingLink.label}
          </Link>
        ) : null}
      </header>
      {total <= 0 ? (
        <p className="m-0 px-3 py-2 text-dense-body text-muted-foreground leading-normal">No base holdings to show.</p>
      ) : (
        <div className="flex flex-col gap-1.5 px-3 pt-2 pb-2.5 leading-normal">
          <span className="flex h-2 overflow-hidden rounded-sm bg-[var(--sk-surface)]" aria-hidden="true">
            {layers.map((l) => (
              <span
                key={l.role}
                className={SUMMARY_FILL[l.role]}
                style={{ width: `${pricedTotal > 0 ? (Math.max(0, l.marketValue) / pricedTotal) * 100 : 0}%` }}
              />
            ))}
          </span>
          {layers.map((l) => {
            const unpricedHere = l.role === 'stocks' ? unpricedSharesOf(l) : 0
            return (
              <button
                key={l.role}
                type="button"
                title={`${l.note}${onSegmentClick ? ' — click to open it on Backing & Model' : ''}`}
                onClick={onSegmentClick ? () => onSegmentClick(SUMMARY_TARGET[l.role]) : undefined}
                className={cn(
                  'flex flex-wrap items-baseline gap-2 rounded-sm border-0 bg-transparent p-0 text-left',
                  onSegmentClick ? 'cursor-pointer hover:bg-[var(--sk-raised2)]' : 'cursor-default',
                )}
              >
                <span className={cn('h-2 w-2 flex-none self-center rounded-[2px]', SUMMARY_FILL[l.role])} />
                <span className="min-w-26 text-xs text-secondary-foreground leading-normal">{l.label}</span>
                <span className={cn(positionsUi.mono, 'text-xs font-semibold text-foreground leading-normal')}>
                  {l.marketValue > 0 ? fmtUsd(l.marketValue, true) : '—'}
                </span>
                <span className="text-dense-meta text-muted-foreground leading-normal">{summaryNote(l)}</span>
                {unpricedHere > 0 ? (
                  <span className="text-dense-meta text-warning leading-normal">{unpricedHere.toLocaleString()} sh unpriced — not counted</span>
                ) : null}
                <span className={cn(positionsUi.mono, 'ml-auto text-dense-meta leading-normal', usedTone(l.used))}>
                  {l.used != null ? `${Math.round(l.used * 100)}% in use` : '—'}
                </span>
              </button>
            )
          })}
          <span className="text-dense-meta text-muted-foreground text-pretty leading-normal">
            The capital axis is canonical on Backing &amp; Model — this is a bridge, not a second computation.
          </span>
        </div>
      )}
    </section>
  )
}

export function BackingPoolCard({
  book,
  onSegmentClick,
  variant = 'ring',
  backingLink,
}: {
  book: BookVsBase
  onSegmentClick?: (target: PoolTarget) => void
  /** 'summary' is Positions' bridge (F3); 'ring' is the canonical picture on Backing & Model. */
  variant?: 'ring' | 'summary'
  /** Summary only: the way to the canonical page. */
  backingLink?: { to: string; label: string }
}) {
  if (variant === 'summary') {
    return <BackingPoolSummary book={book} onSegmentClick={onSegmentClick} backingLink={backingLink} />
  }
  const segments = baseRoleSegments(book)
  const { pool: total, used: inUse } = backingPoolUsage(book)

  if (total <= 0) {
    return <p className="m-0 px-3 py-3 text-dense-body text-muted-foreground">No base holdings to show.</p>
  }
  const targetByLabel = new Map<string, BackingPoolTarget>(segments.map((s) => [s.label, s.target]))

  const layers = LAYER_ORDER.map((role) => book.base.find((l) => l.role === role)).filter(
    (l): l is BaseLayer => l != null
  )
  const stocks = layers.find((l) => l.role === 'stocks')
  const unpriced = stocks ? unpricedSharesOf(stocks) : 0

  return (
    <div className="flex flex-wrap items-center gap-x-4.5 gap-y-3.5 px-3.5 py-3">
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
      <div className="flex min-w-60 flex-1 flex-col gap-2">
        {layers.map((l) => (
          <LayerRole
            key={l.role}
            layer={l}
            onOpen={onSegmentClick ? () => onSegmentClick(SUMMARY_TARGET[l.role]) : undefined}
          />
        ))}
      </div>
    </div>
  )
}
