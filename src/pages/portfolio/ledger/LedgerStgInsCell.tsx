import { Link } from 'react-router-dom'
import type { Execution } from '@/types/positions'
import { executionInstanceLabel } from '@/utils/ledger/ledgerOptHelpers'
import { cn } from '@/lib/utils'

const stgInsLinkClass =
  'inline-flex items-center rounded-full border border-success/45 bg-success/10 px-[0.45rem] py-0.5 text-success font-semibold leading-tight no-underline hover:bg-success/20 transition-colors'

function formatAllocQty(q: number): string {
  const n = Number(q)
  if (!Number.isFinite(n)) return '—'
  return n % 1 === 0 ? String(n) : String(Number(n.toFixed(6)))
}

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
          <div className="w-full">
            <span className="font-medium text-foreground whitespace-normal break-words">
              {strategyName}
            </span>
          </div>
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
                  <span className="text-[0.6875rem] text-muted-foreground whitespace-normal break-words">
                    {label}
                  </span>
                ) : null}
                <Link
                  to={`/strategy/instances/${sid}`}
                  className={cn(stgInsLinkClass, 'text-[0.6875rem] px-[0.38rem] py-[0.06rem]')}
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
            <span className="font-medium text-foreground whitespace-normal break-words">
              {strategyName}
            </span>
            <span className="text-muted-foreground/70">/</span>
          </>
        ) : null}
        {instLabel ? (
          <span className="text-[0.6875rem] text-muted-foreground whitespace-normal break-words">
            {instLabel}
          </span>
        ) : null}
        <Link
          to={`/strategy/instances/${instanceId}`}
          className={stgInsLinkClass}
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
      <span className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <span className="font-medium text-foreground whitespace-normal break-words">{strategyName}</span>
        <span className="text-muted-foreground/70">/</span>
        <span className="text-muted-foreground">—</span>
      </span>
    )
  }

  return <>—</>
}
