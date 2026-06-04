import { Link } from 'react-router-dom'
import type { Execution } from '@/types/positions'
import { executionInstanceLabel } from '@/utils/ledger/ledgerOptHelpers'
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

const instanceLinkClass = cn(
  denseOptionCategoryLabelClass('instance'),
  'hover:underline whitespace-normal',
)

export function LedgerStgInsCell({ ex }: { ex: Execution }) {
  const strategyName = ex.strategy_opportunity_name?.trim()
  const allocs = ex.instance_allocations
  const hasSplits = Array.isArray(allocs) && allocs.length > 0
  const instanceId = ex.strategy_instance_id

  if (!strategyName && instanceId == null && !hasSplits) {
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
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0" aria-label="Instance allocations">
          {allocs!.map(a => {
            const sid = a.strategy_instance_id
            const label =
              a.strategy_instance_label?.trim() || executionInstanceLabel(ex, sid) || undefined
            const qty = a.allocated_quantity
            return (
              <li key={sid} className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                {label ? (
                  <DenseOptionCategoryLabel variant="instance" className="whitespace-normal">
                    {label}
                  </DenseOptionCategoryLabel>
                ) : null}
                <Link
                  to={`/strategy/instances/${sid}`}
                  className={instanceLinkClass}
                  title={label ? `Open instance #${sid} (${label})` : `Open instance #${sid}`}
                >
                  #{sid}
                </Link>
                <span className="text-[0.6875rem] tabular-nums text-muted-foreground">
                  {formatAllocQty(qty)}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  if (instanceId != null) {
    const instLabel = executionInstanceLabel(ex, instanceId)?.trim()
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
          <DenseOptionCategoryLabel variant="instance" className="whitespace-normal">
            {instLabel}
          </DenseOptionCategoryLabel>
        ) : null}
        <Link
          to={`/strategy/instances/${instanceId}`}
          className={instanceLinkClass}
          title={
            instLabel
              ? `Open instance #${instanceId} (${instLabel})`
              : `Open instance #${instanceId}`
          }
        >
          #{instanceId}
        </Link>
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
