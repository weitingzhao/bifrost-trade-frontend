import { MARKET_DATA_PLUGIN_MIGRATED } from '@/api/marketDataRetired'

export function OptionCoverageDbSummaryInline({ refreshKey }: { refreshKey: number }) {
  void refreshKey
  return (
    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
      <strong className="text-foreground/80">DB snapshot:</strong> {MARKET_DATA_PLUGIN_MIGRATED}
    </p>
  )
}
