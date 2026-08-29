/**
 * Secondary action after Save-as-Hypothesis — add STK:{sym} to Trade watchlist
 * and patch hypothesis origin_ref.watchlist_contract_key (Wave 13).
 */
import { useState } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconActionButton } from '@/components/data-display'
import { useWatchlistMutations } from '@/hooks/useStockWatchlist'
import { usePatchHypothesis } from '@/hooks/useHypotheses'
import { stockWatchlistContractKey } from '@/components/research/watchlistContractKey'
import { cn } from '@/lib/utils'
import type { Hypothesis } from '@/api/researchHypothesis'

export function PromoteToWatchlistButton({
  hypothesis,
  symbol,
  size = 'dense',
  className,
}: {
  hypothesis: Hypothesis
  symbol: string
  size?: 'dense' | 'button'
  className?: string
}) {
  const { addItem } = useWatchlistMutations()
  const patch = usePatchHypothesis()
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const sym = symbol.trim().toUpperCase()
  const key = stockWatchlistContractKey(sym)
  const busy = addItem.isPending || patch.isPending

  async function promote() {
    if (!sym || !key) return
    setErr(null)
    try {
      await addItem.mutateAsync({
        contract_key: key,
        symbol: sym,
        sec_type: 'STK',
        source: 'research_hypothesis',
        optionable: true,
      })
      const prev =
        hypothesis.origin_ref && typeof hypothesis.origin_ref === 'object'
          ? { ...(hypothesis.origin_ref as Record<string, unknown>) }
          : {}
      await patch.mutateAsync({
        id: hypothesis.id,
        patch: {
          origin_ref: {
            ...prev,
            watchlist_contract_key: key,
          },
        },
      })
      setDone(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  if (done) {
    return (
      <span className={cn('text-dense-caption text-success', className)}>
        On watchlist · {key}
      </span>
    )
  }

  if (size === 'button') {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || !sym}
          onClick={() => void promote()}
          className="gap-1.5"
        >
          <Star className="h-3.5 w-3.5" />
          {busy ? 'Promoting…' : 'Promote to Watchlist'}
        </Button>
        {err ? <span className="text-dense-caption text-destructive">{err}</span> : null}
      </div>
    )
  }

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <IconActionButton
        title="Add symbol to Trade watchlist and link hypothesis"
        ariaLabel="Promote to Watchlist"
        disabled={busy || !sym}
        onClick={() => void promote()}
      >
        <Star className="h-3.5 w-3.5" />
      </IconActionButton>
      {err ? <span className="text-dense-caption text-destructive">{err}</span> : null}
    </div>
  )
}
