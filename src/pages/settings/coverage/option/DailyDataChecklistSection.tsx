import { MARKET_DATA_PLUGIN_MIGRATED } from '@/api/marketDataRetired'

/** Coverage daily checklist — Trade Massive API retired; show migration notice only. */
export function DailyDataChecklistSection({
  configured,
}: {
  configured: boolean
  onChecklistRefreshed?: () => void
}) {
  return (
    <div className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
      {configured
        ? MARKET_DATA_PLUGIN_MIGRATED
        : 'Market Data Plugin not configured — daily checklist unavailable.'}
    </div>
  )
}
