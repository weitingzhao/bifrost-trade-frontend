import { TradeRef } from '@/components/tradeRecord/TradeRef'
import type { Execution } from '@/types/positions'
import { executionTradeLabel } from '@/utils/ledger/ledgerOptHelpers'
import {
  DenseOptionCategoryLabel,
  denseOptionCategoryLabelClass,
} from '@/components/data-display'
import { cn } from '@/lib/utils'

function formatAllocQty(q: number): string {
  const n = Number(q)
  if (!Number.isFinite(n)) return '—'
  return n % 1 === 0 ? String(n) : String(Number(n.toFixed(6)))
}

const tradeLinkClass = cn(
  denseOptionCategoryLabelClass('trade'),
  'hover:underline whitespace-normal',
)

export function LedgerStgInsCell({ ex }: { ex: Execution }) {
  const strategyName = ex.strategy_opportunity_name?.trim()
  const allocs = ex.fill_splits
  const hasSplits = Array.isArray(allocs) && allocs.length > 0
  const tradeId = ex.trade_id

  if (!strategyName && tradeId == null && !hasSplits) {
    return <>—</>
  }

  if (hasSplits) {
    return (
      <div className="flex max-w-[280px] flex-col items-start gap-0.5 whitespace-normal">
        {strategyName ? (
          <DenseOptionCategoryLabel variant="opportunity" className="whitespace-normal">
            {strategyName}
          </DenseOptionCategoryLabel>
        ) : null}
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0" aria-label="Fill splits">
          {allocs!.map(a => {
            const sid = a.trade_id
            const label =
              a.trade_label?.trim() || executionTradeLabel(ex, sid) || undefined
            const qty = a.quantity
            return (
              <li key={sid} className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                {label ? (
                  <DenseOptionCategoryLabel variant="trade" className="whitespace-normal">
                    {label}
                  </DenseOptionCategoryLabel>
                ) : null}
                <TradeRef id={sid} className={tradeLinkClass} from="Ledger · fills" />
                <span className="text-dense-meta tabular-nums text-muted-foreground">
                  {formatAllocQty(qty)}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  if (tradeId != null) {
    const instLabel = executionTradeLabel(ex, tradeId)?.trim()
    return (
      <span className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5">
        {strategyName ? (
          <>
            <DenseOptionCategoryLabel variant="opportunity" className="whitespace-normal">
              {strategyName}
            </DenseOptionCategoryLabel>
            <span className="text-muted-foreground/70">/</span>
          </>
        ) : null}
        {instLabel ? (
          <DenseOptionCategoryLabel variant="trade" className="whitespace-normal">
            {instLabel}
          </DenseOptionCategoryLabel>
        ) : null}
        <TradeRef id={tradeId} className={tradeLinkClass} from="Ledger · fills" />
      </span>
    )
  }

  if (strategyName) {
    return (
      <DenseOptionCategoryLabel variant="opportunity" className="whitespace-normal">
        {strategyName}
      </DenseOptionCategoryLabel>
    )
  }

  return <>—</>
}
