import { useCallback, useEffect, useRef, useState } from 'react'
import { MARKET_DATA_PLUGIN_MIGRATED } from '@/api/marketDataRetired'
import type {
  OptionBarsContractsGapResult,
  OptionContractsReferenceGapResult,
  OptionSnapshotsContractsGapResult,
  WatchlistDbCoverageSymbolRow,
} from '@/types/watchlistDbCoverage'
import { Button } from '@/components/ui/button'
import { DataOverviewOptionJobsBar } from '@/pages/settings/coverage/overview/DataOverviewOptionJobsBar'
import { OptionWatchlistMatrix } from '@/pages/settings/coverage/overview/OptionWatchlistMatrix'
import type { OptionsFocusDataset } from '@/utils/dataOverview/optionFocusDataset'
import { DataOverviewGapExplainSheet } from '@/pages/settings/coverage/overview/sheets/DataOverviewGapExplainSheet'

export interface DataOverviewWatchlistOptionsProps {
  wlRows: WatchlistDbCoverageSymbolRow[]
  onWatchlistRefreshRequested?: () => void | Promise<void>
  refGapBySymbol?: Record<string, OptionContractsReferenceGapResult>
  onCompareMassiveReference?: (symbols: string[]) => void | Promise<void>
  refGapLoading?: boolean
  refGapError?: string | null
  snapshotGapBySymbol?: Record<string, OptionSnapshotsContractsGapResult>
  onCompareSnapshotGap?: (symbols: string[]) => void | Promise<void>
  snapshotGapLoading?: boolean
  snapshotGapError?: string | null
  comparePool?: string[]
  onToggleComparePool?: (symbol: string) => void
  onSelectAllComparePool?: () => void
  onClearComparePool?: () => void
  jobsSheetOpen: boolean
  onJobsSheetOpenChange: (open: boolean) => void
  focusDataset: OptionsFocusDataset
}

export function DataOverviewWatchlistOptions({
  wlRows,
  onWatchlistRefreshRequested,
  refGapBySymbol = {},
  onCompareMassiveReference,
  refGapLoading = false,
  refGapError = null,
  snapshotGapBySymbol = {},
  onCompareSnapshotGap,
  snapshotGapLoading = false,
  snapshotGapError = null,
  comparePool = [],
  onToggleComparePool,
  onSelectAllComparePool,
  onClearComparePool,
  jobsSheetOpen,
  onJobsSheetOpenChange,
  focusDataset,
}: DataOverviewWatchlistOptionsProps) {
  const [barsGapBySymbol] = useState<Record<string, OptionBarsContractsGapResult>>({})
  const [barsGapLoading] = useState(false)
  const [barsGapError, setBarsGapError] = useState<string | null>(null)
  const prevFocusRef = useRef(focusDataset)
  const [gapExplainOpen, setGapExplainOpen] = useState(false)

  const handleCompareBarsGap = useCallback(async (_symbols: string[]) => {
    void _symbols
    setBarsGapError(MARKET_DATA_PLUGIN_MIGRATED)
  }, [])

  useEffect(() => {
    const prev = prevFocusRef.current
    const poolable = new Set(['option_contracts', 'option_snapshots', 'option_day', 'option_min'])
    if (
      (poolable.has(prev) && !poolable.has(focusDataset)) ||
      (poolable.has(prev) && poolable.has(focusDataset) && prev !== focusDataset)
    ) {
      onClearComparePool?.()
    }
    prevFocusRef.current = focusDataset
  }, [focusDataset, onClearComparePool])

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        One sheet per symbol: grouped columns for each dataset. The Symbol column stays fixed when
        the table is wider than the viewport. Option bar gap-fill checks: {MARKET_DATA_PLUGIN_MIGRATED}
      </p>

      {(focusDataset === 'option_contracts' ||
        focusDataset === 'option_snapshots' ||
        focusDataset === 'option_day' ||
        focusDataset === 'option_min') ? (
        <Button type="button" variant="link" size="sm" className="h-auto px-0 text-xs" onClick={() => setGapExplainOpen(true)}>
          Pool &amp; snapshot Check — gap scope help
        </Button>
      ) : null}

      <DataOverviewOptionJobsBar
        focusDataset={focusDataset}
        comparePool={comparePool}
        onSelectAllComparePool={onSelectAllComparePool}
        onClearComparePool={onClearComparePool}
        refGapBySymbol={refGapBySymbol}
        onCompareMassiveReference={onCompareMassiveReference}
        refGapLoading={refGapLoading}
        refGapError={refGapError}
        snapshotGapBySymbol={snapshotGapBySymbol}
        onCompareSnapshotGap={onCompareSnapshotGap}
        snapshotGapLoading={snapshotGapLoading}
        snapshotGapError={snapshotGapError}
        barsGapBySymbol={barsGapBySymbol}
        onCompareBarsGap={handleCompareBarsGap}
        barsGapLoading={barsGapLoading}
        barsGapError={barsGapError}
        jobsSheetOpen={jobsSheetOpen}
        onJobsSheetOpenChange={onJobsSheetOpenChange}
        onWatchlistRefreshRequested={onWatchlistRefreshRequested}
      />

      <DataOverviewGapExplainSheet
        open={gapExplainOpen}
        onClose={() => setGapExplainOpen(false)}
        variant={
          focusDataset === 'option_snapshots'
            ? 'snapshots'
            : focusDataset === 'option_day'
              ? 'option_day_bars'
              : focusDataset === 'option_min'
                ? 'option_min_bars'
                : 'contracts'
        }
      />

      <OptionWatchlistMatrix
        wlRows={wlRows}
        focusDataset={focusDataset}
        comparePool={comparePool}
        onToggleComparePool={onToggleComparePool}
        refGapBySymbol={refGapBySymbol}
        snapshotGapBySymbol={snapshotGapBySymbol}
        barsGapBySymbol={barsGapBySymbol}
      />
    </div>
  )
}
