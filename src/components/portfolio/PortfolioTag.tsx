import { DenseTag } from '@/components/data-display'
import { usePortfolioSymbols } from '@/hooks/usePortfolioSymbols'
import { cn } from '@/lib/utils'

type Props = {
  symbol: string
  className?: string
  /** inline = gap-1 flex; row-suffix = ml-1.5 inline-flex */
  variant?: 'inline' | 'row-suffix'
}

/** Holding / watchlist category tags for a symbol (Analyze Wave K). */
export function PortfolioTag({ symbol, className, variant = 'inline' }: Props) {
  const { isHolding, isWatchlist } = usePortfolioSymbols()
  const holding = isHolding(symbol)
  const watch = isWatchlist(symbol)
  if (!holding && !watch) return null
  return (
    <span
      className={cn(
        variant === 'row-suffix'
          ? 'ml-1.5 inline-flex items-center gap-1'
          : 'inline-flex items-center gap-1',
        className,
      )}
    >
      {holding ? <DenseTag variant="category">holding</DenseTag> : null}
      {watch ? <DenseTag variant="category">watchlist</DenseTag> : null}
    </span>
  )
}
