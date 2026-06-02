import {
  CollapsibleChevron,
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupStats,
  CollapsibleGroupTitle,
  DenseTag,
} from '@/components/data-display'
import type { ScreenerSymbolGroup } from '@/types/research'
import { OptionScreenerContractsTable } from './OptionScreenerContractsTable'
import { bestScoreRating, fmtPct } from './optionScreenerFormat'
import { ratingTagVariant } from './optionScreenerTags'

type Props = {
  group: ScreenerSymbolGroup
  expanded: boolean
  onToggle: () => void
  onSave: (symbol: string) => void
}

export function OptionScreenerSymbolGroup({ group, expanded, onToggle, onSave }: Props) {
  const bestRating = bestScoreRating(group.best_score)

  return (
    <CollapsibleGroup variant="card" className="mb-0">
      <CollapsibleGroupHeader expanded={expanded} onToggle={onToggle}>
        <CollapsibleChevron expanded={expanded} />
        <CollapsibleGroupTitle className="text-sm">{group.symbol}</CollapsibleGroupTitle>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          ${group.spot.toFixed(2)}
        </span>
        <CollapsibleGroupStats>
          <span className="inline-flex items-center gap-1">
            Best:
            <DenseTag variant={ratingTagVariant(bestRating)} size="cell">
              {group.best_score}
            </DenseTag>
          </span>
          <span>IV: {fmtPct(group.avg_iv)}</span>
          <span>{group.contracts.length} contracts</span>
        </CollapsibleGroupStats>
      </CollapsibleGroupHeader>
      {expanded && (
        <CollapsibleGroupBody className="px-0 pb-0">
          <OptionScreenerContractsTable
            contracts={group.contracts}
            symbol={group.symbol}
            onSave={onSave}
          />
        </CollapsibleGroupBody>
      )}
    </CollapsibleGroup>
  )
}
