/**
 * "Obligations & room", collapsed and remembered. The header answers the
 * section's question on its own — what a full assignment would take, how many
 * calls have shares behind them, how many are naked, how much room is left —
 * so collapsing it hides the detail, not the answer.
 */
import {
  CollapsibleChevron,
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupStats,
  CollapsibleGroupTitle,
} from '@/components/data-display'
import { fmtUsd } from '@/utils/positions'
import type { ObligationsRow, ObligationsSort } from '@/utils/obligationsRoom'
import type { ExposureSummary } from '@/utils/assignmentExposure'
import { ObligationsRoomTable } from './ObligationsRoomTable'

interface Props {
  open: boolean
  onToggle: () => void
  rows: readonly ObligationsRow[]
  exposure: ExposureSummary
  /** Assignment cash as a fraction of buying power; null when BP is unknown. */
  coverRatio: number | null
  moreCalls: number
  cashLikeTotal: number
  buyingPower: number | null
  sort: ObligationsSort
  onSortChange: (s: ObligationsSort) => void
  onSymbolClick: (symbol: string, accountId: string) => void
  onNakedClick: (symbol: string) => void
}

export function ObligationsRoomSection({
  open,
  onToggle,
  rows,
  exposure,
  coverRatio,
  moreCalls,
  cashLikeTotal,
  buyingPower,
  sort,
  onSortChange,
  onSymbolClick,
  onNakedClick,
}: Props) {
  const total = rows.reduce((n, r) => n + r.cashIfAssigned, 0)
  return (
    <CollapsibleGroup>
      <CollapsibleGroupHeader expanded={open} onToggle={onToggle}>
        <CollapsibleChevron expanded={open} />
        <CollapsibleGroupTitle>Obligations &amp; room</CollapsibleGroupTitle>
        <CollapsibleGroupStats>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            if assigned {fmtUsd(total)}
            {coverRatio != null ? ` (${Math.round(coverRatio * 100)}% of BP)` : ''} ·{' '}
            {exposure.coveredCallContracts} calls covered
            {exposure.nakedCallContracts > 0 ? (
              <span className="text-loss"> · {exposure.nakedCallContracts} naked</span>
            ) : null}{' '}
            · room for {moreCalls} more
          </span>
        </CollapsibleGroupStats>
      </CollapsibleGroupHeader>
      {open ? (
        <CollapsibleGroupBody>
          <ObligationsRoomTable
            rows={rows}
            cashLikeTotal={cashLikeTotal}
            buyingPower={buyingPower}
            sort={sort}
            onSortChange={onSortChange}
            onSymbolClick={onSymbolClick}
            onNakedClick={onNakedClick}
          />
        </CollapsibleGroupBody>
      ) : null}
    </CollapsibleGroup>
  )
}
