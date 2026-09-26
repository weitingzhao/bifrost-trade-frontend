/**
 * The one slot beside this page, with two faces: a modelled symbol's CAR and
 * stress, and the symbol in focus — what is held, what it is worth, and where
 * to take it.
 *
 * The CAR block used to open as a fourth level inside the per-underlying table.
 * Here the row opens it on the right instead, so the table stays a table and
 * the detail keeps the width its formulas need.
 */
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { DenseTag } from '@/components/data-display'
import { positionsUi } from '@/components/positions/positionsUi'
import { fmtUsd, fmtSignedPct } from '@/utils/positions'
import { computeIndependentHoldingMetrics } from '@/utils/independentHoldings'
import { UnderlyingDetailPanel } from './model/UnderlyingDetailPanel'
import type { UnderlyingEntry } from '@/types/modelAnalysis'
import type { LivePositionRow } from '@/types/positions'

export type BackingFace = 'model' | 'symbol'

const FACES: { id: BackingFace; label: string; title: string }[] = [
  { id: 'model', label: 'Model detail', title: 'The modelled symbol: CAR, its legs and its stress' },
  { id: 'symbol', label: 'Symbol', title: 'The symbol in focus: what is held and what it is worth' },
]

export interface SymbolFace {
  symbol: string
  /** Every row this account × symbol has in the base, in the order the tables list them. */
  rows: readonly LivePositionRow[]
  /** What the symbol does for the option book, in the layer's own words. */
  role: string | null
  /** Its row in the model table, when core modelled it. */
  onOpenModel?: () => void
  /** The stock inspector, which carries far more than these seven figures. */
  onOpenStock?: () => void
  positionsHref: string
}

function Kv({ k, v, ink }: { k: string; v: string; ink?: string }) {
  return (
    <>
      <dt className="text-xs leading-normal text-muted-foreground">{k}</dt>
      <dd className={cn(positionsUi.mono, 'm-0 text-right text-xs leading-normal', ink ?? 'text-secondary-foreground')}>{v}</dd>
    </>
  )
}

export function BackingFaceSlot({
  face,
  onFace,
  onClose,
  entry,
  accountLabel,
  symbol,
}: {
  face: BackingFace
  onFace: (f: BackingFace) => void
  onClose: () => void
  /** The modelled symbol the table opened, if any. */
  entry?: UnderlyingEntry | null
  accountLabel?: string | null
  symbol?: SymbolFace | null
}) {
  return (
    <aside
      className={cn(positionsUi.panel, 'sticky top-0 border-[var(--sk-line2)]')}
      aria-label="Backing detail"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <header className={positionsUi.panelHead}>
        {FACES.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFace(f.id)}
            aria-pressed={face === f.id}
            title={f.title}
            className={cn(
              'h-6 cursor-pointer whitespace-nowrap rounded-[5px] border bg-transparent px-2.25',
              'text-dense-meta leading-normal font-semibold',
              face === f.id ? 'border-primary text-primary' : 'border-border text-secondary-foreground hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
        <button type="button" className={cn(positionsUi.btn, 'ml-auto')} onClick={onClose} title="Close · esc" aria-label="Close">
          ✕
        </button>
      </header>

      {face === 'model' ? (
        entry ? (
          <div className="flex min-w-0 flex-col gap-2.5 px-3 pt-2.5 pb-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className={cn(positionsUi.mono, 'text-dense-label font-bold text-entity-symbol')}>
                {entry.symbol}
              </span>
              <DenseTag variant="warning" size="cell">
                ⚠ Hypothetical
              </DenseTag>
              {accountLabel ? (
                <span className={cn(positionsUi.mono, 'text-dense-meta leading-normal text-muted-foreground')}>{accountLabel}</span>
              ) : null}
            </div>
            <UnderlyingDetailPanel entry={entry} />
          </div>
        ) : (
          <p className="m-0 px-3 py-3 text-dense-meta leading-normal text-muted-foreground text-pretty">
            Open a row in Per underlying — its capital at risk, the rule behind it, its legs and its own stress open here.
          </p>
        )
      ) : null}

      {face === 'symbol' ? (
        symbol ? (
          <div className="flex min-w-0 flex-col gap-2.5 px-3 pt-2.5 pb-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className={cn(positionsUi.mono, 'text-dense-label font-bold text-entity-symbol')}>
                {symbol.symbol}
              </span>
              {symbol.role ? (
                <span className="text-dense-meta leading-normal text-muted-foreground">{symbol.role}</span>
              ) : null}
            </div>
            {symbol.rows.length === 0 ? (
              <p className="m-0 text-dense-meta leading-normal text-muted-foreground text-pretty">
                Nothing of this symbol is held in the accounts in scope — the obligation stands on cash or on margin, not on
                shares.
              </p>
            ) : (
              symbol.rows.map((row) => {
                const m = computeIndependentHoldingMetrics(row)
                const qty = Number(row.position)
                return (
                  <dl
                    key={`${row.account_id}-${row.contract_key ?? 'stk'}`}
                    className="m-0 grid grid-cols-[minmax(0,1fr)_auto] gap-x-2.5 gap-y-0.75 border-t border-border/55 pt-1.5 first:border-t-0 first:pt-0"
                  >
                    <Kv k="Account" v={(row.account_id ?? '—').trim() || '—'} />
                    <Kv k="Side" v={qty >= 0 ? 'Long' : 'Short'} />
                    <Kv k="Quantity" v={Number.isFinite(qty) ? Math.abs(qty).toLocaleString() : '—'} />
                    <Kv k="Avg cost" v={fmtUsd(row.avgCost)} />
                    <Kv k="Last" v={fmtUsd(m.lastPrice)} />
                    <Kv k="Market value" v={fmtUsd(m.marketValue)} ink="text-foreground" />
                    <Kv
                      k="Daily"
                      v={`${fmtUsd(m.dailyPnl)}${m.dailyPct != null ? ` · ${fmtSignedPct(m.dailyPct)}` : ''}`}
                      ink={m.dailyPnl == null ? undefined : m.dailyPnl >= 0 ? 'text-profit' : 'text-loss'}
                    />
                    <Kv
                      k="Total"
                      v={`${fmtUsd(m.totalPnl)}${m.totalPct != null ? ` · ${fmtSignedPct(m.totalPct)}` : ''}`}
                      ink={m.totalPnl == null ? undefined : m.totalPnl >= 0 ? 'text-profit' : 'text-loss'}
                    />
                  </dl>
                )
              })
            )}
            <div className="flex flex-wrap gap-1.5">
              <Link to={symbol.positionsHref} className={cn(positionsUi.btn, 'border-primary text-primary')}>
                Its lines → Positions
              </Link>
              {symbol.onOpenModel ? (
                <button type="button" className={positionsUi.btn} onClick={symbol.onOpenModel}>
                  Its model row
                </button>
              ) : null}
              {symbol.onOpenStock ? (
                <button type="button" className={positionsUi.btn} onClick={symbol.onOpenStock}>
                  Stock detail →
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="m-0 px-3 py-3 text-dense-meta leading-normal text-muted-foreground text-pretty">
            Click a symbol in Obligations or Base holdings — what is held behind it, and where to take it, open here.
          </p>
        )
      ) : null}
    </aside>
  )
}
