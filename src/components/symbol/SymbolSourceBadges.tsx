import { DenseTag } from '@/components/data-display'

export function SymbolSourceBadges({
  inWatchlist,
  inPosition,
}: {
  inWatchlist?: boolean
  inPosition?: boolean
}) {
  if (!inWatchlist && !inPosition) return null
  return (
    <div className="ml-auto flex shrink-0 items-center gap-1">
      {inPosition ? (
        <DenseTag variant="category" size="cell">Position</DenseTag>
      ) : null}
      {inWatchlist ? (
        <DenseTag variant="neutral" size="cell">Watchlist</DenseTag>
      ) : null}
    </div>
  )
}
